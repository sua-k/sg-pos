import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('admin', 'manager')

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Find the transaction with items and cost consumptions
        const transaction = await tx.transaction.findUnique({
          where: { id: params.id },
          include: {
            items: {
              include: {
                costConsumptions: true,
              },
            },
          },
        })

        if (!transaction) {
          throw new Error('VALIDATION:Transaction not found')
        }

        if (transaction.status === 'voided') {
          throw new Error('VALIDATION:Transaction is already voided')
        }

        // 2. Restore inventory and reverse FIFO for each item
        for (const item of transaction.items) {
          // Restore inventory
          await tx.inventory.update({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: transaction.branchId,
              },
            },
            data: {
              quantity: { increment: Number(item.quantity) },
            },
          })

          // Reverse FIFO: restore quantityRemaining on cost layers
          for (const consumption of item.costConsumptions) {
            await tx.costLayer.update({
              where: { id: consumption.costLayerId },
              data: {
                quantityRemaining: { increment: Number(consumption.quantity) },
              },
            })
          }

          // Delete cost layer consumptions for this item
          await tx.costLayerConsumption.deleteMany({
            where: { transactionItemId: item.id },
          })
        }

        // 3. Set transaction status to voided
        const voided = await tx.transaction.update({
          where: { id: params.id },
          data: { status: 'voided' },
          include: {
            items: {
              include: { product: true },
            },
            customer: true,
            user: { select: { id: true, name: true, email: true } },
          },
        })

        return voided
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message.startsWith('VALIDATION:')) {
        return NextResponse.json(
          { error: error.message.replace('VALIDATION:', '') },
          { status: 400 }
        )
      }
    }
    console.error('Void error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
