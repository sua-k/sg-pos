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
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

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

export default function NewTransferPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  const [form, setForm] = useState({
    productId: '',
    fromBranchId: '',
    toBranchId: '',
    quantity: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
      setForm((prev) => ({ ...prev, fromBranchId: prev.fromBranchId || (user.branchId ?? '') }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  const selectedProduct = products.find((p) => p.id === form.productId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productId || !form.fromBranchId || !form.toBranchId || !form.quantity) {
      setError('All required fields must be filled.')
      return
    }
    if (form.fromBranchId === form.toBranchId) {
      setError('Source and destination branches must be different.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        productId: form.productId,
        fromBranchId: form.fromBranchId,
        toBranchId: form.toBranchId,
        quantity: parseFloat(form.quantity),
        notes: form.notes || undefined,
      }
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create transfer')
      }
      router.push('/transfers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4 max-w-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">New Transfer Request</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.productId} onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Branches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>From Branch <span className="text-destructive">*</span></Label>
                <Select value={form.fromBranchId} onValueChange={(v) => setForm((p) => ({ ...p, fromBranchId: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} <span className="font-mono text-xs text-muted-foreground">({b.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>To Branch <span className="text-destructive">*</span></Label>
                <Select value={form.toBranchId} onValueChange={(v) => setForm((p) => ({ ...p, toBranchId: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select destination branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== form.fromBranchId)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} <span className="font-mono text-xs text-muted-foreground">({b.code})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quantity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Quantity {selectedProduct?.soldByWeight ? '(units)' : ''} <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notes (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
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
              Request Transfer
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
