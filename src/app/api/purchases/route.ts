import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { createPurchaseSchema } from '@/lib/validators/purchase'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'manager')

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const branchId = searchParams.get('branchId')
    const supplierId = searchParams.get('supplierId')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.PurchaseWhereInput = {}
    if (status) where.status = status as Prisma.PurchaseWhereInput['status']
    if (branchId) where.branchId = branchId
    if (supplierId) where.supplierId = supplierId

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.count({ where }),
    ])

    return NextResponse.json({ purchases, total, skip, take })
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('admin', 'manager')

    const body = await request.json()
    const parsed = createPurchaseSchema.parse(body)

    // Calculate totals
    let subtotal = new Decimal(0)
    let totalVat = new Decimal(0)

    const itemsData = parsed.items.map((item) => {
      const itemSubtotal = new Decimal(item.unitCostTHB).mul(item.quantity)
      let itemVat: Decimal
      let itemTotal: Decimal

      if (parsed.vatIncluded) {
        // VAT-inclusive: back-calculate
        itemVat = itemSubtotal.mul(7).div(107).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        itemTotal = itemSubtotal
      } else {
        // VAT-exclusive: add VAT
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

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: parsed.supplierId,
        branchId: parsed.branchId,
        invoiceNumber: parsed.invoiceNumber,
        vatIncluded: parsed.vatIncluded,
        subtotalTHB: subtotal.toNumber(),
        vatTHB: totalVat.toNumber(),
        totalTHB: grandTotal.toNumber(),
        notes: parsed.notes,
        userId: user.id,
        items: { create: itemsData },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    return NextResponse.json(purchase, { status: 201 })
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
