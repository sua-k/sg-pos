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

    // ── Output VAT (from completed transactions) ──────────────────────────────
    const transactions = await prisma.transaction.findMany({
      where: { status: 'completed', ...dateFilter, ...branchFilter },
      select: { subtotalTHB: true, vatTHB: true, totalTHB: true, createdAt: true },
    })

    let outputNetSales = new Decimal(0)
    let outputVatTotal = new Decimal(0)

    for (const txn of transactions) {
      outputNetSales = outputNetSales.plus(new Decimal(txn.subtotalTHB.toString()))
      outputVatTotal = outputVatTotal.plus(new Decimal(txn.vatTHB.toString()))
    }

    const outputVat = {
      totalSales: outputNetSales.plus(outputVatTotal).toFixed(2),
      totalVat: outputVatTotal.toFixed(2),
      netSales: outputNetSales.toFixed(2),
    }

    // ── Input VAT (from received purchases) ──────────────────────────────────
    const purchases = await prisma.purchase.findMany({
      where: {
        status: 'received',
        ...dateFilter,
        ...(branchId ? { branchId } : {}),
      },
      select: { subtotalTHB: true, vatTHB: true, totalTHB: true, createdAt: true },
    })

    let inputNetPurchases = new Decimal(0)
    let inputVatTotal = new Decimal(0)

    for (const p of purchases) {
      inputNetPurchases = inputNetPurchases.plus(new Decimal(p.subtotalTHB.toString()))
      inputVatTotal = inputVatTotal.plus(new Decimal(p.vatTHB.toString()))
    }

    const inputVat = {
      totalPurchases: inputNetPurchases.plus(inputVatTotal).toFixed(2),
      totalVat: inputVatTotal.toFixed(2),
      netPurchases: inputNetPurchases.toFixed(2),
    }

    const netVatPayable = outputVatTotal.minus(inputVatTotal).toFixed(2)

    // ── Daily breakdown ───────────────────────────────────────────────────────
    const dailyMap = new Map<string, { outputVat: Decimal; inputVat: Decimal }>()

    for (const txn of transactions) {
      const day = txn.createdAt.toISOString().split('T')[0]
      if (!dailyMap.has(day)) dailyMap.set(day, { outputVat: new Decimal(0), inputVat: new Decimal(0) })
      dailyMap.get(day)!.outputVat = dailyMap.get(day)!.outputVat.plus(new Decimal(txn.vatTHB.toString()))
    }

    for (const p of purchases) {
      const day = p.createdAt.toISOString().split('T')[0]
      if (!dailyMap.has(day)) dailyMap.set(day, { outputVat: new Decimal(0), inputVat: new Decimal(0) })
      dailyMap.get(day)!.inputVat = dailyMap.get(day)!.inputVat.plus(new Decimal(p.vatTHB.toString()))
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { outputVat, inputVat }]) => ({
        date,
        outputVat: outputVat.toFixed(2),
        inputVat: inputVat.toFixed(2),
        net: outputVat.minus(inputVat).toFixed(2),
      }))

    return NextResponse.json({ outputVat, inputVat, netVatPayable, daily })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('VAT report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
