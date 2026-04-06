import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import Decimal from 'decimal.js'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'manager')

    const { searchParams } = new URL(request.url)

    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const startDateStr = searchParams.get('startDate') || defaultStart.toISOString().split('T')[0]
    const endDateStr = searchParams.get('endDate') || now.toISOString().split('T')[0]
    const branchId = searchParams.get('branchId') || null

    const startDate = new Date(startDateStr)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(endDateStr)
    endDate.setHours(23, 59, 59, 999)

    const branchFilter = branchId ? { branchId } : {}
    const dateFilter = { createdAt: { gte: startDate, lte: endDate } }

    // Fetch completed transactions
    const transactions = await prisma.transaction.findMany({
      where: { status: 'completed', ...dateFilter, ...branchFilter },
      select: { subtotalTHB: true, vatTHB: true, totalTHB: true, createdAt: true },
    })

    // Fetch received purchases
    const purchases = await prisma.purchase.findMany({
      where: {
        status: 'received',
        ...dateFilter,
        ...(branchId ? { branchId } : {}),
      },
      select: { subtotalTHB: true, vatTHB: true, totalTHB: true, createdAt: true },
    })

    // Build daily map
    const dailyMap = new Map<string, { outputVat: Decimal; inputVat: Decimal; outputSales: Decimal; inputPurchases: Decimal }>()

    for (const txn of transactions) {
      const day = txn.createdAt.toISOString().split('T')[0]
      if (!dailyMap.has(day)) {
        dailyMap.set(day, {
          outputVat: new Decimal(0),
          inputVat: new Decimal(0),
          outputSales: new Decimal(0),
          inputPurchases: new Decimal(0),
        })
      }
      const entry = dailyMap.get(day)!
      entry.outputVat = entry.outputVat.plus(new Decimal(txn.vatTHB.toString()))
      entry.outputSales = entry.outputSales.plus(new Decimal(txn.subtotalTHB.toString()))
    }

    for (const p of purchases) {
      const day = p.createdAt.toISOString().split('T')[0]
      if (!dailyMap.has(day)) {
        dailyMap.set(day, {
          outputVat: new Decimal(0),
          inputVat: new Decimal(0),
          outputSales: new Decimal(0),
          inputPurchases: new Decimal(0),
        })
      }
      const entry = dailyMap.get(day)!
      entry.inputVat = entry.inputVat.plus(new Decimal(p.vatTHB.toString()))
      entry.inputPurchases = entry.inputPurchases.plus(new Decimal(p.subtotalTHB.toString()))
    }

    // Build CSV
    const rows: string[] = [
      'Date,Net Sales (THB),Output VAT (THB),Net Purchases (THB),Input VAT (THB),Net VAT Payable (THB)',
    ]

    const sortedDays = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b))

    let totalOutputVat = new Decimal(0)
    let totalInputVat = new Decimal(0)
    let totalOutputSales = new Decimal(0)
    let totalInputPurchases = new Decimal(0)

    for (const [date, entry] of sortedDays) {
      const net = entry.outputVat.minus(entry.inputVat)
      totalOutputVat = totalOutputVat.plus(entry.outputVat)
      totalInputVat = totalInputVat.plus(entry.inputVat)
      totalOutputSales = totalOutputSales.plus(entry.outputSales)
      totalInputPurchases = totalInputPurchases.plus(entry.inputPurchases)

      rows.push(
        [
          date,
          entry.outputSales.toFixed(2),
          entry.outputVat.toFixed(2),
          entry.inputPurchases.toFixed(2),
          entry.inputVat.toFixed(2),
          net.toFixed(2),
        ].join(',')
      )
    }

    // Totals row
    rows.push(
      [
        'TOTAL',
        totalOutputSales.toFixed(2),
        totalOutputVat.toFixed(2),
        totalInputPurchases.toFixed(2),
        totalInputVat.toFixed(2),
        totalOutputVat.minus(totalInputVat).toFixed(2),
      ].join(',')
    )

    const csv = rows.join('\n')
    const filename = `vat-report-${startDateStr}-to-${endDateStr}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('VAT export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
