'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/providers/AuthProvider'
import { Textarea } from '@/components/ui/textarea'
import { Settings, Users, GitBranch, SlidersHorizontal, Loader2, Check, Plus, Pencil } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface Branch {
  id: string
  name: string
  code: string
}

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  branchId: string
  branch: { id: string; name: string; code: string }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// ── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ branches }: { branches: Branch[] }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Add User dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState('staff')
  const [addBranchId, setAddBranchId] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  function resetAddForm() {
    setAddName('')
    setAddEmail('')
    setAddPassword('')
    setAddRole('staff')
    setAddBranchId(branches[0]?.id ?? '')
    setAddError('')
  }

  async function handleAddUser() {
    if (!addName || !addEmail || !addPassword || !addBranchId) {
      setAddError('All fields are required')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
          role: addRole,
          branchId: addBranchId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAddError(data.error ?? 'Failed to create user')
        return
      }
      const newUser: UserRow = await res.json()
      setUsers((prev) => [...prev, newUser])
      setAddOpen(false)
      resetAddForm()
    } catch {
      setAddError('Failed to create user')
    } finally {
      setAddSaving(false)
    }
  }

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((j) => setUsers(j.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function updateUser(userId: string, patch: { role?: string; branchId?: string }) {
    setSaving(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated: UserRow = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setSaved(userId)
      setTimeout(() => setSaved(null), 1500)
    } catch {
      // silent – UI stays unchanged
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading users...
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">System Users</CardTitle>
          <Button size="sm" onClick={() => { resetAddForm(); setAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUser(user.id, { role: value })}
                      disabled={saving === user.id}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.branchId}
                      onValueChange={(value) => updateUser(user.id, { branchId: value })}
                      disabled={saving === user.id}
                    >
                      <SelectTrigger className="w-44 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {saving === user.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {saved === user.id && <Check className="h-4 w-4 text-green-600" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {addError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={addBranchId} onValueChange={setAddBranchId}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addSaving}>
              {addSaving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Branches Tab ─────────────────────────────────────────────────────────────

interface BranchDetail {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  taxId: string | null
  companyName: string | null
  receiptHeader: string | null
  receiptFooter: string | null
  logoUrl: string | null
}

function BranchesTab() {
  const [branches, setBranches] = useState<BranchDetail[]>([])
  const [loading, setLoading] = useState(true)

  // Add Branch dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit Branch dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<BranchDetail | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editTaxId, setEditTaxId] = useState('')
  const [editReceiptHeader, setEditReceiptHeader] = useState('')
  const [editReceiptFooter, setEditReceiptFooter] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function openEditDialog(branch: BranchDetail) {
    setEditBranch(branch)
    setEditName(branch.name)
    setEditCode(branch.code)
    setEditAddress(branch.address ?? '')
    setEditPhone(branch.phone ?? '')
    setEditCompanyName(branch.companyName ?? '')
    setEditTaxId(branch.taxId ?? '')
    setEditReceiptHeader(branch.receiptHeader ?? '')
    setEditReceiptFooter(branch.receiptFooter ?? '')
    setEditError('')
    setEditOpen(true)
  }

  async function handleEditBranch() {
    if (!editBranch || !editName || !editCode) {
      setEditError('Name and code are required')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/branches/${editBranch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          code: editCode,
          address: editAddress || null,
          phone: editPhone || null,
          companyName: editCompanyName || null,
          taxId: editTaxId || null,
          receiptHeader: editReceiptHeader || null,
          receiptFooter: editReceiptFooter || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setEditError(data.error ?? 'Failed to update branch')
        return
      }
      const updated: BranchDetail = await res.json()
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setEditOpen(false)
    } catch {
      setEditError('Failed to update branch')
    } finally {
      setEditSaving(false)
    }
  }

  function resetAddForm() {
    setAddName('')
    setAddCode('')
    setAddAddress('')
    setAddPhone('')
    setAddError('')
  }

  async function handleAddBranch() {
    if (!addName || !addCode) {
      setAddError('Name and code are required')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName,
          code: addCode,
          address: addAddress || null,
          phone: addPhone || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAddError(data.error ?? 'Failed to create branch')
        return
      }
      const newBranch: BranchDetail = await res.json()
      setBranches((prev) => [...prev, newBranch])
      setAddOpen(false)
      resetAddForm()
    } catch {
      setAddError('Failed to create branch')
    } finally {
      setAddSaving(false)
    }
  }

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading branches...
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Branches</CardTitle>
          <Button size="sm" onClick={() => { resetAddForm(); setAddOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Add Branch
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {b.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.address ?? <span className="italic opacity-50">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.phone ?? <span className="italic opacity-50">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Branch Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {addError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Branch name"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                placeholder="e.g. BKK01"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                placeholder="Street address"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="e.g. 02-XXX-XXXX"
                className="min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBranch} disabled={addSaving}>
              {addSaving ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Branch name"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="e.g. BKK01"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street address"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. 02-XXX-XXXX"
                className="min-h-[44px]"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Receipt Customization</p>
            </div>

            <div className="space-y-2">
              <Label>Company Name (ชื่อบริษัท)</Label>
              <Input
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                placeholder="บริษัท สยาม กรีน จำกัด"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID (เลขประจำตัวผู้เสียภาษี)</Label>
              <Input
                value={editTaxId}
                onChange={(e) => setEditTaxId(e.target.value)}
                placeholder="0105567XXXXXX"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Header (ข้อความส่วนหัวใบเสร็จ)</Label>
              <Textarea
                value={editReceiptHeader}
                onChange={(e) => setEditReceiptHeader(e.target.value)}
                placeholder="Custom header text, e.g. promotions or Thai greeting"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Footer (ข้อความส่วนท้ายใบเสร็จ)</Label>
              <Textarea
                value={editReceiptFooter}
                onChange={(e) => setEditReceiptFooter(e.target.value)}
                placeholder="ขอบคุณที่ใช้บริการ | Thank you for your purchase"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditBranch} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Config Tab ───────────────────────────────────────────────────────────────

const CONFIG_ITEMS = [
  { label: 'Low Stock Threshold', key: 'LOW_STOCK_THRESHOLD', defaultValue: '10', unit: 'units' },
  { label: 'Expiry Warning Days', key: 'EXPIRY_WARNING_DAYS', defaultValue: '30', unit: 'days' },
  { label: 'VAT Rate', key: 'VAT_RATE', defaultValue: '7', unit: '%' },
  { label: 'Minimum Age', key: 'MIN_AGE', defaultValue: '20', unit: 'years' },
]

function ConfigTab() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">System Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          These values are set via environment variables on the server.
        </p>
        <div className="divide-y rounded-lg border">
          {CONFIG_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.key}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.defaultValue}</span>
                <span className="text-xs text-muted-foreground">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </AppShell>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Access restricted to administrators.
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="branches" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab branches={branches} />
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <BranchesTab />
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <ConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
