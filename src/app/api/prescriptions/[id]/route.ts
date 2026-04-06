import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { updatePrescriptionSchema } from '@/lib/validators/prescription'
import Decimal from 'decimal.js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const prescription = await prisma.prescription.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        prescriber: true,
        branch: { select: { id: true, name: true, code: true } },
        transactionPrescriptions: {
          include: {
            transaction: {
              include: {
                items: { include: { product: true } },
              },
            },
          },
        },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    // Calculate consumed vs allowed
    const consumedG = new Decimal(prescription.consumedG.toString()).toNumber()
    const totalAllowedG = prescription.totalAllowedG
      ? new Decimal(prescription.totalAllowedG.toString()).toNumber()
      : null
    const remainingG = totalAllowedG !== null ? totalAllowedG - consumedG : null

    return NextResponse.json({
      ...prescription,
      consumedG,
      totalAllowedG,
      remainingG,
    })
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
    await requireAuth()

    const body = await request.json()
    const parsed = updatePrescriptionSchema.parse(body)

    const data: Record<string, unknown> = {}
    if (parsed.prescriberId !== undefined) data.prescriberId = parsed.prescriberId
    if (parsed.issuedDate !== undefined) data.issuedDate = new Date(parsed.issuedDate)
    if (parsed.expiryDate !== undefined) data.expiryDate = new Date(parsed.expiryDate)
    if (parsed.dailyDosageG !== undefined) data.dailyDosageG = parsed.dailyDosageG
    if (parsed.numDays !== undefined) data.numDays = parsed.numDays
    if (parsed.totalAllowedG !== undefined) data.totalAllowedG = parsed.totalAllowedG
    if (parsed.diagnosis !== undefined) data.diagnosis = parsed.diagnosis
    if (parsed.notes !== undefined) data.notes = parsed.notes

    const prescription = await prisma.prescription.update({
      where: { id: params.id },
      data,
      include: {
        customer: true,
        prescriber: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(prescription)
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
