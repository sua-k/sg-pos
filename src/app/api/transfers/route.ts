import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { createTransferSchema } from '@/lib/validators/transfer'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.StockTransferWhereInput = {}
    if (status) where.status = status as Prisma.StockTransferWhereInput['status']

    // Non-admin users only see transfers involving their branch
    if (user.role !== 'admin') {
      where.OR = [
        { fromBranchId: user.branchId },
        { toBranchId: user.branchId },
      ]
    }

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          initiatedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockTransfer.count({ where }),
    ])

    return NextResponse.json({ transfers, total, skip, take })
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
    const parsed = createTransferSchema.parse(body)

    const transfer = await prisma.stockTransfer.create({
      data: {
        fromBranchId: parsed.fromBranchId,
        toBranchId: parsed.toBranchId,
        productId: parsed.productId,
        quantity: parsed.quantity,
        notes: parsed.notes,
        initiatedById: user.id,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        initiatedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(transfer, { status: 201 })
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
