import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin', 'manager')
    const { id } = await params

    const purchase = await prisma.purchase.findUnique({ where: { id } })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }
    if (purchase.status !== 'draft' && purchase.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only draft or confirmed purchases can be cancelled' },
        { status: 400 }
      )
    }

    const updated = await prisma.purchase.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    return NextResponse.json(updated)
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
