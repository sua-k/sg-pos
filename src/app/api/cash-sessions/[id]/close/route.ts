import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { closeCashSessionSchema } from '@/lib/validators/cash-session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const body = await request.json()
    const parsed = closeCashSessionSchema.parse(body)

    const session = await prisma.cashSession.findUnique({ where: { id } })
    if (!session) {
      return NextResponse.json({ error: 'Cash session not found' }, { status: 404 })
    }
    if (session.closedAt) {
      return NextResponse.json({ error: 'Cash session is already closed' }, { status: 400 })
    }
    if (session.userId !== user.id && user.role === 'staff') {
      return NextResponse.json({ error: 'You can only close your own sessions' }, { status: 403 })
    }

    // Calculate expected cash: opening float + sum of cash transactions during session
    const cashTransactions = await prisma.transaction.aggregate({
      where: {
        branchId: session.branchId,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: {
          gte: session.openedAt,
          lte: new Date(),
        },
      },
      _sum: { totalTHB: true },
    })

    const openingFloat = parseFloat(session.openingFloat.toString())
    const cashSales = cashTransactions._sum.totalTHB
      ? parseFloat(cashTransactions._sum.totalTHB.toString())
      : 0
    const expectedCash = Math.round((openingFloat + cashSales) * 100) / 100
    const discrepancy = Math.round((parsed.actualCash - expectedCash) * 100) / 100

    const updated = await prisma.cashSession.update({
      where: { id },
      data: {
        closingFloat: parsed.actualCash,
        expectedCash,
        actualCash: parsed.actualCash,
        discrepancy,
        closedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(updated)
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
