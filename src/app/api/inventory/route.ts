import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = request.nextUrl
    const branchId = searchParams.get('branchId')
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    // Build product filter
    const productWhere: Prisma.ProductWhereInput = {}
    if (category) {
      productWhere.category = { name: category }
    }
    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Determine branch scope
    const effectiveBranchId = branchId ?? (user.role !== 'admin' ? user.branchId : null)

    const inventoryWhere: Prisma.InventoryWhereInput = {
      product: productWhere,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(lowStock ? { quantity: { lte: 10 } } : {}),
    }

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where: inventoryWhere,
        include: {
          product: { include: { category: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        skip,
        take,
        orderBy: { product: { name: 'asc' } },
      }),
      prisma.inventory.count({ where: inventoryWhere }),
    ])

    return NextResponse.json({ inventory, total, skip, take })
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
