import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { openCashSessionSchema } from '@/lib/validators/cash-session'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = request.nextUrl
    const branchId = searchParams.get('branchId')
    const open = searchParams.get('open')
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.CashSessionWhereInput = {}

    if (user.role !== 'admin') {
      where.branchId = user.branchId
    } else if (branchId) {
      where.branchId = branchId
    }

    if (open === 'true') {
      where.closedAt = null
    } else if (open === 'false') {
      where.closedAt = { not: null }
    }

    const [sessions, total] = await Promise.all([
      prisma.cashSession.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        skip,
        take,
        orderBy: { openedAt: 'desc' },
      }),
      prisma.cashSession.count({ where }),
    ])

    return NextResponse.json({ sessions, total, skip, take })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const parsed = openCashSessionSchema.parse(body)

    // Check if user already has an open session
    const existing = await prisma.cashSession.findFirst({
      where: {
        userId: user.id,
        branchId: parsed.branchId,
        closedAt: null,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You already have an open cash session at this branch' },
        { status: 400 }
      )
    }

    const session = await prisma.cashSession.create({
      data: {
        userId: user.id,
        branchId: parsed.branchId,
        openingFloat: parsed.openingFloat,
        deviceName: parsed.deviceName,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
