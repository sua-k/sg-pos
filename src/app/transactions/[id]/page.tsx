'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { formatTHB, maskId } from '@/lib/utils/format'
import { ReceiptPreview, type ReceiptData } from '@/components/pos/ReceiptPreview'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Receipt,
  AlertTriangle,
  Loader2,
  User,
} from 'lucide-react'

interface TransactionDetail {
  id: string
  receiptNumber: string
  createdAt: string
  status: string
  paymentMethod: string
  subtotalTHB: string
  vatTHB: string
  vatRate: string
  totalTHB: string
  customer: {
    id: string
    idNumber: string
    idType: string
    name: string | null
    dateOfBirth: string
    nationality: string | null
  } | null
  user: { id: string; name: string; email: string }
  branch: { id: string; name: string; code: string }
  items: Array<{
    id: string
    productId: string
    product: { id: string; name: string; sku: string }
    quantity: string
    unitPriceTHB: string
    subtotalTHB: string
    vatTHB: string
    totalTHB: string
    weightGrams: string | null
    pricePerGram: string | null
    cogsTHB: string
  }>
}

function StatusBadge({ status }: { status: string }) {
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

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

const paymentLabel: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
}

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const { user } = useAuth()

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Receipt preview
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptLoading, setReceiptLoading] = useState(false)

  // Void dialog
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidLoading, setVoidLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/transactions/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) {
          toast.error('Failed to load transaction')
          return
        }
        const data = await res.json()
        setTransaction(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleViewReceipt() {
    setReceiptLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}/receipt`)
      if (!res.ok) {
        toast.error('Failed to load receipt')
        return
      }
      const data: ReceiptData = await res.json()
      setReceiptData(data)
      setReceiptOpen(true)
    } finally {
      setReceiptLoading(false)
    }
  }

  async function handleVoid() {
    setVoidLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}/void`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Void failed')
        return
      }
      const updated = await res.json()
      setTransaction((prev) => prev ? { ...prev, status: updated.status } : prev)
      setVoidOpen(false)
      toast.success('Transaction voided successfully')
    } finally {
      setVoidLoading(false)
    }
  }

  const canVoid =
    user?.role === 'admin' || user?.role === 'manager'

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading...
        </div>
      </AppShell>
    )
  }

  if (notFound || !transaction) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
          <Receipt className="h-12 w-12 opacity-40" />
          <p>Transaction not found</p>
          <Button variant="outline" onClick={() => router.push('/transactions')}>
            Back to Transactions
          </Button>
        </div>
      </AppShell>
    )
  }

  const isVoided = transaction.status === 'voided'

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/transactions')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Transactions
        </Button>

        {/* Header */}
        <div className="relative">
          {isVoided && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              aria-hidden
            >
              <span
                className="text-red-500 font-bold text-6xl opacity-20 rotate-[-20deg] select-none"
                style={{ userSelect: 'none' }}
              >
                VOIDED
              </span>
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="font-mono text-xl">
                    {transaction.receiptNumber}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Branch: {transaction.branch.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={transaction.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewReceipt}
                    disabled={receiptLoading}
                  >
                    {receiptLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Receipt className="h-4 w-4 mr-1" />
                    )}
                    View Receipt
                  </Button>
                  {canVoid && !isVoided && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setVoidOpen(true)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Void Transaction
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Customer info */}
        {transaction.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{transaction.customer.name || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono">{maskId(transaction.customer.idNumber)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ID Type</p>
                <p className="capitalize">{transaction.customer.idType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Age</p>
                <p>{calculateAge(transaction.customer.dateOfBirth)} yrs</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty / Weight</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.items.map((item) => {
                  const isWeightBased = item.weightGrams !== null
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {isWeightBased ? (
                          <span>{Number(item.weightGrams).toFixed(2)}g</span>
                        ) : (
                          <span>&times;{Number(item.quantity).toFixed(0)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {isWeightBased && item.pricePerGram
                          ? `${formatTHB(item.pricePerGram)}/g`
                          : formatTHB(item.unitPriceTHB)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatTHB(item.subtotalTHB)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatTHB(item.vatTHB)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatTHB(item.totalTHB)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatTHB(item.cogsTHB)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals + payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (ex-VAT)</span>
                <span>{formatTHB(transaction.subtotalTHB)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  VAT {Number(transaction.vatRate).toFixed(0)}%
                </span>
                <span>{formatTHB(transaction.vatTHB)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Grand Total</span>
                <span>{formatTHB(transaction.totalTHB)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment & Cashier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span>{paymentLabel[transaction.paymentMethod] ?? transaction.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cashier</span>
                <span>{transaction.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch</span>
                <span>{transaction.branch.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt preview dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Receipt for transaction {transaction.receiptNumber}
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

      {/* Void confirmation dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to void receipt{' '}
              <span className="font-mono font-medium">{transaction.receiptNumber}</span>?
              This will restore inventory and reverse FIFO cost layers. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidOpen(false)}
              disabled={voidLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voidLoading}
            >
              {voidLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Void Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
