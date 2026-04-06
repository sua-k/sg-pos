"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Loader2, CheckCircle2, Circle } from "lucide-react"

interface Prescription {
  id: string
  prescriptionNo: string
  prescriber: { name: string } | null
  totalAllowedG: string | null
  consumedG: string
  expiryDate: string
}

interface PrescriptionLinkProps {
  customerId?: string | null
  disabled?: boolean
  onLink: (prescriptionIds: string[]) => void
}

export function PrescriptionLink({ customerId, disabled, onLink }: PrescriptionLinkProps) {
  const [open, setOpen] = useState(false)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [linked, setLinked] = useState<string[]>([])

  const isDisabled = disabled || !customerId

  async function handleOpen() {
    if (isDisabled) return
    setOpen(true)
    setLoading(true)
    setSelected(new Set())
    try {
      const res = await fetch(`/api/prescriptions?customerId=${customerId}&status=active`)
      if (res.ok) {
        const data = await res.json()
        setPrescriptions(data.prescriptions ?? [])
      } else {
        setPrescriptions([])
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleLinkSelected() {
    const ids = Array.from(selected)
    setLinked(ids)
    onLink(ids)
    setOpen(false)
  }

  const remainingG = (p: Prescription) => {
    const total = parseFloat(p.totalAllowedG ?? "0")
    const consumed = parseFloat(p.consumedG)
    return (total - consumed).toFixed(2)
  }

  return (
    <>
      <Button
        variant="outline"
        className="mb-3 h-11 w-full"
        disabled={isDisabled}
        title={isDisabled ? "Select a customer to link a prescription" : "Link a prescription to this sale"}
        onClick={handleOpen}
      >
        <FileText className="mr-2 h-4 w-4" />
        {linked.length > 0
          ? `Prescriptions Linked (${linked.length})`
          : "Link Prescription"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Prescription</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : prescriptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active prescriptions for this customer
            </p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => {
                const isSelected = selected.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelect(p.id)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50 ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 space-y-0.5 text-sm">
                      <div className="font-medium">{p.prescriptionNo}</div>
                      <div className="text-muted-foreground">
                        Prescriber: {p.prescriber?.name ?? "—"}
                      </div>
                      <div className="text-muted-foreground">
                        Remaining: {p.totalAllowedG ? `${remainingG(p)} g` : "—"}
                      </div>
                      <div className="text-muted-foreground">
                        Expires: {new Date(p.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                )
              })}

              <Button
                className="w-full"
                disabled={selected.size === 0}
                onClick={handleLinkSelected}
              >
                Link Selected ({selected.size})
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
