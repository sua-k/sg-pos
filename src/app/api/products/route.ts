import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { createProductSchema } from '@/lib/validators/product'
import { Prisma, StrainType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const strainType = searchParams.get('strainType')
    const search = searchParams.get('search')
    const branchId = searchParams.get('branchId')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.ProductWhereInput = {}

    if (category) {
      where.category = { name: category }
    }

    if (strainType) {
      where.strainType = strainType as StrainType
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          ...(branchId
            ? { inventory: { where: { branchId } } }
            : { inventory: true }),
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ products, total, skip, take })
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
    await requireRole('admin', 'manager')

    const body = await request.json()
    const parsed = createProductSchema.parse(body)

    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        sku: parsed.sku,
        priceTHB: parsed.priceTHB,
        strainType: parsed.strainType ?? undefined,
        pricePerGram: parsed.pricePerGram ?? undefined,
        costTHB: parsed.costTHB ?? undefined,
        costPerGram: parsed.costPerGram ?? undefined,
        costVatIncluded: parsed.costVatIncluded,
        soldByWeight: parsed.soldByWeight,
        description: parsed.description ?? undefined,
        thcPercentage: parsed.thcPercentage ?? undefined,
        cbdPercentage: parsed.cbdPercentage ?? undefined,
        expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : undefined,
        batchNumber: parsed.batchNumber ?? undefined,
        weightPerUnit: parsed.weightPerUnit ?? undefined,
        categoryId: parsed.categoryId ?? undefined,
        supplierId: parsed.supplierId ?? undefined,
        imageUrl: parsed.imageUrl ?? undefined,
      },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
