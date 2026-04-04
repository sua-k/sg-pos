"use client"

import { Button } from "@/components/ui/button"
import { Banknote, CreditCard, ArrowRightLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentMethodType = "cash" | "card" | "transfer"

interface PaymentPanelProps {
  onSelectPayment: (method: PaymentMethodType) => void
  onCompleteSale: () => void
  selectedMethod: PaymentMethodType | null
  disabled: boolean
  loading: boolean
}

const methods: { value: PaymentMethodType; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
]

export function PaymentPanel({
  onSelectPayment,
  onCompleteSale,
  selectedMethod,
  disabled,
  loading,
}: PaymentPanelProps) {
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

      <Button
        className="h-14 w-full text-lg font-bold"
        size="lg"
        disabled={disabled || loading}
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
