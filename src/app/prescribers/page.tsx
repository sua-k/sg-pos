'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Stethoscope, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Prescriber {
  id: string
  name: string
  licenseNo: string
  licenseType: string | null
  professionType: string
  address: string | null
  phone: string | null
}

const PROFESSION_LABELS: Record<string, string> = {
  medical: 'Medical Doctor',
  thai_traditional: 'Thai Traditional',
  thai_applied: 'Thai Applied',
  dental: 'Dental',
  pharmacy: 'Pharmacy',
  chinese_medicine: 'Chinese Medicine',
  folk_healer: 'Folk Healer',
}

const PROFESSION_OPTIONS = [
  { value: 'medical', label: 'Medical Doctor' },
  { value: 'thai_traditional', label: 'Thai Traditional' },
  { value: 'thai_applied', label: 'Thai Applied' },
  { value: 'dental', label: 'Dental' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'chinese_medicine', label: 'Chinese Medicine' },
  { value: 'folk_healer', label: 'Folk Healer' },
]

export default function PrescribersPage() {
  const [prescribers, setPrescribers] = useState<Prescriber[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formLicenseNo, setFormLicenseNo] = useState('')
  const [formLicenseType, setFormLicenseType] = useState('')
  const [formProfessionType, setFormProfessionType] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formPhone, setFormPhone] = useState('')

  const fetchPrescribers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('take', '100')

      const res = await fetch(`/api/prescribers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPrescribers(data.prescribers)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(fetchPrescribers, 300)
    return () => clearTimeout(timeout)
  }, [fetchPrescribers])

  function resetForm() {
    setFormName('')
    setFormLicenseNo('')
    setFormLicenseType('')
    setFormProfessionType('')
    setFormAddress('')
    setFormPhone('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName || !formLicenseNo || !formProfessionType) return

    setSaving(true)
    try {
      const res = await fetch('/api/prescribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          licenseNo: formLicenseNo,
          licenseType: formLicenseType || null,
          professionType: formProfessionType,
          address: formAddress || null,
          phone: formPhone || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to create prescriber')
        return
      }

      toast.success('Prescriber created successfully')
      setDialogOpen(false)
      resetForm()
      fetchPrescribers()
    } catch {
      toast.error('Failed to create prescriber')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Prescribers</h1>
          <Button
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Prescriber
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or license number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} prescriber${total !== 1 ? 's' : ''}`}
        </p>

        {!loading && prescribers.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>License No.</TableHead>
                    <TableHead>Profession</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescribers.map((p) => (
                    <TableRow key={p.id} className="min-h-[44px]">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm">{p.licenseNo}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PROFESSION_LABELS[p.professionType] ?? p.professionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.phone ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && prescribers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Stethoscope className="h-12 w-12 mb-4 opacity-40" />
              <p>No prescribers found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Prescriber Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prescriber</DialogTitle>
            <DialogDescription>
              Register a new prescriber for prescription issuance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Dr. Somchai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNo">License No. *</Label>
              <Input
                id="licenseNo"
                value={formLicenseNo}
                onChange={(e) => setFormLicenseNo(e.target.value)}
                placeholder="12345"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="professionType">Profession Type *</Label>
              <Select value={formProfessionType} onValueChange={setFormProfessionType}>
                <SelectTrigger id="professionType">
                  <SelectValue placeholder="Select profession" />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseType">License Type</Label>
              <Input
                id="licenseType"
                value={formLicenseType}
                onChange={(e) => setFormLicenseType(e.target.value)}
                placeholder="e.g. ว."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formName || !formLicenseNo || !formProfessionType}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
