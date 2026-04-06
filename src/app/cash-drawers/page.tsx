'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Banknote, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface CashSession {
  id: string
  openingFloat: string
  closingFloat: string | null
  openedAt: string
  closedAt: string | null
  deviceName: string | null
  user: { id: string; name: string; email: string }
  branch: { id: string; name: string; code: string }
}

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CashDrawersPage() {
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ take: '50' })
      if (filter === 'open') params.set('open', 'true')
      if (filter === 'closed') params.set('open', 'false')
      const res = await fetch(`/api/cash-sessions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Cash Drawers</h1>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} session${total !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Banknote className="h-12 w-12 mb-4 opacity-40" />
              <p>No cash sessions found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opened By</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Opening Float</TableHead>
                    <TableHead>Closing Float</TableHead>
                    <TableHead>Opened At</TableHead>
                    <TableHead>Closed At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.user.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{s.branch.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.deviceName ?? <span className="italic opacity-50">—</span>}
                      </TableCell>
                      <TableCell className="font-semibold">{formatTHB(s.openingFloat)}</TableCell>
                      <TableCell>
                        {s.closingFloat ? formatTHB(s.closingFloat) : <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(s.openedAt), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.closedAt ? format(new Date(s.closedAt), 'dd MMM yyyy HH:mm') : <span className="italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {s.closedAt ? (
                          <Badge variant="outline">Closed</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Open</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
