'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/providers/AuthProvider'
import { Settings, Users, GitBranch, SlidersHorizontal, Loader2, Check } from 'lucide-react'

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">System Users</CardTitle>
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
  )
}

// ── Branches Tab ─────────────────────────────────────────────────────────────

interface BranchDetail {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
}

function BranchesTab() {
  const [branches, setBranches] = useState<BranchDetail[]>([])
  const [loading, setLoading] = useState(true)

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Branches</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
  const { user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => {})
  }, [])

  if (user && user.role !== 'admin') {
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
