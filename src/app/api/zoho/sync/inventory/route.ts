import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { zohoFetch } from '@/lib/zoho/client'

export async function POST() {
  try {
    await requireRole('admin')

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    })

    const orgId = process.env.ZOHO_ORGANIZATION_ID
    const results = { synced: 0, errors: 0 }

    for (const product of products) {
      const payload = {
        name: product.name,
        sku: product.sku,
        rate: parseFloat(product.priceTHB.toString()),
        description: product.description ?? '',
        item_type: 'inventory',
        ...(product.zohoItemId ? {} : {}),
      }

      try {
        let res: Response
        if (product.zohoItemId) {
          res = await zohoFetch(
            `https://inventory.zoho.com/api/v1/items/${product.zohoItemId}?organization_id=${orgId}`,
            { method: 'PUT', body: JSON.stringify(payload) }
          )
        } else {
          res = await zohoFetch(
            `https://inventory.zoho.com/api/v1/items?organization_id=${orgId}`,
            { method: 'POST', body: JSON.stringify(payload) }
          )
        }

        const data = await res.json()
        const zohoItemId = data.item?.item_id ?? product.zohoItemId

        if (zohoItemId && zohoItemId !== product.zohoItemId) {
          await prisma.product.update({
            where: { id: product.id },
            data: { zohoItemId },
          })
        }

        await prisma.zohoSyncLog.create({
          data: {
            entityType: 'product',
            entityId: product.id,
            direction: 'push',
            status: res.ok ? 'success' : 'error',
            errorMsg: res.ok ? null : `HTTP ${res.status}`,
          },
        })

        if (res.ok) results.synced++
        else results.errors++
      } catch (err) {
        results.errors++
        await prisma.zohoSyncLog.create({
          data: {
            entityType: 'product',
            entityId: product.id,
            direction: 'push',
            status: 'error',
            errorMsg: err instanceof Error ? err.message : 'Unknown error',
          },
        })
      }
    }

    return NextResponse.json({ message: 'Inventory sync complete', ...results })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
