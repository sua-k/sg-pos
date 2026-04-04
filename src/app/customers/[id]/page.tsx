'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { maskId } from '@/lib/utils/format'
import { calculateAge } from '@/lib/utils/age'
import { ArrowLeft, User, Receipt, FileText } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  receiptNumber: string
  totalTHB: string
  status: string
  paymentMethod: string
  createdAt: string
  items: {
    id: string
    quantity: string
    totalTHB: string
    product: { name: string }
  }[]
}

interface Prescription {
  id: string
  prescriptionNo: string
  issuedDate: string
  expiryDate: string
  diagnosis: string | null
  totalAllowedG: string | null
  consumedG: string
}

interface CustomerProfile {
  id: string
  idNumber: string
  idType: string
  name: string | null
  dateOfBirth: string
  nationality: string | null
  phone: string | null
  email: string | null
  notes: string | null
  transactions: Transaction[]
  prescriptions: Prescription[]
  totalSpend: number
  orderCount: number
  averagePurchase: number
}

function formatTHB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `\u0E3F${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CustomerProfilePage() {
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/customers/${customerId}`)
        if (!res.ok) {
          setError('Customer not found')
          return
        }
        const data = await res.json()
        setCustomer(data)
      } catch {
        setError('Failed to load customer')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded animate-pulse" />
              ))}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (error || !customer) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-4">
          <Link href="/customers">
            <Button variant="ghost" className="min-h-[44px]">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
          </Link>
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {error || 'Customer not found'}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  const age = calculateAge(new Date(customer.dateOfBirth))

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{customer.name ?? 'Customer'}</h1>
        </div>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{customer.name ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID Number</p>
                <p className="font-mono">{maskId(customer.idNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p>{formatDate(customer.dateOfBirth)} (age {age})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p>{customer.nationality ?? '-'}</p>
              </div>
              {customer.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{customer.phone}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{customer.email}</p>
                </div>
              )}
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Spend</p>
              <p className="text-lg font-bold">{formatTHB(customer.totalSpend)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-lg font-bold">{customer.orderCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Avg Purchase</p>
              <p className="text-lg font-bold">{formatTHB(customer.averagePurchase)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.transactions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">{tx.receiptNumber}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(tx.createdAt)}</TableCell>
                      <TableCell className="text-sm">{tx.items.length} items</TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.status === 'completed' ? 'default' : 'destructive'}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatTHB(tx.totalTHB)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customer.prescriptions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No prescriptions
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription No</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead className="text-right">Used / Allowed (g)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.prescriptions.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell className="font-mono text-sm">{rx.prescriptionNo}</TableCell>
                      <TableCell className="text-sm">{formatDate(rx.issuedDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(rx.expiryDate)}</TableCell>
                      <TableCell className="text-sm">{rx.diagnosis ?? '-'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {parseFloat(rx.consumedG).toFixed(1)}
                        {rx.totalAllowedG ? ` / ${parseFloat(rx.totalAllowedG).toFixed(1)}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
