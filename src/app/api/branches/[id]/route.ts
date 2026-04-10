import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params

    const branch = await prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        taxId: true,
        companyName: true,
        receiptHeader: true,
        receiptFooter: true,
        logoUrl: true,
      },
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    return NextResponse.json(branch)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole('admin')
    const { id } = params

    const body = await request.json()
    const { name, code, address, phone, taxId, companyName, receiptHeader, receiptFooter, logoUrl } = body

    const existing = await prisma.branch.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(taxId !== undefined && { taxId: taxId || null }),
        ...(companyName !== undefined && { companyName: companyName || null }),
        ...(receiptHeader !== undefined && { receiptHeader: receiptHeader || null }),
        ...(receiptFooter !== undefined && { receiptFooter: receiptFooter || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        taxId: true,
        companyName: true,
        receiptHeader: true,
        receiptFooter: true,
        logoUrl: true,
      },
    })

    return NextResponse.json(branch)
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
