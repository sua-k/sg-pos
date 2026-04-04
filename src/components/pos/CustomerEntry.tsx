"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Search, UserPlus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CustomerData {
  id: string
  idNumber: string
  idType: "national_id" | "passport"
  name: string | null
  dateOfBirth: string
  nationality: string | null
  age: number
  isMinimumAge: boolean
}

interface CustomerEntryProps {
  onCustomerSelected: (customer: CustomerData) => void
  customer: CustomerData | null
}

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function CustomerEntry({ onCustomerSelected, customer }: CustomerEntryProps) {
  const [idNumber, setIdNumber] = useState("")
  const [idType, setIdType] = useState<"national_id" | "passport">("national_id")
  const [searching, setSearching] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [searchError, setSearchError] = useState("")

  // New customer form state
  const [newName, setNewName] = useState("")
  const [newDob, setNewDob] = useState("")
  const [newNationality, setNewNationality] = useState("")
  const [creating, setCreating] = useState(false)

  async function handleSearch() {
    if (!idNumber.trim()) return
    setSearching(true)
    setSearchError("")

    try {
      const res = await fetch(`/api/customers?idNumber=${encodeURIComponent(idNumber.trim())}`)
      const data = await res.json()

      if (data.customers?.length > 0) {
        const c = data.customers[0]
        const age = calculateAge(c.dateOfBirth)
        onCustomerSelected({
          id: c.id,
          idNumber: c.idNumber,
          idType: c.idType,
          name: c.name,
          dateOfBirth: c.dateOfBirth,
          nationality: c.nationality,
          age,
          isMinimumAge: age >= 20,
        })
      } else {
        setSearchError("Customer not found")
        setShowNewDialog(true)
      }
    } catch {
      setSearchError("Search failed")
    } finally {
      setSearching(false)
    }
  }

  async function handleCreateCustomer() {
    if (!newDob) return
    setCreating(true)

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNumber: idNumber.trim(),
          idType,
          name: newName || null,
          dateOfBirth: newDob,
          nationality: newNationality || null,
        }),
      })

      if (!res.ok) {
        setSearchError("Failed to create customer")
        return
      }

      const c = await res.json()
      const age = calculateAge(c.dateOfBirth)
      onCustomerSelected({
        id: c.id,
        idNumber: c.idNumber,
        idType: c.idType,
        name: c.name,
        dateOfBirth: c.dateOfBirth,
        nationality: c.nationality,
        age,
        isMinimumAge: age >= 20,
      })

      setShowNewDialog(false)
      setNewName("")
      setNewDob("")
      setNewNationality("")
    } catch {
      setSearchError("Failed to create customer")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Customer ID</Label>
          <Input
            placeholder={idType === "national_id" ? "National ID" : "Passport No."}
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="h-11"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant="outline"
          className="h-11 w-11 shrink-0 p-0"
          onClick={() => setIdType(idType === "national_id" ? "passport" : "national_id")}
          title={`Switch to ${idType === "national_id" ? "passport" : "national ID"}`}
        >
          <span className="text-[10px] font-bold leading-none">
            {idType === "national_id" ? "ID" : "PP"}
          </span>
        </Button>
        <Button
          className="h-11 shrink-0"
          onClick={handleSearch}
          disabled={searching || !idNumber.trim()}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {searchError && !customer && (
        <p className="text-xs text-destructive">{searchError}</p>
      )}

      {customer && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {customer.name || "Unnamed"}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer.idType === "national_id" ? "ID" : "PP"}: ****
              {customer.idNumber.slice(-4)}
            </p>
          </div>
          <Badge
            variant={customer.isMinimumAge ? "default" : "destructive"}
            className={cn(
              "ml-2 shrink-0",
              customer.isMinimumAge
                ? "bg-green-600 hover:bg-green-600"
                : ""
            )}
          >
            Age: {customer.age} {customer.isMinimumAge ? "\u2713" : "\u2717"}
          </Badge>
        </div>
      )}

      {/* New Customer Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Customer
            </DialogTitle>
            <DialogDescription>
              No customer found for ID: {idNumber}. Create a new record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                className="h-11"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input
                value={newNationality}
                onChange={(e) => setNewNationality(e.target.value)}
                placeholder="e.g. Thai"
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={creating || !newDob}
              className="h-11"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
