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
    const txnFilter = { status: 'completed' as const, ...dateFilter, ...branchFilter }

    // Fetch all completed transactions with items + products
    const transactions = await prisma.transaction.findMany({
      where: txnFilter,
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        customer: true,
      },
    })

    // ── Revenue Trend (grouped by day) ──────────────────────────────────────
    const trendMap = new Map<string, { revenue: Decimal; cogs: Decimal }>()

    for (const txn of transactions) {
      const day = txn.createdAt.toISOString().split('T')[0]
      if (!trendMap.has(day)) {
        trendMap.set(day, { revenue: new Decimal(0), cogs: new Decimal(0) })
      }
      const entry = trendMap.get(day)!
      entry.revenue = entry.revenue.plus(new Decimal(txn.subtotalTHB.toString()))
      for (const item of txn.items) {
        entry.cogs = entry.cogs.plus(new Decimal(item.cogsTHB.toString()))
      }
    }

    const revenueTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { revenue, cogs }]) => ({
        date,
        revenue: revenue.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: revenue.minus(cogs).toFixed(2),
      }))

    // ── Top Products ─────────────────────────────────────────────────────────
    const productMap = new Map<
      string,
      { name: string; sku: string; qty: Decimal; revenue: Decimal; cogs: Decimal }
    >()

    for (const txn of transactions) {
      for (const item of txn.items) {
        const pid = item.productId
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            name: item.product.name,
            sku: item.product.sku,
            qty: new Decimal(0),
            revenue: new Decimal(0),
            cogs: new Decimal(0),
          })
        }
        const p = productMap.get(pid)!
        p.qty = p.qty.plus(new Decimal(item.quantity.toString()))
        p.revenue = p.revenue.plus(new Decimal(item.subtotalTHB.toString()))
        p.cogs = p.cogs.plus(new Decimal(item.cogsTHB.toString()))
      }
    }

    const topProducts = Array.from(productMap.entries())
      .map(([id, p]) => ({
        id,
        name: p.name,
        sku: p.sku,
        qtySold: p.qty.toFixed(3),
        revenue: p.revenue.toFixed(2),
        margin: p.revenue.gt(0)
          ? p.revenue.minus(p.cogs).div(p.revenue).mul(100).toDecimalPlaces(1).toFixed(1)
          : '0.0',
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 10)

    // ── Strain Breakdown ─────────────────────────────────────────────────────
    const strainMap = new Map<string, Decimal>()

    for (const txn of transactions) {
      for (const item of txn.items) {
        const strain = item.product.strainType ?? 'other'
        if (!strainMap.has(strain)) strainMap.set(strain, new Decimal(0))
        strainMap.set(strain, strainMap.get(strain)!.plus(new Decimal(item.subtotalTHB.toString())))
      }
    }

    const totalStrainRevenue = Array.from(strainMap.values()).reduce(
      (acc, v) => acc.plus(v),
      new Decimal(0)
    )

    const strainBreakdown = Array.from(strainMap.entries()).map(([strain, revenue]) => ({
      strain,
      revenue: revenue.toFixed(2),
      percentage: totalStrainRevenue.gt(0)
        ? revenue.div(totalStrainRevenue).mul(100).toDecimalPlaces(1).toFixed(1)
        : '0.0',
    }))

    // ── Customer Stats ────────────────────────────────────────────────────────
    const customerTxnMap = new Map<string, number>()
    let totalSpend = new Decimal(0)

    for (const txn of transactions) {
      const cid = txn.customerId
      customerTxnMap.set(cid, (customerTxnMap.get(cid) ?? 0) + 1)
      totalSpend = totalSpend.plus(new Decimal(txn.totalTHB.toString()))
    }

    const totalCustomers = customerTxnMap.size
    const repeatCustomers = Array.from(customerTxnMap.values()).filter((c) => c > 1).length
    const avgSpend =
      totalCustomers > 0 ? totalSpend.div(transactions.length).toFixed(2) : '0.00'

    // New customers this period: joined within date range
    const newThisPeriod = await prisma.customer.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    })

    const customerStats = {
      totalCustomers,
      repeatCustomers,
      avgSpend,
      newThisPeriod,
    }

    // ── Category Breakdown ────────────────────────────────────────────────────
    const categoryMap = new Map<string, { name: string; revenue: Decimal }>()

    for (const txn of transactions) {
      for (const item of txn.items) {
        const catId = item.product.categoryId ?? 'uncategorized'
        const catName = item.product.category?.name ?? 'Uncategorized'
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { name: catName, revenue: new Decimal(0) })
        }
        categoryMap.get(catId)!.revenue = categoryMap
          .get(catId)!
          .revenue.plus(new Decimal(item.subtotalTHB.toString()))
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([id, { name, revenue }]) => ({ id, name, revenue: revenue.toFixed(2) }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))

    // ── Payment Method Breakdown ──────────────────────────────────────────────
    const paymentMap = new Map<string, { count: number; total: Decimal }>()

    for (const txn of transactions) {
      const method = txn.paymentMethod
      if (!paymentMap.has(method)) paymentMap.set(method, { count: 0, total: new Decimal(0) })
      const entry = paymentMap.get(method)!
      entry.count += 1
      entry.total = entry.total.plus(new Decimal(txn.totalTHB.toString()))
    }

    const paymentMethodBreakdown = Array.from(paymentMap.entries()).map(
      ([method, { count, total }]) => ({
        method,
        count,
        total: total.toFixed(2),
      })
    )

    return NextResponse.json({
      revenueTrend,
      topProducts,
      strainBreakdown,
      customerStats,
      categoryBreakdown,
      paymentMethodBreakdown,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
