"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WeightEntryProduct {
  id: string
  name: string
  pricePerGram: number
}

interface WeightEntryDialogProps {
  product: WeightEntryProduct | null
  open: boolean
  onConfirm: (weight: number) => void
  onClose: () => void
}

export function WeightEntryDialog({
  product,
  open,
  onConfirm,
  onClose,
}: WeightEntryDialogProps) {
  const [weight, setWeight] = useState("")

  const weightNum = parseFloat(weight) || 0
  const pricePerGram = product?.pricePerGram ?? 0
  const preview = weightNum * pricePerGram

  function handleConfirm() {
    if (weightNum > 0) {
      onConfirm(weightNum)
      setWeight("")
    }
  }

  function handleClose() {
    setWeight("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Weight</DialogTitle>
          <DialogDescription>
            {product?.name ?? "Product"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="weight-input">Weight (grams)</Label>
            <Input
              id="weight-input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 text-lg"
              autoFocus
            />
          </div>

          {weightNum > 0 && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {weightNum.toFixed(2)}g x {"\u0E3F"}
                {pricePerGram.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                /g
              </p>
              <p className="mt-1 text-xl font-bold">
                {"\u0E3F"}
                {preview.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="h-11">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={weightNum <= 0}
            className="h-11"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
