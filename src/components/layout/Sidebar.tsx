"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  ShieldCheck,
  ArrowLeftRight,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  disabled?: boolean
}

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Products", href: "/products", icon: Package },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Customers", href: "/customers", icon: Users },
]

const futureNav: NavItem[] = [
  { label: "Compliance", href: "/compliance", icon: ShieldCheck, disabled: true },
  { label: "Transfers", href: "/transfers", icon: ArrowLeftRight, disabled: true },
  { label: "Reports", href: "/reports", icon: BarChart3, disabled: true },
  { label: "Settings", href: "/settings", icon: Settings, disabled: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          SG
        </div>
        {!collapsed && (
          <span className="font-semibold text-lg tracking-tight">SG POS</span>
        )}
      </div>

      <Separator />

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {mainNav.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && item.label}
              </span>
            </Link>
          )
        })}

        <Separator className="my-3" />

        {futureNav.map((item) => (
          <span
            key={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px]",
              "text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && item.label}
          </span>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="text-sm font-medium truncate">Siam Green - Main</p>
            <p className="text-xs text-muted-foreground mt-1">Staff</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
