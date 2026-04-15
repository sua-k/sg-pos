"use client"

import { useState, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { ProductGrid } from "@/components/pos/ProductGrid"
import { Cart, CartItem } from "@/components/pos/Cart"
import { CustomerEntry, CustomerData } from "@/components/pos/CustomerEntry"
import { PaymentPanel } from "@/components/pos/PaymentPanel"
import { ReceiptPreview, type ReceiptData } from "@/components/pos/ReceiptPreview"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/components/providers/AuthProvider"
import { toast } from "sonner"
import { PrescriptionLink } from "@/components/pos/PrescriptionLink"

type PaymentMethodType = "cash" | "card" | "transfer"

export default function POSPage() {
  const { user, loading: authLoading } = useAuth()
  const branchId = user?.branchId ?? ""

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [linkedPrescriptions, setLinkedPrescriptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | null>(null)
  const [discountValue, setDiscountValue] = useState<string>('')

  // Post-checkout receipt
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const handleAddToCart = useCallback(
    (
      product: { id: string; name: string; priceTHB: number; pricePerGram: number | null; soldByWeight: boolean },
      quantity: number,
      weightGrams?: number
    ) => {
      setCartItems((prev) => {
        // For weight-based, always add a new line (different weighings)
        if (product.soldByWeight && weightGrams) {
          const ppg = product.pricePerGram ?? 0
          return [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              quantity: 1,
              unitPrice: weightGrams * ppg,
              weightGrams,
              pricePerGram: ppg,
              soldByWeight: true,
              lineTotal: Math.round(weightGrams * ppg * 100) / 100,
            },
          ]
        }

        // For fixed-price: increment quantity if already in cart
        const existing = prev.find(
          (item) => item.productId === product.id && !item.soldByWeight
        )
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id && !item.soldByWeight
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  lineTotal:
                    Math.round(
                      (item.quantity + quantity) * item.unitPrice * 100
                    ) / 100,
                }
              : item
          )
        }

        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            quantity,
            unitPrice: product.priceTHB,
            soldByWeight: false,
            lineTotal: Math.round(quantity * product.priceTHB * 100) / 100,
          },
        ]
      })
    },
    []
  )

  const handleUpdateQuantity = useCallback(
    (productId: string, delta: number) => {
      setCartItems((prev) =>
        prev
          .map((item) => {
            if (item.productId !== productId || item.soldByWeight) return item
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            return {
              ...item,
              quantity: newQty,
              lineTotal: Math.round(newQty * item.unitPrice * 100) / 100,
            }
          })
          .filter(Boolean) as CartItem[]
      )
    },
    []
  )

  const handleRemoveItem = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  async function handleCompleteSale() {
    if (!customer || !paymentMethod || cartItems.length === 0 || !branchId) return
    if (!customer.isMinimumAge) {
      toast.error("Customer must be at least 20 years old")
      return
    }

    setLoading(true)

    try {
      const apiItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.soldByWeight && item.weightGrams
          ? { weightGrams: item.weightGrams, pricePerGram: item.pricePerGram }
          : {}),
      }))

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          branchId,
          items: apiItems,
          paymentMethod,
          prescriptionIds: linkedPrescriptions,
          ...(discountType && discountValue ? {
            discountType,
            discountValue: parseFloat(discountValue),
          } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Checkout failed")
        return
      }

      const transaction = await res.json()

      // Success: clear cart
      setCartItems([])
      setCustomer(null)
      setPaymentMethod(null)
      setLinkedPrescriptions([])
      setDiscountType(null)
      setDiscountValue('')

      toast.success(`Sale complete! Receipt: ${transaction.receiptNumber}`, {
        duration: 5000,
      })

      // Fetch and show receipt
      try {
        const receiptRes = await fetch(`/api/transactions/${transaction.id}/receipt`)
        if (receiptRes.ok) {
          const data: ReceiptData = await receiptRes.json()
          setReceiptData(data)
          setReceiptOpen(true)
        }
      } catch {
        // Non-critical — receipt display failure should not block success
      }
    } catch {
      toast.error("Checkout failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const canComplete =
    !!customer &&
    customer.isMinimumAge &&
    cartItems.length > 0 &&
    !!paymentMethod &&
    !loading

  return (
    <AppShell>
      <div className="flex h-full gap-4">
        {/* Left Side (60%) — Product Grid */}
        <div className="flex flex-[3] flex-col overflow-hidden rounded-lg border p-4">
          {branchId ? (
            <ProductGrid branchId={branchId} onAddToCart={handleAddToCart} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {authLoading
                  ? "Loading branch..."
                  : "Please contact admin to assign your branch."}
              </p>
            </div>
          )}
        </div>

        {/* Right Side (40%) — Cart + Customer + Payment */}
        <div className="flex flex-[2] flex-col overflow-hidden rounded-lg border p-4">
          {/* Customer Entry */}
          <CustomerEntry
            onCustomerSelected={setCustomer}
            customer={customer}
          />

          <Separator className="my-3" />

          {/* Cart Items + Totals */}
          <Cart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            discountType={discountType}
            discountValue={discountValue ? parseFloat(discountValue) : undefined}
          />

          <Separator className="my-3" />

          {/* Discount Section */}
          <div className="space-y-2">
            <div className="flex gap-1">
              <Button
                variant={discountType === null ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setDiscountType(null); setDiscountValue('') }}
              >
                No Discount
              </Button>
              <Button
                variant={discountType === 'percentage' ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDiscountType('percentage')}
              >
                % Off
              </Button>
              <Button
                variant={discountType === 'fixed' ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDiscountType('fixed')}
              >
                &#x0E3F; Off
              </Button>
            </div>
            {discountType && (
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount (THB)'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>

          <Separator className="my-3" />

          {/* Prescription link */}
          <PrescriptionLink
            customerId={customer?.id}
            disabled={!customer}
            onLink={setLinkedPrescriptions}
          />

          {/* Payment Panel */}
          <PaymentPanel
            onSelectPayment={setPaymentMethod}
            onCompleteSale={handleCompleteSale}
            selectedMethod={paymentMethod}
            disabled={!canComplete}
            grandTotal={cartItems.reduce((sum, item) => sum + item.lineTotal, 0)}
            loading={loading}
          />
        </div>
      </div>
      {/* Post-checkout receipt dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm p-4">
          <DialogHeader>
            <DialogTitle>Sale Complete</DialogTitle>
            <DialogDescription className="sr-only">
              Receipt for completed transaction
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
