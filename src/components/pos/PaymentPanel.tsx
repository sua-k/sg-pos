"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Banknote, CreditCard, ArrowRightLeft, SplitSquareHorizontal, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentMethodType = "cash" | "card" | "transfer"

export interface SplitEntry {
  method: PaymentMethodType
  amount: number
}

interface PaymentPanelProps {
  onSelectPayment: (method: PaymentMethodType) => void
  onSplitPayment?: (splits: SplitEntry[]) => void
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
  onSplitPayment,
  onCompleteSale,
  selectedMethod,
  disabled,
  loading,
  grandTotal = 0,
}: PaymentPanelProps) {
  const [cashReceived, setCashReceived] = useState("")
  const [splitMode, setSplitMode] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState<Record<PaymentMethodType, string>>({
    cash: "",
    card: "",
    transfer: "",
  })

  const cashAmount = parseFloat(cashReceived) || 0
  const change = cashAmount - grandTotal

  // Reset cash received when payment method or total changes
  useEffect(() => {
    setCashReceived("")
  }, [selectedMethod, grandTotal])

  // Reset split amounts when exiting split mode or grandTotal changes
  useEffect(() => {
    if (!splitMode) {
      setSplitAmounts({ cash: "", card: "", transfer: "" })
    }
  }, [splitMode])

  // Notify parent of split changes
  useEffect(() => {
    if (splitMode && onSplitPayment) {
      const splits: SplitEntry[] = methods
        .map((m) => ({ method: m.value, amount: parseFloat(splitAmounts[m.value]) || 0 }))
        .filter((s) => s.amount > 0)
      onSplitPayment(splits)
    }
  }, [splitMode, splitAmounts, onSplitPayment])

  const isCash = selectedMethod === "cash"
  const cashReady = !isCash || (cashAmount >= grandTotal && grandTotal > 0)

  // Split mode calculations
  const splitTotal = methods.reduce(
    (sum, m) => sum + (parseFloat(splitAmounts[m.value]) || 0),
    0
  )
  const splitRemaining = Math.round((grandTotal - splitTotal) * 100) / 100
  const splitCashAmount = parseFloat(splitAmounts.cash) || 0
  const nonCashSplitTotal = splitTotal - splitCashAmount
  const splitCashChange = splitCashAmount > 0 ? splitCashAmount - (grandTotal - nonCashSplitTotal) : 0
  const splitReady = grandTotal > 0 && Math.abs(splitRemaining) < 0.01

  const handleToggleSplit = () => {
    const next = !splitMode
    setSplitMode(next)
    if (next && onSplitPayment) {
      onSplitPayment([])
    }
  }

  const effectiveDisabled = splitMode
    ? disabled || loading || !splitReady
    : disabled || loading || !cashReady

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {methods.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={!splitMode && selectedMethod === value ? "default" : "outline"}
            className={cn(
              "h-14 flex-col gap-1 text-xs font-medium",
              !splitMode && selectedMethod === value && "ring-2 ring-primary ring-offset-2"
            )}
            disabled={splitMode}
            onClick={() => onSelectPayment(value)}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Button>
        ))}
        <Button
          variant={splitMode ? "default" : "outline"}
          className={cn(
            "h-14 flex-col gap-1 text-xs font-medium",
            splitMode && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={handleToggleSplit}
        >
          <SplitSquareHorizontal className="h-5 w-5" />
          Split
        </Button>
      </div>

      {/* Split payment section */}
      {splitMode && grandTotal > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Split Payment
          </div>
          {methods.map(({ value, label, icon: Icon }) => (
            <div key={value} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm w-16 shrink-0">{label}:</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={splitAmounts[value]}
                onChange={(e) =>
                  setSplitAmounts((prev) => ({ ...prev, [value]: e.target.value }))
                }
                className="h-9 text-right text-sm font-medium"
              />
            </div>
          ))}

          {/* Cash change for split — only when cash portion > 0 and total matches */}
          {splitCashAmount > 0 && splitReady && (
            <div className={cn(
              "flex justify-between items-center rounded-md px-3 py-2 text-sm font-bold",
              splitCashChange >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              <span>Cash Change:</span>
              <span>
                {splitCashChange >= 0
                  ? formatCurrency(splitCashChange)
                  : `Short ${formatCurrency(Math.abs(splitCashChange))}`}
              </span>
            </div>
          )}

          {/* Remaining balance */}
          <div className={cn(
            "flex justify-between items-center rounded-md px-3 py-2 text-sm font-bold",
            splitRemaining === 0
              ? "bg-green-100 text-green-800"
              : splitRemaining < 0
              ? "bg-red-100 text-red-800"
              : "bg-yellow-50 text-yellow-800"
          )}>
            <span>{splitRemaining < 0 ? "Over by:" : "Remaining:"}</span>
            <span>{formatCurrency(Math.abs(splitRemaining))}</span>
          </div>
        </div>
      )}

      {/* Cash received section (single mode) */}
      {!splitMode && isCash && grandTotal > 0 && (
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
              <span className="text-lg">
                {change >= 0 ? formatCurrency(change) : `Short ${formatCurrency(Math.abs(change))}`}
              </span>
            </div>
          )}
        </div>
      )}

      <Button
        className="h-14 w-full text-lg font-bold"
        size="lg"
        disabled={effectiveDisabled}
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
