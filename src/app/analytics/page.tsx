'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/AuthProvider'
import { BarChart3, Download, Users, TrendingUp, Leaf } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'

// ── Types ───────────────────────────────────────────────────────────────────

interface RevenueTrendRow {
  date: string
  revenue: string
  cogs: string
  grossProfit: string
}

interface TopProduct {
  id: string
  name: string
  sku: string
  qtySold: string
  revenue: string
  margin: string
}

interface StrainBreakdown {
  strain: string
  revenue: string
  percentage: string
}

interface CustomerStats {
  totalCustomers: number
  repeatCustomers: number
  avgSpend: string
  newThisPeriod: number
}

interface CategoryBreakdown {
  id: string
  name: string
  revenue: string
}

interface PaymentBreakdown {
  method: string
  count: number
  total: string
}

interface AnalyticsData {
  revenueTrend: RevenueTrendRow[]
  topProducts: TopProduct[]
  strainBreakdown: StrainBreakdown[]
  customerStats: CustomerStats
  categoryBreakdown: CategoryBreakdown[]
  paymentMethodBreakdown: PaymentBreakdown[]
}

interface Branch {
  id: string
  name: string
  code: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function strainLabel(strain: string): string {
  const labels: Record<string, string> = {
    indica: 'Indica',
    sativa: 'Sativa',
    hybrid: 'Hybrid',
    other: 'Other',
  }
  return labels[strain] ?? strain
}

function strainColor(strain: string): string {
  const colors: Record<string, string> = {
    indica: 'bg-purple-100 text-purple-800 border-purple-200',
    sativa: 'bg-orange-100 text-orange-800 border-orange-200',
    hybrid: 'bg-green-100 text-green-800 border-green-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[strain] ?? 'bg-gray-100 text-gray-800 border-gray-200'
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [branchId, setBranchId] = useState<string>('all')
  const [branches, setBranches] = useState<Branch[]>([])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Fetch branch list
  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (branchId && branchId !== 'all') params.set('branchId', branchId)

      const res = await fetch(`/api/analytics?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json: AnalyticsData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, branchId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  async function handleExportVat() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (branchId && branchId !== 'all') params.set('branchId', branchId)
      const res = await fetch(`/api/reports/vat/export?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vat-report-${startDate}-to-${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Only admin/manager can see this page
  if (user && user.role === 'staff') {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Access restricted to managers and administrators.
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Revenue, products, and customer insights
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportVat}
            disabled={exporting || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export VAT CSV'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {branches.length > 0 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ── Revenue Trend Table ──────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Revenue Trend (Daily)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : !data?.revenueTrend.length ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Revenue (ex-VAT)</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">COGS</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Gross Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.revenueTrend.map((row) => (
                      <tr key={row.date} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs">{row.date}</td>
                        <td className="px-6 py-3 text-right">{formatTHB(row.revenue)}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{formatTHB(row.cogs)}</td>
                        <td className="px-6 py-3 text-right font-medium text-green-700">
                          {formatTHB(row.grossProfit)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    {data.revenueTrend.length > 1 && (
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-6 py-3">Total</td>
                        <td className="px-6 py-3 text-right">
                          {formatTHB(
                            data.revenueTrend
                              .reduce((s, r) => s + parseFloat(r.revenue), 0)
                              .toFixed(2)
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {formatTHB(
                            data.revenueTrend
                              .reduce((s, r) => s + parseFloat(r.cogs), 0)
                              .toFixed(2)
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-green-700">
                          {formatTHB(
                            data.revenueTrend
                              .reduce((s, r) => s + parseFloat(r.grossProfit), 0)
                              .toFixed(2)
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Two-column: Customer Stats + Payment Methods ────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Customer Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-600" />
                Customer Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <div className="grid grid-cols-2 gap-4 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                      <div className="h-3 bg-muted rounded w-20" />
                      <div className="h-6 bg-muted rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold mt-1">{data.customerStats.totalCustomers}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Repeat Customers</p>
                    <p className="text-2xl font-bold mt-1">{data.customerStats.repeatCustomers}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Avg Spend / Txn</p>
                    <p className="text-2xl font-bold mt-1">{formatTHB(data.customerStats.avgSpend)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">New This Period</p>
                    <p className="text-2xl font-bold mt-1">{data.customerStats.newThisPeriod}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              ) : !data.paymentMethodBreakdown.length ? (
                <p className="text-sm text-muted-foreground">No payment data</p>
              ) : (
                <div className="space-y-3">
                  {data.paymentMethodBreakdown.map((pm) => (
                    <div key={pm.method} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {pm.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{pm.count} txn{pm.count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="font-medium text-sm">{formatTHB(pm.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Strain Breakdown ─────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            Strain Breakdown
          </h2>
          {loading || !data ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-5 space-y-2">
                  <div className="h-4 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-10" />
                </div>
              ))}
            </div>
          ) : !data.strainBreakdown.length ? (
            <p className="text-sm text-muted-foreground">No strain data for this period</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.strainBreakdown
                .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
                .map((s) => (
                  <div
                    key={s.strain}
                    className={`rounded-lg border p-5 ${strainColor(s.strain)}`}
                  >
                    <p className="text-sm font-semibold">{strainLabel(s.strain)}</p>
                    <p className="text-xl font-bold mt-2">{formatTHB(s.revenue)}</p>
                    <p className="text-sm mt-1 opacity-70">{s.percentage}% of strain sales</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Top Products ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : !data?.topProducts.length ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No product sales in this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">SKU</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Qty Sold</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.topProducts.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-6 py-3 font-medium">{p.name}</td>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                        <td className="px-6 py-3 text-right">{parseFloat(p.qtySold).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatTHB(p.revenue)}</td>
                        <td className="px-6 py-3 text-right">
                          <span
                            className={
                              parseFloat(p.margin) >= 30
                                ? 'text-green-700 font-medium'
                                : parseFloat(p.margin) >= 10
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }
                          >
                            {p.margin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Category Breakdown ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : !data?.categoryBreakdown.length ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No category data for this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Revenue (ex-VAT)</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const total = data.categoryBreakdown.reduce(
                        (s, c) => s + parseFloat(c.revenue),
                        0
                      )
                      return data.categoryBreakdown.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3 font-medium">{c.name}</td>
                          <td className="px-6 py-3 text-right">{formatTHB(c.revenue)}</td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            {total > 0
                              ? ((parseFloat(c.revenue) / total) * 100).toFixed(1)
                              : '0.0'}
                            %
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
