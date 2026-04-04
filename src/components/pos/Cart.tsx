"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2 } from "lucide-react"

export interface CartItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  weightGrams?: number
  pricePerGram?: number
  soldByWeight: boolean
  lineTotal: number
}

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, delta: number) => void
  onRemoveItem: (productId: string) => void
}

function formatCurrency(amount: number): string {
  return `\u0E3F${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function Cart({ items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const vatAmount = grandTotal * 7 / 107
  const subtotal = grandTotal - vatAmount

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Cart is empty</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Cart Items (scrollable) */}
      <div className="flex-1 space-y-1 overflow-auto">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              {item.soldByWeight && item.weightGrams ? (
                <p className="text-xs text-muted-foreground">
                  {item.weightGrams.toFixed(2)}g x {formatCurrency(item.pricePerGram ?? 0)}/g
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              )}
            </div>

            {!item.soldByWeight && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(item.productId, -1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(item.productId, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}

            <p className="w-20 text-right text-sm font-semibold">
              {formatCurrency(item.lineTotal)}
            </p>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => onRemoveItem(item.productId)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-3 space-y-2">
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal (ex-VAT)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT 7%</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
