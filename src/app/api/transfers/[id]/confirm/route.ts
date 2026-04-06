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

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { product: true },
      })
      if (!transfer) {
        throw new Error('VALIDATION:Transfer not found')
      }
      if (transfer.status !== 'dispatched') {
        throw new Error('VALIDATION:Only dispatched transfers can be confirmed')
      }

      const qty = parseFloat(transfer.quantity.toString())

      // Add to destination inventory
      await tx.inventory.upsert({
        where: {
          productId_branchId: {
            productId: transfer.productId,
            branchId: transfer.toBranchId,
          },
        },
        create: {
          productId: transfer.productId,
          branchId: transfer.toBranchId,
          quantity: qty,
        },
        update: {
          quantity: { increment: qty },
        },
      })

      // Create StockAdjustment (transfer_in)
      await tx.stockAdjustment.create({
        data: {
          productId: transfer.productId,
          branchId: transfer.toBranchId,
          quantity: qty,
          reason: 'transfer_in',
          notes: `Transfer #${id} from ${transfer.fromBranchId}`,
          userId: user.id,
        },
      })

      // Create CostLayer at destination
      const unitCost = transfer.product.costTHB
        ? parseFloat(transfer.product.costTHB.toString())
        : 0

      await tx.costLayer.create({
        data: {
          productId: transfer.productId,
          branchId: transfer.toBranchId,
          quantityInitial: qty,
          quantityRemaining: qty,
          unitCostTHB: unitCost,
          receivedAt: new Date(),
        },
      })

      // Update transfer status
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'confirmed',
          completedAt: new Date(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          initiatedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      })

      return updated
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.message.startsWith('VALIDATION:')) {
      return NextResponse.json(
        { error: error.message.replace('VALIDATION:', '') },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
