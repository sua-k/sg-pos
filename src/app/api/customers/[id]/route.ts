import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { updateCustomerSchema } from '@/lib/validators/customer'
import Decimal from 'decimal.js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        transactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            items: { include: { product: true } },
          },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate total spend and average
    const totals = await prisma.transaction.aggregate({
      where: { customerId: params.id, status: 'completed' },
      _sum: { totalTHB: true },
      _count: true,
    })

    const totalSpend = new Decimal(totals._sum.totalTHB ?? 0).toNumber()
    const orderCount = totals._count
    const averagePurchase = orderCount > 0
      ? new Decimal(totalSpend).div(orderCount).toDecimalPlaces(2).toNumber()
      : 0

    return NextResponse.json({
      ...customer,
      totalSpend,
      orderCount,
      averagePurchase,
    })
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
    await requireAuth()

    const body = await request.json()
    const parsed = updateCustomerSchema.parse(body)

    const data: Record<string, unknown> = {}

    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.dateOfBirth !== undefined) data.dateOfBirth = new Date(parsed.dateOfBirth)
    if (parsed.nationality !== undefined) data.nationality = parsed.nationality
    if (parsed.phone !== undefined) data.phone = parsed.phone
    if (parsed.email !== undefined) data.email = parsed.email
    if (parsed.notes !== undefined) data.notes = parsed.notes

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(customer)
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
