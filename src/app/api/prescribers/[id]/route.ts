import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/auth'
import { updatePrescriberSchema } from '@/lib/validators/prescriber'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const prescriber = await prisma.prescriber.findUnique({
      where: { id: params.id },
      include: {
        prescriptions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
        },
      },
    })

    if (!prescriber) {
      return NextResponse.json({ error: 'Prescriber not found' }, { status: 404 })
    }

    return NextResponse.json(prescriber)
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
    await requireRole('admin', 'manager')

    const body = await request.json()
    const parsed = updatePrescriberSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (parsed.name !== undefined) data.name = parsed.name
    if (parsed.licenseNo !== undefined) data.licenseNo = parsed.licenseNo
    if (parsed.licenseType !== undefined) data.licenseType = parsed.licenseType
    if (parsed.professionType !== undefined) data.professionType = parsed.professionType
    if (parsed.address !== undefined) data.address = parsed.address
    if (parsed.phone !== undefined) data.phone = parsed.phone

    const prescriber = await prisma.prescriber.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(prescriber)
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
