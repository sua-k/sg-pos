'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/AuthProvider'
import { ClipboardList, Printer } from 'lucide-react'
import { format } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string
  name: string
  code: string
}

interface ReportSummary {
  totalTransactions: number
  totalRevenue: string
  totalVAT: string
  totalSubtotal: string
  totalDiscount: string
  totalCOGS: string
  grossProfit: string
  grossMargin: string
}

interface PaymentMethodEntry {
  count: number
  total: string
}

interface CategoryRow {
  category: string
  count: number
  revenue: string
}

interface CashSessionData {
  openingFloat: string
  expectedCash: string | null
  actualCash: string | null
  discrepancy: string | null
}

interface TopProduct {
  name: string
  quantity: string
  revenue: string
}

interface DailyReport {
  date: string
  branch: { name: string; code: string } | null
  summary: ReportSummary
  byPaymentMethod: Record<string, PaymentMethodEntry>
  byCategory: CategoryRow[]
  cashSession: CashSessionData | null
  voidedTransactions: number
  topProducts: TopProduct[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTHB(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDiscrepancy(amount: string | null | undefined): string {
  if (!amount) return '—'
  const num = parseFloat(amount)
  const abs = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (num < 0) return `-฿${abs}`
  if (num > 0) return `+฿${abs}`
  return '฿0.00'
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = { cash: 'Cash', card: 'Card', transfer: 'Transfer' }
  return labels[method] ?? method
}

// ── Today in Bangkok time ─────────────────────────────────────────────────────

function getTodayBangkok(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return now.toISOString().split('T')[0]
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  const { user } = useAuth()
  const [date, setDate] = useState(getTodayBangkok())
  const [branchId, setBranchId] = useState<string>('all')
  const [branches, setBranches] = useState<Branch[]>([])
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const params = new URLSearchParams({ date })
      if (branchId && branchId !== 'all') params.set('branchId', branchId)
      const res = await fetch(`/api/reports/daily?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load report')
      const json: DailyReport = await res.json()
      setReport(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [date, branchId])

  if (user && user.role === 'staff') {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Access restricted to managers and admins.
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; inset: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Controls */}
        <div className="no-print flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <ClipboardList className="h-6 w-6" />
              Daily Closing Report
            </h1>
            <p className="text-muted-foreground text-sm">Generate end-of-day sales summary</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="no-print">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium" htmlFor="date-picker">Date</label>
                <input
                  id="date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium">Branch</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchReport} disabled={loading} className="h-10 px-6">
                {loading ? 'Generating…' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="no-print rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {report && (
          <>
            {/* Print button */}
            <div className="no-print flex justify-end">
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            </div>

            {/* Printable Report Body */}
            <div id="printable-report" className="space-y-6 font-mono text-sm">
              {/* Title */}
              <Card>
                <CardContent className="pt-6 pb-4">
                  <div className="text-center space-y-1 border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold tracking-wide">Daily Sales Report</h2>
                    <p className="text-muted-foreground">
                      {report.branch
                        ? `Branch: ${report.branch.name} (${report.branch.code})`
                        : 'All Branches'}{' '}
                      | Date: {formatDate(report.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>

                  {/* SUMMARY */}
                  <section className="mb-6">
                    <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                      Summary
                    </h3>
                    <div className="space-y-1.5">
                      <Row label="Transactions" value={String(report.summary.totalTransactions)} />
                      <Row label="Revenue (incl. VAT)" value={formatTHB(report.summary.totalRevenue)} bold />
                      <Row label="VAT (7%)" value={formatTHB(report.summary.totalVAT)} />
                      <Row label="Subtotal (ex. VAT)" value={formatTHB(report.summary.totalSubtotal)} />
                      <Row label="Discount" value={formatTHB(report.summary.totalDiscount)} />
                      <Row label="COGS" value={formatTHB(report.summary.totalCOGS)} />
                      <Row label="Gross Profit" value={formatTHB(report.summary.grossProfit)} bold />
                      <Row label="Gross Margin" value={`${report.summary.grossMargin}%`} bold />
                      {report.voidedTransactions > 0 && (
                        <Row
                          label="Voided Transactions"
                          value={String(report.voidedTransactions)}
                          highlight
                        />
                      )}
                    </div>
                  </section>

                  {/* BY PAYMENT METHOD */}
                  <section className="mb-6">
                    <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                      By Payment Method
                    </h3>
                    <div className="space-y-1.5">
                      {Object.entries(report.byPaymentMethod).map(([method, { count, total }]) => (
                        <div key={method} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {paymentLabel(method)}
                          </span>
                          <span>
                            <span className="text-muted-foreground mr-4">
                              {count} {count === 1 ? 'transaction' : 'transactions'}
                            </span>
                            <span className="font-medium tabular-nums">{formatTHB(total)}</span>
                          </span>
                        </div>
                      ))}
                      {Object.keys(report.byPaymentMethod).length === 0 && (
                        <p className="text-muted-foreground">No transactions</p>
                      )}
                    </div>
                  </section>

                  {/* BY CATEGORY */}
                  <section className="mb-6">
                    <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                      By Category
                    </h3>
                    <div className="space-y-1.5">
                      {report.byCategory.map((cat) => (
                        <div key={cat.category} className="flex justify-between">
                          <span className="text-muted-foreground">{cat.category}</span>
                          <span>
                            <span className="text-muted-foreground mr-4">
                              {cat.count} {cat.count === 1 ? 'item' : 'items'}
                            </span>
                            <span className="font-medium tabular-nums">{formatTHB(cat.revenue)}</span>
                          </span>
                        </div>
                      ))}
                      {report.byCategory.length === 0 && (
                        <p className="text-muted-foreground">No data</p>
                      )}
                    </div>
                  </section>

                  {/* CASH RECONCILIATION */}
                  {report.cashSession ? (
                    <section className="mb-6">
                      <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                        Cash Reconciliation
                      </h3>
                      <div className="space-y-1.5">
                        <Row label="Opening Float" value={formatTHB(report.cashSession.openingFloat)} />
                        <Row
                          label="Cash Sales"
                          value={formatTHB(report.byPaymentMethod['cash']?.total ?? '0')}
                        />
                        <Row label="Expected Cash" value={formatTHB(report.cashSession.expectedCash)} />
                        <Row label="Actual Cash" value={formatTHB(report.cashSession.actualCash)} />
                        <Row
                          label="Discrepancy"
                          value={formatDiscrepancy(report.cashSession.discrepancy)}
                          highlight={
                            report.cashSession.discrepancy !== null &&
                            parseFloat(report.cashSession.discrepancy) !== 0
                          }
                          bold
                        />
                      </div>
                    </section>
                  ) : (
                    <section className="mb-6">
                      <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                        Cash Reconciliation
                      </h3>
                      <p className="text-muted-foreground">No cash session found for this date.</p>
                    </section>
                  )}

                  {/* TOP PRODUCTS */}
                  <section>
                    <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-3 border-b pb-1">
                      Top Products
                    </h3>
                    <div className="space-y-1.5">
                      {report.topProducts.map((p, i) => (
                        <div key={p.name} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {i + 1}. {p.name}
                          </span>
                          <span>
                            <span className="text-muted-foreground mr-4">
                              {parseFloat(p.quantity).toFixed(2)}g
                            </span>
                            <span className="font-medium tabular-nums">{formatTHB(p.revenue)}</span>
                          </span>
                        </div>
                      ))}
                      {report.topProducts.length === 0 && (
                        <p className="text-muted-foreground">No products sold</p>
                      )}
                    </div>
                  </section>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!report && !loading && !error && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Select a date and branch, then click Generate Report.
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold = false,
  highlight = false,
}: {
  label: string
  value: string
  bold?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={[
          'tabular-nums',
          bold ? 'font-semibold' : '',
          highlight ? 'text-destructive' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
