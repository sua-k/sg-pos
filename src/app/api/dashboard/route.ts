import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import Decimal from 'decimal.js'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    // Date range: default to today
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]
    const branchId = searchParams.get('branchId') || (user.role === 'staff' ? user.branchId : null)

    const startDate = new Date(from)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(to)
    endDate.setHours(23, 59, 59, 999)

    const branchFilter = branchId ? { branchId } : {}

    // 1. Revenue + COGS from completed transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
        ...branchFilter,
      },
      include: {
        items: true,
      },
    })

    // Calculate totals using decimal.js
    let revenue = new Decimal(0)     // subtotalTHB (ex-VAT)
    let totalVat = new Decimal(0)
    let totalCogs = new Decimal(0)

    for (const txn of transactions) {
      revenue = revenue.plus(new Decimal(txn.subtotalTHB.toString()))
      totalVat = totalVat.plus(new Decimal(txn.vatTHB.toString()))
      for (const item of txn.items) {
        totalCogs = totalCogs.plus(new Decimal(item.cogsTHB.toString()))
      }
    }

    const grossProfit = revenue.minus(totalCogs)
    const grossMargin = revenue.gt(0)
      ? grossProfit.div(revenue).mul(100).toDecimalPlaces(1)
      : new Decimal(0)

    // 2. Transaction count
    const transactionCount = transactions.length

    // 3. Low stock alerts (below threshold)
    const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '10')
    const lowStock = await prisma.inventory.findMany({
      where: {
        quantity: { lt: lowStockThreshold },
        ...(branchId ? { branchId } : {}),
      },
      include: { product: true, branch: true },
      take: 10,
    })

    // 4. Expiry alerts (within 30 days)
    const expiryDays = parseInt(process.env.EXPIRY_ALERT_DAYS || '30')
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiryDays)
    const expiringProducts = await prisma.product.findMany({
      where: {
        expiryDate: { lte: expiryDate, gte: new Date() },
      },
      take: 10,
      orderBy: { expiryDate: 'asc' },
    })

    // 5. Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { ...branchFilter },
      include: { customer: true, user: true, branch: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      metrics: {
        revenue: revenue.toFixed(2),
        vat: totalVat.toFixed(2),
        cogs: totalCogs.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMargin: grossMargin.toFixed(1),
        transactionCount,
      },
      lowStock: lowStock.map(inv => ({
        id: inv.id,
        productName: inv.product.name,
        sku: inv.product.sku,
        branchName: inv.branch.name,
        quantity: inv.quantity.toString(),
      })),
      expiringProducts: expiringProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        expiryDate: p.expiryDate?.toISOString(),
        batchNumber: p.batchNumber,
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        receiptNumber: t.receiptNumber,
        totalTHB: t.totalTHB.toString(),
        status: t.status,
        paymentMethod: t.paymentMethod,
        customerName: t.customer.name || 'Walk-in',
        cashierName: t.user.name,
        branchName: t.branch.name,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
