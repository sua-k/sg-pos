'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatTHB, maskId } from '@/lib/utils/format'
import { ReceiptPreview, type ReceiptData } from '@/components/pos/ReceiptPreview'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Receipt, Loader2, ChevronDown } from 'lucide-react'

interface TransactionRow {
  id: string
  receiptNumber: string
  createdAt: string
  customer: {
    id: string
    idNumber: string
    name: string | null
  } | null
  totalTHB: string
  paymentMethod: string
  status: string
  user: { name: string }
  branch: { name: string; code: string }
}

interface ApiResponse {
  transactions: TransactionRow[]
  total: number
  skip: number
  take: number
}

const PAGE_SIZE = 50

function StatusBadge({ status, receiptNumber }: { status: string; receiptNumber?: string }) {
  if (receiptNumber?.startsWith('REF-')) {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
        Refund
      </Badge>
    )
  }
  if (status === 'completed') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Completed
      </Badge>
    )
  }
  if (status === 'voided') {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
        Voided
      </Badge>
    )
  }
  if (status === 'refunded') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
        Refunded
      </Badge>
    )
  }
  return <Badge variant="outline">{status}</Badge>
}

const paymentLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
}

export default function TransactionsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [skip, setSkip] = useState(0)

  // Receipt preview
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null)

  async function handleViewReceipt(e: React.MouseEvent, txId: string) {
    e.stopPropagation()
    setReceiptLoadingId(txId)
    try {
      const res = await fetch(`/api/transactions/${txId}/receipt`)
      if (!res.ok) return
      const data: ReceiptData = await res.json()
      setReceiptData(data)
      setReceiptOpen(true)
    } finally {
      setReceiptLoadingId(null)
    }
  }

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const buildQuery = useCallback(
    (currentSkip: number) => {
      const params = new URLSearchParams()
      params.set('skip', String(currentSkip))
      params.set('take', String(PAGE_SIZE))
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        params.set('dateTo', end.toISOString())
      }
      return params.toString()
    },
    [statusFilter, paymentFilter, dateFrom, dateTo]
  )

  const fetchTransactions = useCallback(
    async (currentSkip: number, append = false) => {
      setLoading(true)
      try {
        const qs = buildQuery(currentSkip)
        const res = await fetch(`/api/transactions?${qs}`)
        if (!res.ok) return
        const data: ApiResponse = await res.json()

        const filtered = search.trim()
          ? data.transactions.filter((t) =>
              t.receiptNumber.toLowerCase().includes(search.trim().toLowerCase())
            )
          : data.transactions

        if (append) {
          setTransactions((prev) => [...prev, ...filtered])
        } else {
          setTransactions(filtered)
        }
        setTotal(data.total)
      } finally {
        setLoading(false)
      }
    },
    [buildQuery, search]
  )

  useEffect(() => {
    setSkip(0)
    fetchTransactions(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, paymentFilter, dateFrom, dateTo])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSkip(0)
    fetchTransactions(0, false)
  }

  function handleLoadMore() {
    const nextSkip = skip + PAGE_SIZE
    setSkip(nextSkip)
    fetchTransactions(nextSkip, true)
  }

  const hasMore = transactions.length < total

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Transactions</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Receipt search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Receipt #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 text-sm"
            />
            <span className="text-muted-foreground text-sm">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment filter */}
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-40" />
              <p>No transactions found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cashier</TableHead>
                    {user?.role === 'admin' && <TableHead>Branch</TableHead>}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/transactions/${tx.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {tx.receiptNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tx.customer ? maskId(tx.customer.idNumber) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatTHB(tx.totalTHB)}
                      </TableCell>
                      <TableCell>
                        {paymentLabel[tx.paymentMethod] ?? tx.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} receiptNumber={tx.receiptNumber} />
                      </TableCell>
                      <TableCell className="text-sm">{tx.user.name}</TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-sm">{tx.branch.name}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={receiptLoadingId === tx.id}
                          onClick={(e) => handleViewReceipt(e, tx.id)}
                          title="View Receipt"
                        >
                          {receiptLoadingId === tx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasMore && (
                <div className="flex justify-center p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    Load more ({total - transactions.length} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* Receipt preview dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Receipt preview
            </DialogDescription>
          </DialogHeader>
          {receiptData && (
            <ReceiptPreview
              receipt={receiptData}
              onClose={() => setReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
