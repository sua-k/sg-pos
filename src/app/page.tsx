'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'
import { ExpiryAlert } from '@/components/dashboard/ExpiryAlert'
import { useAuth } from '@/components/providers/AuthProvider'
import { DollarSign, TrendingUp, Package, AlertTriangle, Receipt } from 'lucide-react'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────

interface DashboardMetrics {
  revenue: string
  vat: string
  cogs: string
  grossProfit: string
  grossMargin: string
  transactionCount: number
}

interface LowStockItem {
  id: string
  productName: string
  sku: string
  branchName: string
  quantity: string
}

interface ExpiringProduct {
  id: string
  name: string
  sku: string
  expiryDate?: string
  batchNumber: string | null
}

interface RecentTransaction {
  id: string
  receiptNumber: string
  totalTHB: string
  status: string
  paymentMethod: string
  customerName: string
  cashierName: string
  branchName: string
  createdAt: string
}

interface DashboardData {
  metrics: DashboardMetrics
  lowStock: LowStockItem[]
  expiringProducts: ExpiringProduct[]
  recentTransactions: RecentTransaction[]
}

// ── Helpers ────────────────────────────────────────

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDateRange(preset: string): { from: string; to: string } {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'week': {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      return { from: format(weekStart, 'yyyy-MM-dd'), to: todayStr }
    }
    case 'month': {
      const monthStart = startOfMonth(today)
      return { from: format(monthStart, 'yyyy-MM-dd'), to: todayStr }
    }
    default:
      return { from: todayStr, to: todayStr }
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed': return 'default'
    case 'voided': return 'destructive'
    case 'refunded': return 'secondary'
    default: return 'outline'
  }
}

// ── Skeleton ───────────────────────────────────────

function MetricSkeleton() {
  return (
    <Card className="relative overflow-hidden animate-pulse">
      <div className="absolute left-0 top-0 h-full w-1 bg-muted" />
      <CardContent className="pl-6 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-16" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-lg shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [datePreset, setDatePreset] = useState('today')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isStaff = user?.role === 'staff'

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { from, to } = getDateRange(datePreset)
      const params = new URLSearchParams({ from, to })
      if (isStaff && user?.branchId) {
        params.set('branchId', user.branchId)
      }

      const res = await fetch(`/api/dashboard?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to load dashboard data')
      }
      const json: DashboardData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [datePreset, isStaff, user?.branchId])

  // Initial fetch + re-fetch on filter change
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60_000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  const metrics = data?.metrics

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {!loading && metrics && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {metrics.transactionCount} transaction{metrics.transactionCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-36 min-h-[40px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading || !metrics ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Revenue (ex-VAT)"
                value={formatTHB(metrics.revenue)}
                subtitle={`+VAT ${formatTHB(metrics.vat)}`}
                icon={<DollarSign className="h-5 w-5" />}
                color="green"
              />
              <MetricCard
                title="COGS"
                value={formatTHB(metrics.cogs)}
                subtitle="Cost of goods sold"
                icon={<Package className="h-5 w-5" />}
                color="orange"
              />
              <MetricCard
                title="Gross Profit"
                value={formatTHB(metrics.grossProfit)}
                subtitle="Revenue minus COGS"
                icon={<TrendingUp className="h-5 w-5" />}
                color="blue"
              />
              <MetricCard
                title="Gross Margin"
                value={`${metrics.grossMargin}%`}
                subtitle="Profit / Revenue"
                icon={<AlertTriangle className="h-5 w-5" />}
                color="purple"
              />
            </>
          )}
        </div>

        {/* Two-column layout: Alerts + Recent Transactions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Alerts */}
          <div className="space-y-4">
            <LowStockAlert items={data?.lowStock ?? []} />
            <ExpiryAlert products={data?.expiringProducts ?? []} />
          </div>

          {/* RIGHT: Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-green-600" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-6 py-3 animate-pulse">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 bg-muted rounded w-28" />
                          <div className="h-3 bg-muted rounded w-20" />
                        </div>
                        <div className="h-5 bg-muted rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !data?.recentTransactions.length ? (
                <div className="px-6 pb-6 text-center text-sm text-muted-foreground py-4">
                  No recent transactions
                </div>
              ) : (
                <div className="divide-y">
                  {data.recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between px-6 py-3 gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/transactions/${txn.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{txn.receiptNumber}</p>
                          <Badge
                            variant={getStatusBadgeVariant(txn.status)}
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            {txn.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {txn.customerName} · {txn.cashierName} · {txn.paymentMethod}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatTHB(txn.totalTHB)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.createdAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
