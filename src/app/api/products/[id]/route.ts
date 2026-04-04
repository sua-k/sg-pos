import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { updateProductSchema } from '@/lib/validators/product'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        supplier: true,
        inventory: {
          include: { branch: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
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
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('admin', 'manager')

    const body = await request.json()
    const parsed = updateProductSchema.parse(body)

    const data: Record<string, unknown> = {}

    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.sku !== undefined) data.sku = parsed.sku
    if (parsed.priceTHB !== undefined) data.priceTHB = parsed.priceTHB
    if (parsed.strainType !== undefined) data.strainType = parsed.strainType
    if (parsed.pricePerGram !== undefined) data.pricePerGram = parsed.pricePerGram
    if (parsed.costTHB !== undefined) data.costTHB = parsed.costTHB
    if (parsed.costPerGram !== undefined) data.costPerGram = parsed.costPerGram
    if (parsed.costVatIncluded !== undefined) data.costVatIncluded = parsed.costVatIncluded
    if (parsed.soldByWeight !== undefined) data.soldByWeight = parsed.soldByWeight
    if (parsed.description !== undefined) data.description = parsed.description
    if (parsed.thcPercentage !== undefined) data.thcPercentage = parsed.thcPercentage
    if (parsed.cbdPercentage !== undefined) data.cbdPercentage = parsed.cbdPercentage
    if (parsed.expiryDate !== undefined) {
      data.expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null
    }
    if (parsed.batchNumber !== undefined) data.batchNumber = parsed.batchNumber
    if (parsed.weightPerUnit !== undefined) data.weightPerUnit = parsed.weightPerUnit
    if (parsed.categoryId !== undefined) data.categoryId = parsed.categoryId
    if (parsed.supplierId !== undefined) data.supplierId = parsed.supplierId
    if (parsed.imageUrl !== undefined) data.imageUrl = parsed.imageUrl

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { category: true, supplier: true },
    })

    return NextResponse.json(product)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('admin', 'manager')

    const transactionItems = await prisma.transactionItem.count({
      where: { productId: params.id },
    })

    if (transactionItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with existing transaction history' },
        { status: 409 }
      )
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
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
