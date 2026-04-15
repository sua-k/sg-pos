import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import Decimal from 'decimal.js'

// Bangkok timezone offset: UTC+7
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

function getBangkokDayBounds(dateStr: string): { start: Date; end: Date } {
  // dateStr is YYYY-MM-DD in Bangkok time
  // Convert to UTC by subtracting +7 offset
  const bangkokMidnight = new Date(`${dateStr}T00:00:00.000+07:00`)
  const bangkokEndOfDay = new Date(`${dateStr}T23:59:59.999+07:00`)
  return { start: bangkokMidnight, end: bangkokEndOfDay }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin', 'manager')

    const { searchParams } = new URL(request.url)

    // Default to today in Bangkok time
    const nowBangkok = new Date(Date.now() + BANGKOK_OFFSET_MS)
    const defaultDate = nowBangkok.toISOString().split('T')[0]

    const dateStr = searchParams.get('date') || defaultDate
    const branchId = searchParams.get('branchId') || null

    const { start, end } = getBangkokDayBounds(dateStr)
    const dateFilter = { createdAt: { gte: start, lte: end } }
    const branchFilter = branchId ? { branchId } : {}

    // Fetch branch info if branchId provided
    const branch = branchId
      ? await prisma.branch.findUnique({ where: { id: branchId } })
      : null

    // Completed transactions with items + products + categories
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        ...dateFilter,
        ...branchFilter,
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    // Voided transactions count
    const voidedCount = await prisma.transaction.count({
      where: {
        status: 'voided',
        ...dateFilter,
        ...branchFilter,
      },
    })

    // Aggregation
    let totalRevenue = new Decimal(0)
    let totalVAT = new Decimal(0)
    let totalSubtotal = new Decimal(0)
    let totalDiscount = new Decimal(0)
    let totalCOGS = new Decimal(0)

    const paymentMap = new Map<string, { count: number; total: Decimal }>()
    const categoryMap = new Map<string, { name: string; count: number; revenue: Decimal }>()
    const productMap = new Map<
      string,
      { name: string; quantity: Decimal; revenue: Decimal }
    >()

    for (const txn of transactions) {
      totalRevenue = totalRevenue.plus(new Decimal(txn.totalTHB.toString()))
      totalVAT = totalVAT.plus(new Decimal(txn.vatTHB.toString()))
      totalSubtotal = totalSubtotal.plus(new Decimal(txn.subtotalTHB.toString()))
      if (txn.discountTHB) {
        totalDiscount = totalDiscount.plus(new Decimal(txn.discountTHB.toString()))
      }

      for (const item of txn.items) {
        totalCOGS = totalCOGS.plus(new Decimal(item.cogsTHB.toString()))

        // Category breakdown
        const catId = item.product.categoryId ?? 'uncategorized'
        const catName = item.product.category?.name ?? 'Uncategorized'
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { name: catName, count: 0, revenue: new Decimal(0) })
        }
        const cat = categoryMap.get(catId)!
        cat.count += 1
        cat.revenue = cat.revenue.plus(new Decimal(item.subtotalTHB.toString()))

        // Product breakdown
        const pid = item.productId
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            name: item.product.name,
            quantity: new Decimal(0),
            revenue: new Decimal(0),
          })
        }
        const prod = productMap.get(pid)!
        prod.quantity = prod.quantity.plus(new Decimal(item.quantity.toString()))
        prod.revenue = prod.revenue.plus(new Decimal(item.subtotalTHB.toString()))
      }

      // Payment method breakdown
      const method = txn.paymentMethod
      if (!paymentMap.has(method)) {
        paymentMap.set(method, { count: 0, total: new Decimal(0) })
      }
      const pm = paymentMap.get(method)!
      pm.count += 1
      pm.total = pm.total.plus(new Decimal(txn.totalTHB.toString()))
    }

    const grossProfit = totalSubtotal.minus(totalCOGS)
    const grossMargin = totalSubtotal.gt(0)
      ? grossProfit.div(totalSubtotal).mul(100).toDecimalPlaces(1)
      : new Decimal(0)

    // Payment method object (named keys)
    const byPaymentMethod: Record<string, { count: number; total: string }> = {}
    for (const [method, { count, total }] of Array.from(paymentMap.entries())) {
      byPaymentMethod[method] = { count, total: total.toFixed(2) }
    }

    // Category array
    const byCategory = Array.from(categoryMap.values())
      .map(({ name, count, revenue }) => ({
        category: name,
        count,
        revenue: revenue.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))

    // Top products (top 10 by revenue)
    const topProducts = Array.from(productMap.values())
      .map(({ name, quantity, revenue }) => ({
        name,
        quantity: quantity.toFixed(3),
        revenue: revenue.toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 10)

    // Cash session for this day and branch
    const cashSession = branchId
      ? await prisma.cashSession.findFirst({
          where: {
            branchId,
            openedAt: { gte: start, lte: end },
          },
          orderBy: { openedAt: 'desc' },
        })
      : null

    return NextResponse.json({
      date: dateStr,
      branch: branch ? { name: branch.name, code: branch.code } : null,
      summary: {
        totalTransactions: transactions.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalVAT: totalVAT.toFixed(2),
        totalSubtotal: totalSubtotal.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        totalCOGS: totalCOGS.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMargin: grossMargin.toFixed(1),
      },
      byPaymentMethod,
      byCategory,
      cashSession: cashSession
        ? {
            openingFloat: cashSession.openingFloat.toFixed(2),
            expectedCash: cashSession.expectedCash?.toFixed(2) ?? null,
            actualCash: cashSession.actualCash?.toFixed(2) ?? null,
            discrepancy: cashSession.discrepancy?.toFixed(2) ?? null,
          }
        : null,
      voidedTransactions: voidedCount,
      topProducts,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Daily report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
