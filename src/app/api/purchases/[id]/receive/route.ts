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
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      })

      if (!purchase) {
        throw new Error('VALIDATION:Purchase not found')
      }
      if (purchase.status !== 'confirmed') {
        throw new Error('VALIDATION:Only confirmed purchases can be received')
      }

      // Process each purchase item
      for (const item of purchase.items) {
        const qty = parseFloat(item.quantity.toString())

        // 1. Create StockAdjustment (reason: received)
        await tx.stockAdjustment.create({
          data: {
            productId: item.productId,
            branchId: purchase.branchId,
            quantity: qty,
            reason: 'received',
            notes: `Purchase #${purchase.invoiceNumber ?? id}`,
            userId: user.id,
          },
        })

        // 2. Upsert Inventory quantity
        await tx.inventory.upsert({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: purchase.branchId,
            },
          },
          create: {
            productId: item.productId,
            branchId: purchase.branchId,
            quantity: qty,
          },
          update: {
            quantity: { increment: qty },
          },
        })

        // 3. Create CostLayer
        // Unit cost ex-VAT: if vatIncluded, back-calculate
        const unitCostRaw = parseFloat(item.unitCostTHB.toString())
        const unitCostExVat = purchase.vatIncluded
          ? unitCostRaw - (unitCostRaw * 7) / 107
          : unitCostRaw
        const unitCostRounded = Math.round(unitCostExVat * 100) / 100

        await tx.costLayer.create({
          data: {
            productId: item.productId,
            branchId: purchase.branchId,
            purchaseItemId: item.id,
            quantityInitial: qty,
            quantityRemaining: qty,
            unitCostTHB: unitCostRounded,
            receivedAt: new Date(),
            batchNumber: item.batchNumber,
          },
        })

        // 4. Update product costTHB/costPerGram with latest purchase cost
        const updateData: Record<string, number> = { costTHB: unitCostRounded }
        if (item.product.soldByWeight && item.weightGrams) {
          const weightG = parseFloat(item.weightGrams.toString())
          if (weightG > 0) {
            updateData.costPerGram = Math.round((unitCostRounded / weightG) * 100) / 100
          }
        }
        await tx.product.update({
          where: { id: item.productId },
          data: updateData,
        })
      }

      // 5. Update purchase status to received
      const updated = await tx.purchase.update({
        where: { id },
        data: { status: 'received' },
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
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
