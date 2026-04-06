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
      const transfer = await tx.stockTransfer.findUnique({ where: { id } })
      if (!transfer) {
        throw new Error('VALIDATION:Transfer not found')
      }
      if (transfer.status !== 'approved') {
        throw new Error('VALIDATION:Only approved transfers can be dispatched')
      }

      const qty = parseFloat(transfer.quantity.toString())

      // Check source inventory
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: transfer.productId,
            branchId: transfer.fromBranchId,
          },
        },
      })

      if (!sourceInventory || parseFloat(sourceInventory.quantity.toString()) < qty) {
        throw new Error('VALIDATION:Insufficient stock at source branch')
      }

      // Deduct from source inventory
      await tx.inventory.update({
        where: {
          productId_branchId: {
            productId: transfer.productId,
            branchId: transfer.fromBranchId,
          },
        },
        data: { quantity: { decrement: qty } },
      })

      // Create StockAdjustment (transfer_out)
      await tx.stockAdjustment.create({
        data: {
          productId: transfer.productId,
          branchId: transfer.fromBranchId,
          quantity: -qty,
          reason: 'transfer_out',
          notes: `Transfer #${id} to ${transfer.toBranchId}`,
          userId: user.id,
        },
      })

      // Update transfer status
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'dispatched' },
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
