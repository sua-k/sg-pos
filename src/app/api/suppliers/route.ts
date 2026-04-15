import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { createSupplierSchema } from '@/lib/validators/supplier'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '100', 10)

    const where: Prisma.SupplierWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseNo: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          licenseNo: true,
          contactName: true,
          phone: true,
          email: true,
          address: true,
          createdAt: true,
        },
      }),
      prisma.supplier.count({ where }),
    ])

    return NextResponse.json({ suppliers, total, skip, take })
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
    const parsed = createSupplierSchema.parse(body)

    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.name,
        licenseNo: parsed.licenseNo ?? undefined,
        contactName: parsed.contactName ?? undefined,
        phone: parsed.phone ?? undefined,
        email: parsed.email ?? undefined,
        address: parsed.address ?? undefined,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
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
