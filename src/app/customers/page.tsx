'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { maskId } from '@/lib/utils/format'
import { Search, Users, Loader2 } from 'lucide-react'

interface CustomerResult {
  id: string
  idNumber: string
  idType: string
  name: string | null
  dateOfBirth: string
  nationality: string | null
  _count: { transactions: number }
}

export default function CustomersPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'name' | 'id'>('name')
  const [customers, setCustomers] = useState<CustomerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const param = searchType === 'id' ? 'idNumber' : 'name'
      const res = await fetch(`/api/customers?${param}=${encodeURIComponent(searchQuery.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  function formatDOB(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Customers</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => setSearchType('name')}
              className={`px-3 py-2 text-sm min-h-[44px] transition-colors ${
                searchType === 'name' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}
            >
              Name
            </button>
            <button
              type="button"
              onClick={() => setSearchType('id')}
              className={`px-3 py-2 text-sm min-h-[44px] transition-colors ${
                searchType === 'id' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}
            >
              ID
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchType === 'id' ? 'Enter ID number...' : 'Search by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={loading} className="min-h-[44px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">Searching...</div>
        )}

        {!loading && searched && customers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-40" />
              <p>No customers found</p>
            </CardContent>
          </Card>
        )}

        {!loading && customers.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer min-h-[44px]"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">
                        {customer.name ?? 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskId(customer.idNumber)}
                      </TableCell>
                      <TableCell>{customer.nationality ?? '-'}</TableCell>
                      <TableCell>{formatDOB(customer.dateOfBirth)}</TableCell>
                      <TableCell className="text-right">
                        {customer._count.transactions}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!searched && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-40" />
              <p>Search for customers by name or ID number</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
