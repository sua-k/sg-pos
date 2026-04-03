"use client"

import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Store, User } from "lucide-react"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "POS Checkout",
  "/products": "Products",
  "/transactions": "Transactions",
  "/customers": "Customers",
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? "SG POS"

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Branch selector placeholder */}
        <Button variant="outline" size="sm" className="gap-2 min-h-[44px]">
          <Store className="h-4 w-4" />
          <span className="hidden sm:inline">Siam Green - Main</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* User placeholder */}
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
