'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Package, AlertTriangle, Plus } from 'lucide-react'

interface Branch {
  id: string
  name: string
  code: string
}

interface InventoryItem {
  id: string
  quantity: string
  product: {
    id: string
    name: string
    sku: string
    category: { id: string; name: string } | null
  }
  branch: { id: string; name: string; code: string }
}

function formatQty(q: string): string {
  const n = parseFloat(q)
  return n % 1 === 0 ? n.toString() : n.toFixed(3)
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [category, setCategory] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [search, setSearch] = useState('')

  // Adjustment dialog
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<{ id: string; name: string } | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState<string>('correction')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Receive Stock dialog
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveProductId, setReceiveProductId] = useState('')
  const [receiveQty, setReceiveQty] = useState('')
  const [receiveUnitCost, setReceiveUnitCost] = useState('')
  const [receiveBatch, setReceiveBatch] = useState('')
  const [receiveExpiry, setReceiveExpiry] = useState('')
  const [receiveSaving, setReceiveSaving] = useState(false)
  const [receiveError, setReceiveError] = useState('')
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([])

  const isManager = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.branches ?? []))
    fetch('/api/products?take=500')
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).map((p: { id: string; name: string; sku: string }) => ({ id: p.id, name: p.name, sku: p.sku }))))
      .catch(() => {})
  }, [])

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (branchId) params.set('branchId', branchId)
      if (category) params.set('category', category)
      if (lowStock) params.set('lowStock', 'true')
      if (search) params.set('search', search)
      params.set('take', '200')

      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInventory(data.inventory)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [branchId, category, lowStock, search])

  useEffect(() => {
    const timeout = setTimeout(fetchInventory, 300)
    return () => clearTimeout(timeout)
  }, [fetchInventory])

  function openAdjustDialog(product: { id: string; name: string }) {
    setAdjustProduct(product)
    setAdjustQty('')
    setAdjustReason('correction')
    setAdjustNotes('')
    setAdjustOpen(true)
  }

  async function handleAdjust() {
    if (!adjustProduct || !adjustQty) return
    setAdjusting(true)
    try {
      const effectiveBranch = branchId || user?.branchId
      if (!effectiveBranch) return

      const res = await fetch(`/api/products/${adjustProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: effectiveBranch,
          quantity: parseFloat(adjustQty),
          reason: adjustReason,
          notes: adjustNotes || undefined,
        }),
      })
      if (res.ok) {
        setAdjustOpen(false)
        fetchInventory()
      }
    } finally {
      setAdjusting(false)
    }
  }

  function openReceiveDialog() {
    setReceiveProductId('')
    setReceiveQty('')
    setReceiveUnitCost('')
    setReceiveBatch('')
    setReceiveExpiry('')
    setReceiveError('')
    setReceiveOpen(true)
  }

  async function handleReceiveStock() {
    if (!receiveProductId || !receiveQty) {
      setReceiveError('Product and quantity are required')
      return
    }
    const qty = parseFloat(receiveQty)
    if (qty <= 0) {
      setReceiveError('Quantity must be positive')
      return
    }
    setReceiveSaving(true)
    setReceiveError('')
    try {
      const effectiveBranch = branchId || user?.branchId
      if (!effectiveBranch) {
        setReceiveError('No branch selected')
        return
      }

      const notes = [
        receiveUnitCost ? `Unit cost: ${receiveUnitCost} THB` : '',
        receiveBatch ? `Batch: ${receiveBatch}` : '',
        receiveExpiry ? `Expiry: ${receiveExpiry}` : '',
      ].filter(Boolean).join(', ')

      const res = await fetch(`/api/products/${receiveProductId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: effectiveBranch,
          quantity: qty,
          reason: 'received',
          notes: notes || undefined,
        }),
      })
      if (res.ok) {
        setReceiveOpen(false)
        fetchInventory()
      } else {
        const data = await res.json()
        setReceiveError(data.error ?? 'Failed to receive stock')
      }
    } catch {
      setReceiveError('Failed to receive stock')
    } finally {
      setReceiveSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${total} record${total !== 1 ? 's' : ''}`}
            </p>
            {isManager && (
              <Button onClick={openReceiveDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Receive Stock
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          {user?.role === 'admin' && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-[180px] min-h-[44px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px] min-h-[44px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="Flowers">Flowers</SelectItem>
              <SelectItem value="Edibles">Edibles</SelectItem>
              <SelectItem value="CBD Oil">CBD Oil</SelectItem>
              <SelectItem value="Beverages">Beverages</SelectItem>
              <SelectItem value="Papers">Papers</SelectItem>
              <SelectItem value="Bongs & Pipes">Bongs & Pipes</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={lowStock ? 'default' : 'outline'}
            onClick={() => setLowStock(!lowStock)}
            className="min-h-[44px]"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Low Stock
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={isManager ? 6 : 5}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isManager ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No inventory records found
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const qty = parseFloat(item.quantity)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.product.sku}</TableCell>
                        <TableCell>
                          {item.product.category ? (
                            <Badge variant="secondary">{item.product.category.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{item.branch.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={qty <= 0 ? 'destructive' : qty <= 10 ? 'outline' : 'secondary'}>
                            {formatQty(item.quantity)}
                          </Badge>
                        </TableCell>
                        {isManager && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustDialog(item.product)}
                            >
                              Adjust
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock: {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantity (+/-)</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="e.g. 10 or -5"
                className="min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground">
                Positive to add stock, negative to remove
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received / Restock</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="waste">Waste</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={adjusting || !adjustQty}>
              {adjusting ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {receiveError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {receiveError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={receiveProductId} onValueChange={setReceiveProductId}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                placeholder="Units received"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost (THB)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={receiveUnitCost}
                onChange={(e) => setReceiveUnitCost(e.target.value)}
                placeholder="Cost per unit"
                className="min-h-[44px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={receiveBatch}
                  onChange={(e) => setReceiveBatch(e.target.value)}
                  placeholder="e.g. LOT-2024-001"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={receiveExpiry}
                  onChange={(e) => setReceiveExpiry(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceiveStock} disabled={receiveSaving || !receiveProductId || !receiveQty}>
              {receiveSaving ? 'Receiving...' : 'Receive Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
