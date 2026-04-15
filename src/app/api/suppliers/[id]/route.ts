import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { updateSupplierSchema } from '@/lib/validators/supplier'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        licenseNo: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        createdAt: true,
        _count: { select: { purchases: true } },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(supplier)
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
    await requireRole('admin', 'manager')

    const body = await request.json()
    const parsed = updateSupplierSchema.parse(body)

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.licenseNo !== undefined && { licenseNo: parsed.licenseNo ?? null }),
        ...(parsed.contactName !== undefined && { contactName: parsed.contactName ?? null }),
        ...(parsed.phone !== undefined && { phone: parsed.phone ?? null }),
        ...(parsed.email !== undefined && { email: parsed.email ?? null }),
        ...(parsed.address !== undefined && { address: parsed.address ?? null }),
      },
    })

    return NextResponse.json(supplier)
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
