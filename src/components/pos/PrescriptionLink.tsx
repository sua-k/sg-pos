"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

interface PrescriptionLinkProps {
  customerId?: string | null
  disabled?: boolean
  onLink?: (prescriptionId: string) => void
}

export function PrescriptionLink({ disabled = true, onLink }: PrescriptionLinkProps) {
  return (
    <Button
      variant="outline"
      className="mb-3 h-11 w-full"
      disabled={disabled}
      title={disabled ? "Coming in Phase 2" : "Link a prescription to this sale"}
      onClick={() => {
        // Phase 2: open prescription search/link dialog
        if (onLink) onLink("")
      }}
    >
      <FileText className="mr-2 h-4 w-4" />
      Link Prescription
    </Button>
  )
}
