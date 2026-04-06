'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeftRight, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Transfer {
  id: string
  quantity: string
  status: string
  notes: string | null
  createdAt: string
  product: { id: string; name: string; sku: string }
  fromBranch: { id: string; name: string; code: string }
  toBranch: { id: string; name: string; code: string }
  initiatedBy: { id: string; name: string }
  approvedBy: { id: string; name: string } | null
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <Badge variant="outline" className={map[status] ?? ''}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('all')

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ take: '50' })
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/transfers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTransfers(data.transfers ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" />
            Stock Transfers
          </h1>
          <Link href="/transfers/new">
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </Link>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} transfer${total !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ArrowLeftRight className="h-12 w-12 mb-4 opacity-40" />
              <p>No transfers found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Initiated By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <div>{t.product.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{t.product.sku}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{t.fromBranch.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{t.toBranch.code}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{parseFloat(t.quantity).toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.initiatedBy.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(t.createdAt), 'dd MMM yyyy')}
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
