'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  sku: string
  soldByWeight: boolean
}

interface Branch {
  id: string
  name: string
  code: string
}

interface LineItem {
  productId: string
  quantity: string
  unitCostTHB: string
  vatIncluded: boolean
  batchNumber: string
  expiryDate: string
  weightGrams: string
}

function calcItem(item: LineItem) {
  const qty = parseFloat(item.quantity) || 0
  const unitCost = parseFloat(item.unitCostTHB) || 0
  const gross = qty * unitCost
  if (item.vatIncluded) {
    const vat = (gross * 7) / 107
    const subtotal = gross - vat
    return { subtotal, vat, total: gross }
  } else {
    const vat = gross * 0.07
    return { subtotal: gross, vat, total: gross + vat }
  }
}

function formatTHB(n: number) {
  return `฿${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const emptyItem = (): LineItem => ({
  productId: '',
  quantity: '',
  unitCostTHB: '',
  vatIncluded: true,
  batchNumber: '',
  expiryDate: '',
  weightGrams: '',
})

export default function NewPurchasePage() {
  const router = useRouter()
  const { user } = useAuth()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/suppliers?take=200')
      .then((r) => r.json())
      .then((j) => setSuppliers(j.suppliers ?? []))
      .catch(() => {})

    fetch('/api/products?take=500')
      .then((r) => r.json())
      .then((j) => setProducts(j.products ?? []))
      .catch(() => {})

    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.branchId) {
      setBranchId((prev) => prev || (user.branchId ?? ''))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = items.reduce(
    (acc, item) => {
      const { subtotal, vat, total } = calcItem(item)
      return { subtotal: acc.subtotal + subtotal, vat: acc.vat + vat, total: acc.total + total }
    },
    { subtotal: 0, vat: 0, total: 0 }
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || !branchId) {
      setError('Supplier and branch are required.')
      return
    }
    const validItems = items.filter((i) => i.productId && i.quantity && i.unitCostTHB)
    if (validItems.length === 0) {
      setError('At least one complete line item is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        supplierId,
        branchId,
        invoiceNumber: invoiceNumber || undefined,
        vatIncluded: items[0]?.vatIncluded ?? true,
        notes: notes || undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unitCostTHB: parseFloat(item.unitCostTHB),
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
          weightGrams: item.weightGrams ? parseFloat(item.weightGrams) : undefined,
        })),
      }
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create purchase')
      }
      const po = await res.json()
      router.push(`/purchases/${po.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">New Purchase Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Supplier <span className="text-destructive">*</span></Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Branch <span className="text-destructive">*</span></Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Number (optional)</Label>
                <Input
                  placeholder="INV-XXXX"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => {
                const { subtotal, vat, total } = calcItem(item)
                const selectedProduct = products.find((p) => p.id === item.productId)
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <Label>Product</Label>
                        <Select value={item.productId} onValueChange={(v) => updateItem(index, { productId: v })}>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} <span className="text-muted-foreground font-mono text-xs">({p.sku})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: e.target.value })}
                          className="min-h-[44px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Unit Cost (THB)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitCostTHB}
                          onChange={(e) => updateItem(index, { unitCostTHB: e.target.value })}
                          className="min-h-[44px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>VAT</Label>
                        <Select
                          value={item.vatIncluded ? 'included' : 'excluded'}
                          onValueChange={(v) => updateItem(index, { vatIncluded: v === 'included' })}
                        >
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="included">Included (7%)</SelectItem>
                            <SelectItem value="excluded">Excluded (+ 7%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Batch Number (optional)</Label>
                        <Input
                          placeholder="BATCH-XXX"
                          value={item.batchNumber}
                          onChange={(e) => updateItem(index, { batchNumber: e.target.value })}
                          className="min-h-[44px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Expiry Date (optional)</Label>
                        <Input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, { expiryDate: e.target.value })}
                          className="min-h-[44px]"
                        />
                      </div>

                      {selectedProduct?.soldByWeight && (
                        <div className="space-y-1.5">
                          <Label>Weight (grams)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.weightGrams}
                            onChange={(e) => updateItem(index, { weightGrams: e.target.value })}
                            className="min-h-[44px]"
                          />
                        </div>
                      )}
                    </div>

                    {(item.productId && item.quantity && item.unitCostTHB) && (
                      <div className="flex gap-6 text-xs text-muted-foreground border-t pt-3">
                        <span>Subtotal: {formatTHB(subtotal)}</span>
                        <span>VAT: {formatTHB(vat)}</span>
                        <span className="font-semibold text-foreground">Total: {formatTHB(total)}</span>
                      </div>
                    )}
                  </div>
                )
              })}

              <Button type="button" variant="outline" onClick={addItem} className="w-full min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              {totals.total > 0 && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatTHB(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (7%)</span>
                    <span>{formatTHB(totals.vat)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-1.5">
                    <span>Grand Total</span>
                    <span>{formatTHB(totals.total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notes (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[44px]"
              />
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
