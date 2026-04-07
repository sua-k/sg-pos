"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Store, User, LogOut } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "POS Checkout",
  "/products": "Products",
  "/transactions": "Transactions",
  "/customers": "Customers",
  "/inventory": "Inventory",
  "/prescriptions": "Prescriptions",
  "/prescribers": "Prescribers",
  "/purchases": "Purchases",
  "/transfers": "Transfers",
  "/cash-drawers": "Cash Drawers",
  "/compliance": "Compliance",
  "/analytics": "Analytics",
  "/zoho": "Zoho Integration",
  "/reconciliation": "Reconciliation",
  "/settings": "Settings",
}

interface Branch {
  id: string
  name: string
  code: string
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")

  const title = pageTitles[pathname] ?? "SG POS"
  const isAdmin = user?.role === "admin"

  // For admin users, fetch all branches and allow switching
  useEffect(() => {
    if (!isAdmin) return

    async function fetchBranches() {
      try {
        const res = await fetch("/api/branches")
        if (!res.ok) return
        const data = await res.json()
        setBranches(data.branches ?? [])

        // Restore previously selected branch from localStorage, or use user's branch
        const stored = localStorage.getItem("sg-pos-selected-branch")
        if (stored && data.branches?.some((b: Branch) => b.id === stored)) {
          setSelectedBranchId(stored)
        } else if (user?.branchId) {
          setSelectedBranchId(user.branchId)
        }
      } catch {
        // Silently fail — branch selector just won't populate
      }
    }

    fetchBranches()
  }, [isAdmin, user?.branchId])

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId)
    localStorage.setItem("sg-pos-selected-branch", branchId)
    router.refresh()
  }

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Branch display / selector */}
        {isAdmin && branches.length > 0 ? (
          <Select value={selectedBranchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-[200px] min-h-[44px] gap-2">
              <Store className="h-4 w-4 shrink-0" />
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 min-h-[44px]" disabled>
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user?.branchName ?? "No branch"}
            </span>
          </Button>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <Badge variant="secondary" className="capitalize">
                {user?.role ?? "unknown"}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
