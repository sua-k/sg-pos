'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Prescription {
  id: string
  prescriptionNo: string
  issuedDate: string
  expiryDate: string
  totalAllowedG: string | null
  consumedG: string
  diagnosis: string | null
  customer: { id: string; name: string | null; idNumber: string }
  prescriber: { id: string; name: string } | null
  branch: { id: string; name: string; code: string }
}

function statusBadge(expiryDate: string) {
  const isExpired = new Date(expiryDate) < new Date()
  return isExpired ? (
    <Badge variant="destructive">Expired</Badge>
  ) : (
    <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
  )
}

export default function PrescriptionsPage() {
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('all')

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ take: '50' })
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/prescriptions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPrescriptions(data.prescriptions ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Prescriptions
          </h1>
          <Link href="/prescriptions/new">
            <Button className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          </Link>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${total} prescription${total !== 1 ? 's' : ''}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-40" />
              <p>No prescriptions found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rx No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Prescriber</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((rx) => (
                    <TableRow
                      key={rx.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/prescriptions/${rx.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{rx.prescriptionNo}</TableCell>
                      <TableCell className="font-medium">
                        {rx.customer.name ?? rx.customer.idNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {rx.prescriber?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(rx.issuedDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(rx.expiryDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{statusBadge(rx.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {rx.branch.code}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
