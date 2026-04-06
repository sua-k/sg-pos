import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { createPrescriberSchema } from '@/lib/validators/prescriber'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.PrescriberWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseNo: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [prescribers, total] = await Promise.all([
      prisma.prescriber.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.prescriber.count({ where }),
    ])

    return NextResponse.json({ prescribers, total, skip, take })
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
    const parsed = createPrescriberSchema.parse(body)

    const prescriber = await prisma.prescriber.create({
      data: {
        name: parsed.name,
        licenseNo: parsed.licenseNo,
        licenseType: parsed.licenseType ?? undefined,
        professionType: parsed.professionType,
        address: parsed.address ?? undefined,
        phone: parsed.phone ?? undefined,
      },
    })

    return NextResponse.json(prescriber, { status: 201 })
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
      return NextResponse.json({ error: 'License number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
