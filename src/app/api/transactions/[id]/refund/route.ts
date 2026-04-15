import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { format } from 'date-fns'

interface RefundItemInput {
  transactionItemId: string
  quantity: number
}

interface RefundBody {
  items: RefundItemInput[]
  reason?: string
}

async function generateRefundReceiptNumber(
  tx: Prisma.TransactionClient,
  branchCode: string,
  branchId: string
): Promise<string> {
  const today = new Date()
  const dateStr = format(today, 'yyyyMMdd')
  const prefix = `REF-${branchCode}-${dateStr}-`

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const count = await tx.transaction.count({
    where: {
      branchId,
      receiptNumber: { startsWith: 'REF-' },
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  })

  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('admin', 'manager')

    const body: RefundBody = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required for refund' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Find the original transaction with items and cost consumptions
        const transaction = await tx.transaction.findUnique({
          where: { id: params.id },
          include: {
            items: {
              include: {
                costConsumptions: true,
                product: true,
              },
            },
            branch: true,
          },
        })

        if (!transaction) {
          throw new Error('VALIDATION:Transaction not found')
        }

        if (transaction.status !== 'completed') {
          throw new Error('VALIDATION:Only completed transactions can be refunded')
        }

        // 2. Validate each refund item
        const refundItems: Array<{
          originalItem: typeof transaction.items[number]
          refundQty: number
        }> = []

        for (const ri of body.items) {
          const originalItem = transaction.items.find(
            (item) => item.id === ri.transactionItemId
          )
          if (!originalItem) {
            throw new Error(
              `VALIDATION:Item ${ri.transactionItemId} not found in this transaction`
            )
          }
          if (ri.quantity <= 0) {
            throw new Error(
              `VALIDATION:Refund quantity must be positive for ${originalItem.product.name}`
            )
          }
          if (ri.quantity > Number(originalItem.quantity)) {
            throw new Error(
              `VALIDATION:Refund quantity (${ri.quantity}) exceeds original quantity (${Number(originalItem.quantity)}) for ${originalItem.product.name}`
            )
          }
          refundItems.push({ originalItem, refundQty: ri.quantity })
        }

        // 3. Calculate refund amounts
        let refundSubtotal = new Prisma.Decimal(0)
        let refundVat = new Prisma.Decimal(0)
        let refundTotal = new Prisma.Decimal(0)

        const itemsData: Array<{
          productId: string
          quantity: Prisma.Decimal
          unitPriceTHB: Prisma.Decimal
          subtotalTHB: Prisma.Decimal
          vatTHB: Prisma.Decimal
          totalTHB: Prisma.Decimal
          weightGrams: Prisma.Decimal | null
          pricePerGram: Prisma.Decimal | null
          cogsTHB: Prisma.Decimal
          originalItem: typeof transaction.items[number]
          refundQty: number
        }> = []

        for (const { originalItem, refundQty } of refundItems) {
          const origQty = Number(originalItem.quantity)
          const ratio = refundQty / origQty

          const itemSubtotal = new Prisma.Decimal(
            Number(originalItem.subtotalTHB) * ratio
          ).toDecimalPlaces(2)
          const itemVat = new Prisma.Decimal(
            Number(originalItem.vatTHB) * ratio
          ).toDecimalPlaces(2)
          const itemTotal = new Prisma.Decimal(
            Number(originalItem.totalTHB) * ratio
          ).toDecimalPlaces(2)
          const itemCogs = new Prisma.Decimal(
            Number(originalItem.cogsTHB) * ratio
          ).toDecimalPlaces(2)

          const weightGrams = originalItem.weightGrams
            ? new Prisma.Decimal(Number(originalItem.weightGrams) * ratio).toDecimalPlaces(3)
            : null

          refundSubtotal = refundSubtotal.add(itemSubtotal)
          refundVat = refundVat.add(itemVat)
          refundTotal = refundTotal.add(itemTotal)

          itemsData.push({
            productId: originalItem.productId,
            quantity: new Prisma.Decimal(-refundQty),
            unitPriceTHB: originalItem.unitPriceTHB,
            subtotalTHB: itemSubtotal.neg(),
            vatTHB: itemVat.neg(),
            totalTHB: itemTotal.neg(),
            weightGrams: weightGrams ? weightGrams.neg() : null,
            pricePerGram: originalItem.pricePerGram,
            cogsTHB: itemCogs.neg(),
            originalItem,
            refundQty,
          })
        }

        // 4. Generate refund receipt number
        const receiptNumber = await generateRefundReceiptNumber(
          tx,
          transaction.branch.code,
          transaction.branchId
        )

        // 5. Create the refund transaction with negative amounts
        const note = body.reason
          ? `Refund of ${transaction.receiptNumber}: ${body.reason}`
          : `Refund of ${transaction.receiptNumber}`

        const refundTx = await tx.transaction.create({
          data: {
            customerId: transaction.customerId,
            userId: user.id,
            branchId: transaction.branchId,
            subtotalTHB: refundSubtotal.neg(),
            vatRate: transaction.vatRate,
            vatTHB: refundVat.neg(),
            totalTHB: refundTotal.neg(),
            vatIncluded: transaction.vatIncluded,
            discountType: note,
            status: 'refunded',
            paymentMethod: transaction.paymentMethod,
            reportType: transaction.reportType,
            receiptNumber,
            ageVerified: transaction.ageVerified,
            customerAge: transaction.customerAge,
            items: {
              create: itemsData.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPriceTHB: item.unitPriceTHB,
                subtotalTHB: item.subtotalTHB,
                vatTHB: item.vatTHB,
                totalTHB: item.totalTHB,
                weightGrams: item.weightGrams,
                pricePerGram: item.pricePerGram,
                cogsTHB: item.cogsTHB,
              })),
            },
          },
          include: {
            items: {
              include: { product: true },
            },
            customer: true,
            user: { select: { id: true, name: true, email: true } },
            branch: true,
          },
        })

        // 6. Restore inventory and FIFO cost layers for each refunded item
        for (const { originalItem, refundQty } of itemsData) {
          // Restore inventory
          await tx.inventory.update({
            where: {
              productId_branchId: {
                productId: originalItem.productId,
                branchId: transaction.branchId,
              },
            },
            data: {
              quantity: { increment: refundQty },
            },
          })

          // Reverse FIFO: restore quantityRemaining on cost layers
          // Distribute the refund quantity across consumed layers (most recent first)
          let qtyToRestore = refundQty
          const consumptions = [...originalItem.costConsumptions].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )

          for (const consumption of consumptions) {
            if (qtyToRestore <= 0) break
            const consumedQty = Number(consumption.quantity)
            const restoreQty = Math.min(qtyToRestore, consumedQty)

            await tx.costLayer.update({
              where: { id: consumption.costLayerId },
              data: {
                quantityRemaining: { increment: restoreQty },
              },
            })

            qtyToRestore -= restoreQty
          }
        }

        return refundTx
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
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
