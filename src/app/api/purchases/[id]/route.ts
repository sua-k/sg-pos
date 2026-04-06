import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { updatePurchaseSchema } from '@/lib/validators/purchase'
import Decimal from 'decimal.js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin', 'manager')
    const { id } = await params

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    return NextResponse.json(purchase)
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin', 'manager')
    const { id } = await params

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft purchases can be updated' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updatePurchaseSchema.parse(body)

    const vatIncluded = parsed.vatIncluded ?? existing.vatIncluded

    // If items are provided, recalculate totals
    if (parsed.items) {
      let subtotal = new Decimal(0)
      let totalVat = new Decimal(0)

      const itemsData = parsed.items.map((item) => {
        const itemSubtotal = new Decimal(item.unitCostTHB).mul(item.quantity)
        let itemVat: Decimal
        let itemTotal: Decimal

        if (vatIncluded) {
          itemVat = itemSubtotal.mul(7).div(107).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          itemTotal = itemSubtotal
        } else {
          itemVat = itemSubtotal.mul(0.07).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          itemTotal = itemSubtotal.plus(itemVat)
        }

        const itemSub = itemTotal.minus(itemVat)
        subtotal = subtotal.plus(itemSub)
        totalVat = totalVat.plus(itemVat)

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitCostTHB: item.unitCostTHB,
          subtotalTHB: itemSub.toNumber(),
          vatTHB: itemVat.toNumber(),
          totalTHB: itemTotal.toNumber(),
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          weightGrams: item.weightGrams,
        }
      })

      const grandTotal = subtotal.plus(totalVat)

      // Delete old items and create new ones
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } })

      const purchase = await prisma.purchase.update({
        where: { id },
        data: {
          invoiceNumber: parsed.invoiceNumber,
          vatIncluded,
          notes: parsed.notes,
          subtotalTHB: subtotal.toNumber(),
          vatTHB: totalVat.toNumber(),
          totalTHB: grandTotal.toNumber(),
          items: { create: itemsData },
        },
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      })

      return NextResponse.json(purchase)
    }

    // Update without items change
    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        invoiceNumber: parsed.invoiceNumber,
        vatIncluded: parsed.vatIncluded,
        notes: parsed.notes,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    return NextResponse.json(purchase)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
