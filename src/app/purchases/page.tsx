'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { ShoppingBag, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Purchase {
  id: string
  invoiceNumber: string | null
  totalTHB: string
  status: string
  purchaseDate: string
  supplier: { id: string; name: string }
  branch: { id: string; name: string; code: string }
  user: { id: string; name: string }
  items: { id: string; product: { id: string; name: string; sku: string } }[]
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ordered: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <Badge variant="outline" className={map[status] ?? ''}>
      {status}
    </Badge>
  )
}

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PurchasesPage() {
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('all')

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ take: '50' })
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/purchases?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPurchases(data.purchases ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Purchases
          </h1>
          <Link href="/purchases/new">
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="ordered">Ordered</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} purchase order${total !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : purchases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-4 opacity-40" />
              <p>No purchase orders found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((po) => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/purchases/${po.id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {po.invoiceNumber ?? <span className="italic text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-medium">{po.supplier.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {po.items.length} item{po.items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="font-semibold">{formatTHB(po.totalTHB)}</TableCell>
                      <TableCell>{statusBadge(po.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(po.purchaseDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {po.branch.code}
                        </Badge>
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
