import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('admin', 'manager')
    const { id } = await params

    const transfer = await prisma.stockTransfer.findUnique({ where: { id } })
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    if (transfer.status !== 'requested') {
      return NextResponse.json({ error: 'Only requested transfers can be approved' }, { status: 400 })
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: user.id,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        initiatedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
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
