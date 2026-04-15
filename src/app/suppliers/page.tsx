'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Search, Plus, Truck, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface Supplier {
  id: string
  name: string
  licenseNo: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formLicenseNo, setFormLicenseNo] = useState('')
  const [formContactName, setFormContactName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('take', '100')

      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(fetchSuppliers, 300)
    return () => clearTimeout(timeout)
  }, [fetchSuppliers])

  function resetForm() {
    setFormName('')
    setFormLicenseNo('')
    setFormContactName('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
  }

  function openCreateDialog() {
    setEditSupplier(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setEditSupplier(supplier)
    setFormName(supplier.name)
    setFormLicenseNo(supplier.licenseNo ?? '')
    setFormContactName(supplier.contactName ?? '')
    setFormPhone(supplier.phone ?? '')
    setFormEmail(supplier.email ?? '')
    setFormAddress(supplier.address ?? '')
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName) return

    setSaving(true)
    try {
      const payload = {
        name: formName,
        licenseNo: formLicenseNo || null,
        contactName: formContactName || null,
        phone: formPhone || null,
        email: formEmail || null,
        address: formAddress || null,
      }

      const res = editSupplier
        ? await fetch(`/api/suppliers/${editSupplier.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || `Failed to ${editSupplier ? 'update' : 'create'} supplier`)
        return
      }

      toast.success(`Supplier ${editSupplier ? 'updated' : 'created'} successfully`)
      setDialogOpen(false)
      resetForm()
      fetchSuppliers()
    } catch {
      toast.error(`Failed to ${editSupplier ? 'update' : 'create'} supplier`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <Button
            className="min-h-[44px] min-w-[44px]"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
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
          {loading ? 'Loading...' : `${total} supplier${total !== 1 ? 's' : ''}`}
        </p>

        {!loading && suppliers.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>License No.</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id} className="min-h-[44px]">
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.licenseNo ?? '-'}</TableCell>
                      <TableCell>{s.contactName ?? '-'}</TableCell>
                      <TableCell>{s.phone ?? '-'}</TableCell>
                      <TableCell>{s.email ?? '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && suppliers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mb-4 opacity-40" />
              <p>No suppliers found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>
              {editSupplier ? 'Update supplier details.' : 'Register a new product supplier.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Supplier name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNo">License No.</Label>
              <Input
                id="licenseNo"
                value={formLicenseNo}
                onChange={(e) => setFormLicenseNo(e.target.value)}
                placeholder="e.g. 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formContactName}
                onChange={(e) => setFormContactName(e.target.value)}
                placeholder="Contact person"
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="supplier@example.com"
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formName}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editSupplier ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
