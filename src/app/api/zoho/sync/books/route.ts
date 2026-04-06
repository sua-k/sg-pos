import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { zohoFetch } from '@/lib/zoho/client'

export async function POST() {
  try {
    await requireRole('admin')

    const orgId = process.env.ZOHO_ORGANIZATION_ID

    // Fetch recent transactions not yet synced to Zoho Books
    const transactions = await prisma.transaction.findMany({
      where: { status: 'completed' },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const results = { synced: 0, errors: 0 }

    for (const tx of transactions) {
      const lineItems = tx.items.map((item) => ({
        item_id: item.product.zohoItemId ?? undefined,
        name: item.product.name,
        quantity: parseFloat(item.quantity.toString()),
        rate: parseFloat(item.unitPriceTHB.toString()),
        item_total: parseFloat(item.totalTHB.toString()),
      }))

      const invoicePayload = {
        customer_name: tx.customer.name ?? tx.customer.idNumber,
        invoice_number: tx.receiptNumber,
        date: tx.createdAt.toISOString().split('T')[0],
        line_items: lineItems,
        sub_total: parseFloat(tx.subtotalTHB.toString()),
        tax_total: parseFloat(tx.vatTHB.toString()),
        total: parseFloat(tx.totalTHB.toString()),
      }

      try {
        const res = await zohoFetch(
          `https://books.zoho.com/api/v3/invoices?organization_id=${orgId}`,
          { method: 'POST', body: JSON.stringify(invoicePayload) }
        )

        await prisma.zohoSyncLog.create({
          data: {
            entityType: 'transaction',
            entityId: tx.id,
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
            entityType: 'transaction',
            entityId: tx.id,
            direction: 'push',
            status: 'error',
            errorMsg: err instanceof Error ? err.message : 'Unknown error',
          },
        })
      }
    }

    return NextResponse.json({ message: 'Books sync complete', ...results })
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
