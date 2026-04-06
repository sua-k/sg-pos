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
import { format } from 'date-fns'
import { useAuth } from '@/components/providers/AuthProvider'

interface Branch {
  id: string
  name: string
  code: string
}

interface Prescriber {
  id: string
  name: string
  licenseNo: string | null
}

interface CustomerResult {
  id: string
  name: string | null
  idNumber: string
}

export default function NewPrescriptionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const threeMonths = format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const [branches, setBranches] = useState<Branch[]>([])
  const [prescribers, setPrescribers] = useState<Prescriber[]>([])
  const [customers, setCustomers] = useState<CustomerResult[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    customerId: '',
    prescriberId: '',
    branchId: user?.branchId ?? '',
    issuedDate: today,
    expiryDate: threeMonths,
    dailyDosageG: '',
    numDays: '',
    totalAllowedG: '',
    diagnosis: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})

    fetch('/api/prescribers?take=100')
      .then((r) => r.json())
      .then((j) => setPrescribers(j.prescribers ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.branchId) {
      setForm((prev) => ({ ...prev, branchId: prev.branchId || (user.branchId ?? '') }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId])

  async function searchCustomers() {
    if (!customerSearch.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/customers?name=${encodeURIComponent(customerSearch)}`)
      const data = await res.json()
      setCustomers(data.customers ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId || !form.branchId || !form.issuedDate || !form.expiryDate) {
      setError('Customer, branch, issued date, and expiry date are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        customerId: form.customerId,
        branchId: form.branchId,
        issuedDate: form.issuedDate,
        expiryDate: form.expiryDate,
      }
      if (form.prescriberId) body.prescriberId = form.prescriberId
      if (form.dailyDosageG) body.dailyDosageG = parseFloat(form.dailyDosageG)
      if (form.numDays) body.numDays = parseInt(form.numDays, 10)
      if (form.totalAllowedG) body.totalAllowedG = parseFloat(form.totalAllowedG)
      if (form.diagnosis) body.diagnosis = form.diagnosis
      if (form.notes) body.notes = form.notes

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create prescription')
      }

      const rx = await res.json()
      router.push(`/prescriptions/${rx.id}`)
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
          <h1 className="text-xl font-bold">New Prescription</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by customer name..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchCustomers())}
                  className="min-h-[44px]"
                />
                <Button type="button" variant="outline" onClick={searchCustomers} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              {customers.length > 0 && (
                <Select value={form.customerId} onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name ?? c.idNumber} {c.name ? `(${c.idNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Prescription Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={form.issuedDate}
                    onChange={(e) => setForm((p) => ({ ...p, issuedDate: e.target.value }))}
                    required
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                    required
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={form.branchId} onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))}>
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

              <div className="space-y-1.5">
                <Label>Prescriber (optional)</Label>
                <Select value={form.prescriberId} onValueChange={(v) => setForm((p) => ({ ...p, prescriberId: v }))}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select prescriber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {prescribers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.licenseNo ? ` — ${p.licenseNo}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Dosage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Dosage (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Daily Dosage (g)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.dailyDosageG}
                    onChange={(e) => setForm((p) => ({ ...p, dailyDosageG: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="90"
                    value={form.numDays}
                    onChange={(e) => setForm((p) => ({ ...p, numDays: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Allowed (g)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="auto"
                    value={form.totalAllowedG}
                    onChange={(e) => setForm((p) => ({ ...p, totalAllowedG: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Diagnosis</Label>
                <Input
                  placeholder="Diagnosis or condition..."
                  value={form.diagnosis}
                  onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>
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
              Create Prescription
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
