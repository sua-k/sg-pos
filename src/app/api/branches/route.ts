import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()

    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true, address: true, phone: true, taxId: true, companyName: true, receiptHeader: true, receiptFooter: true, logoUrl: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ branches })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin')

    const body = await request.json()
    const { name, code, address, phone } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    // Check for duplicate code
    const existing = await prisma.branch.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Branch code already exists' }, { status: 400 })
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address: address || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
      },
    })

    return NextResponse.json(branch, { status: 201 })
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
