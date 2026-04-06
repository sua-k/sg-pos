'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Scale, Play, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface BankTransaction {
  id: string
  date: string
  description: string
  amountTHB: string
  type: string
}

interface ReconciliationMatch {
  id: string
  invoiceId: string
  confidenceScore: string
  status: string
  aiReasoning: string | null
  createdAt: string
  bankTransaction: BankTransaction
}

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function confidenceBadge(score: string) {
  const n = parseFloat(score)
  if (n >= 0.85) return <Badge className="bg-green-100 text-green-800 border-green-200">{(n * 100).toFixed(0)}%</Badge>
  if (n >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{(n * 100).toFixed(0)}%</Badge>
  return <Badge className="bg-red-100 text-red-800 border-red-200">{(n * 100).toFixed(0)}%</Badge>
}

export default function ReconciliationPage() {
  const [matches, setMatches] = useState<ReconciliationMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconciliation?take=200')
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  async function handleRunReconciliation() {
    setRunning(true)
    setRunResult(null)
    setError(null)
    try {
      const res = await fetch('/api/reconciliation/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to run reconciliation')
      setRunResult(`Matched ${data.matched} transactions (${data.autoAccepted} auto-accepted, ${data.pendingReview} pending review)`)
      await fetchMatches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  async function handleAccept(matchId: string) {
    setActionLoading(matchId)
    setError(null)
    try {
      const res = await fetch(`/api/reconciliation/${matchId}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to accept')
      }
      await fetchMatches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(matchId: string) {
    setActionLoading(matchId)
    setError(null)
    try {
      const res = await fetch(`/api/reconciliation/${matchId}/reject`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to reject')
      }
      await fetchMatches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionLoading(null)
    }
  }

  const pending = matches.filter((m) => m.status === 'pending_review')
  const autoMatched = matches.filter((m) => m.status === 'auto_matched')
  const rejected = matches.filter((m) => m.status === 'rejected')

  const stats = {
    total: matches.length,
    pending: pending.length,
    autoMatched: autoMatched.length,
    rejected: rejected.length,
  }

  function MatchesTable({ items, showActions }: { items: ReconciliationMatch[]; showActions?: boolean }) {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Scale className="h-12 w-12 mb-4 opacity-40" />
          <p>No matches in this category</p>
        </div>
      )
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bank Transaction</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>POS Invoice</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>AI Reasoning</TableHead>
            <TableHead>Date</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <div className="font-medium text-sm">{m.bankTransaction.description}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(m.bankTransaction.date), 'dd MMM yyyy')} · {m.bankTransaction.type}
                </div>
              </TableCell>
              <TableCell className="font-semibold">
                {formatTHB(m.bankTransaction.amountTHB)}
              </TableCell>
              <TableCell className="font-mono text-xs">{m.invoiceId}</TableCell>
              <TableCell>{confidenceBadge(m.confidenceScore)}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {m.aiReasoning ?? <span className="italic opacity-50">—</span>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(m.createdAt), 'dd MMM yyyy')}
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => handleAccept(m.id)}
                      disabled={actionLoading === m.id}
                    >
                      {actionLoading === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => handleReject(m.id)}
                      disabled={actionLoading === m.id}
                    >
                      {actionLoading === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Bank Reconciliation
          </h1>
          <Button
            onClick={handleRunReconciliation}
            disabled={running}
            className="min-h-[44px]"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Reconciliation
          </Button>
        </div>

        {runResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {runResult}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Matched</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Pending Review</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Auto-Matched</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold text-green-600">{stats.autoMatched}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">{stats.pending}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="auto_matched">Auto-Matched</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardContent className="p-0">
                  <MatchesTable items={pending} showActions />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auto_matched">
              <Card>
                <CardContent className="p-0">
                  <MatchesTable items={autoMatched} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rejected">
              <Card>
                <CardContent className="p-0">
                  <MatchesTable items={rejected} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  )
}
