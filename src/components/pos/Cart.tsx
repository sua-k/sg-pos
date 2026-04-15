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
  discountType?: 'percentage' | 'fixed' | null
  discountValue?: number
}

function formatCurrency(amount: number): string {
  return `\u0E3F${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, discountType, discountValue }: CartProps) {
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  // Discount calculation
  let discountTHB = 0
  if (discountType && discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      discountTHB = Math.round(grandTotal * discountValue / 100 * 100) / 100
    } else {
      discountTHB = Math.round(discountValue * 100) / 100
    }
    if (discountTHB > grandTotal) discountTHB = grandTotal
  }

  const afterDiscount = grandTotal - discountTHB
  const vatAmount = afterDiscount * 7 / 107
  const subtotal = afterDiscount - vatAmount
  const hasDiscount = discountTHB > 0

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
          <span className="text-muted-foreground">Items Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        {hasDiscount && (
          <>
            <div className="flex justify-between text-sm text-red-600">
              <span>
                Discount{discountType === 'percentage' ? ` (${discountValue}%)` : ''}
              </span>
              <span>-{formatCurrency(discountTHB)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>After Discount</span>
              <span>{formatCurrency(afterDiscount)}</span>
            </div>
          </>
        )}
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
          <span>{formatCurrency(afterDiscount)}</span>
        </div>
      </div>
    </div>
  )
}
