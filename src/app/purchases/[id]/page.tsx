'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { ArrowLeft, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface PurchaseItem {
  id: string
  quantity: string
  unitCostTHB: string
  subtotalTHB: string
  vatTHB: string
  totalTHB: string
  batchNumber: string | null
  expiryDate: string | null
  product: { id: string; name: string; sku: string }
}

interface Purchase {
  id: string
  invoiceNumber: string | null
  status: string
  vatIncluded: boolean
  subtotalTHB: string
  vatTHB: string
  totalTHB: string
  purchaseDate: string
  notes: string | null
  supplier: { id: string; name: string }
  branch: { id: string; name: string; code: string }
  user: { id: string; name: string; email: string }
  items: PurchaseItem[]
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
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

export default function PurchaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchase = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/purchases/${id}`)
      if (res.ok) {
        const data = await res.json()
        setPurchase(data)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to load purchase')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPurchase()
  }, [fetchPurchase])

  async function handleConfirm() {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to confirm purchase')
      }
      await fetchPurchase()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this purchase order?')) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/${id}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to cancel purchase')
      }
      await fetchPurchase()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReceive() {
    if (!confirm('Mark this purchase as received? This will update inventory.')) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/${id}/receive`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to mark as received')
      }
      await fetchPurchase()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </AppShell>
    )
  }

  if (!purchase) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-muted-foreground">Purchase not found.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            {purchase.invoiceNumber ?? 'Purchase Order'}
          </h1>
          {statusBadge(purchase.status)}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Supplier</dt>
                <dd className="font-medium">{purchase.supplier.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Branch</dt>
                <dd>
                  <Badge variant="outline" className="font-mono text-xs">
                    {purchase.branch.code}
                  </Badge>
                  <span className="ml-2">{purchase.branch.name}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created By</dt>
                <dd>{purchase.user.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">VAT</dt>
                <dd>{purchase.vatIncluded ? 'Included' : 'Excluded'}</dd>
              </div>
              {purchase.notes && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{purchase.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.product.sku}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.quantity).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{formatTHB(item.unitCostTHB)}</TableCell>
                    <TableCell className="text-right">{formatTHB(item.subtotalTHB)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTHB(item.vatTHB)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatTHB(item.totalTHB)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.batchNumber ?? <span className="italic opacity-50">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.expiryDate
                        ? format(new Date(item.expiryDate), 'dd MMM yyyy')
                        : <span className="italic opacity-50">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatTHB(purchase.subtotalTHB)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (7%)</span>
                <span>{formatTHB(purchase.vatTHB)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-1.5">
                <span>Grand Total</span>
                <span>{formatTHB(purchase.totalTHB)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {purchase.status === 'draft' && (
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading}
              className="min-h-[44px]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Order
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="min-h-[44px]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Order
            </Button>
          </div>
        )}

        {purchase.status === 'confirmed' && (
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading}
              className="min-h-[44px]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Order
            </Button>
            <Button
              onClick={handleReceive}
              disabled={actionLoading}
              className="min-h-[44px]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mark Received
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
