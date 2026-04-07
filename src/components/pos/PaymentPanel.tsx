"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Banknote, CreditCard, ArrowRightLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentMethodType = "cash" | "card" | "transfer"

interface PaymentPanelProps {
  onSelectPayment: (method: PaymentMethodType) => void
  onCompleteSale: () => void
  selectedMethod: PaymentMethodType | null
  disabled: boolean
  loading: boolean
  grandTotal?: number
}

const methods: { value: PaymentMethodType; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
]

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Common Thai banknote denominations for quick buttons
const QUICK_AMOUNTS = [100, 500, 1000, 2000]

export function PaymentPanel({
  onSelectPayment,
  onCompleteSale,
  selectedMethod,
  disabled,
  loading,
  grandTotal = 0,
}: PaymentPanelProps) {
  const [cashReceived, setCashReceived] = useState("")
  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - grandTotal

  // Reset cash received when payment method or total changes
  useEffect(() => {
    setCashReceived("")
  }, [selectedMethod, grandTotal])

  const isCash = selectedMethod === "cash"
  const cashReady = !isCash || (cashAmount >= grandTotal && grandTotal > 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {methods.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={selectedMethod === value ? "default" : "outline"}
            className={cn(
              "h-14 flex-col gap-1 text-xs font-medium",
              selectedMethod === value && "ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => onSelectPayment(value)}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Cash received section */}
      {isCash && grandTotal > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground w-24">Received:</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="h-12 text-lg font-bold text-right"
              autoFocus
            />
          </div>

          {/* Quick amount buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_AMOUNTS.map((amt) => (
              <Button
                key={amt}
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => setCashReceived(String(amt))}
              >
                {formatCurrency(amt)}
              </Button>
            ))}
          </div>

          {/* Exact amount button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={() => setCashReceived(String(Math.ceil(grandTotal)))}
          >
            Exact: {formatCurrency(grandTotal)}
          </Button>

          {/* Change display */}
          {cashAmount > 0 && (
            <div className={cn(
              "flex justify-between items-center rounded-md px-3 py-2 text-sm font-bold",
              change >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              <span>Change:</span>
              <span className="text-lg">{change >= 0 ? formatCurrency(change) : `Short ${formatCurrency(Math.abs(change))}`}</span>
            </div>
          )}
        </div>
      )}

      <Button
        className="h-14 w-full text-lg font-bold"
        size="lg"
        disabled={disabled || loading || !cashReady}
        onClick={onCompleteSale}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Complete Sale"
        )}
      </Button>
    </div>
  )
}
