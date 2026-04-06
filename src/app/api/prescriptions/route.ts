import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createPrescriptionSchema } from '@/lib/validators/prescription'
import { Prisma } from '@prisma/client'

async function generatePrescriptionNo(
  branchCode: string,
  branchId: string
): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `RX-${branchCode}-${dateStr}-`

  const last = await prisma.prescription.findFirst({
    where: {
      branchId,
      prescriptionNo: { startsWith: prefix },
    },
    orderBy: { prescriptionNo: 'desc' },
  })

  let seq = 1
  if (last) {
    const lastSeq = parseInt(last.prescriptionNo.replace(prefix, ''), 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = request.nextUrl
    const branchId = searchParams.get('branchId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status') // 'active' | 'expired'
    const skip = parseInt(searchParams.get('skip') ?? '0', 10)
    const take = parseInt(searchParams.get('take') ?? '50', 10)

    const where: Prisma.PrescriptionWhereInput = {}

    // Branch-scope for non-admin users
    if (user.role !== 'admin') {
      where.branchId = user.branchId
    } else if (branchId) {
      where.branchId = branchId
    }

    if (customerId) where.customerId = customerId

    if (status === 'active') {
      where.expiryDate = { gte: new Date() }
    } else if (status === 'expired') {
      where.expiryDate = { lt: new Date() }
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          customer: true,
          prescriber: true,
          branch: { select: { id: true, name: true, code: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.count({ where }),
    ])

    return NextResponse.json({ prescriptions, total, skip, take })
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
    const parsed = createPrescriptionSchema.parse(body)

    // Get branch for prescription number generation
    const branch = await prisma.branch.findUnique({ where: { id: parsed.branchId } })
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 400 })
    }

    const prescriptionNo = await generatePrescriptionNo(branch.code, branch.id)

    // Auto-calculate totalAllowedG if dailyDosageG and numDays provided
    let totalAllowedG = parsed.totalAllowedG ?? null
    if (!totalAllowedG && parsed.dailyDosageG && parsed.numDays) {
      totalAllowedG = parsed.dailyDosageG * parsed.numDays
    }

    const prescription = await prisma.prescription.create({
      data: {
        customerId: parsed.customerId,
        prescriberId: parsed.prescriberId ?? undefined,
        branchId: parsed.branchId,
        prescriptionNo,
        issuedDate: new Date(parsed.issuedDate),
        expiryDate: new Date(parsed.expiryDate),
        dailyDosageG: parsed.dailyDosageG ?? undefined,
        numDays: parsed.numDays ?? undefined,
        totalAllowedG: totalAllowedG ?? undefined,
        consumedG: 0,
        diagnosis: parsed.diagnosis ?? undefined,
        notes: parsed.notes ?? undefined,
        createdInPos: true,
      },
      include: {
        customer: true,
        prescriber: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(prescription, { status: 201 })
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
      return NextResponse.json({ error: 'Prescription number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
