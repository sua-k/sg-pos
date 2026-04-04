import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createCustomerSchema } from '@/lib/validators/customer'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const idNumber = searchParams.get('idNumber')
    const name = searchParams.get('name')

    if (!idNumber && !name) {
      return NextResponse.json({ error: 'Provide idNumber or name to search' }, { status: 400 })
    }

    const customers = await prisma.customer.findMany({
      where: idNumber
        ? { idNumber }
        : { name: { contains: name!, mode: 'insensitive' } },
      include: {
        _count: { select: { transactions: true } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ customers })
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
    await requireAuth()

    const body = await request.json()
    const parsed = createCustomerSchema.parse(body)

    // Upsert: if idNumber + idType exists, return existing
    const existing = await prisma.customer.findUnique({
      where: {
        idNumber_idType: {
          idNumber: parsed.idNumber,
          idType: parsed.idType,
        },
      },
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    const customer = await prisma.customer.create({
      data: {
        idNumber: parsed.idNumber,
        idType: parsed.idType,
        name: parsed.name ?? undefined,
        dateOfBirth: new Date(parsed.dateOfBirth),
        nationality: parsed.nationality ?? undefined,
        phone: parsed.phone ?? undefined,
        email: parsed.email ?? undefined,
        notes: parsed.notes ?? undefined,
      },
    })

    return NextResponse.json(customer, { status: 201 })
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
