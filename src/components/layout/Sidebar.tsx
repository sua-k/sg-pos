"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Receipt,
  Stethoscope,
  FileText,
  ShoppingBag,
  ArrowLeftRight,
  Banknote,
  Shield,
  BarChart3,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import type { UserRole } from "@/types/auth"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "manager", "staff"] },
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["admin", "manager", "staff"] },
  { label: "Products", href: "/products", icon: Package, roles: ["admin", "manager"] },
  { label: "Inventory", href: "/inventory", icon: Warehouse, roles: ["admin", "manager"] },
  { label: "Customers", href: "/customers", icon: Users, roles: ["admin", "manager", "staff"] },
  { label: "Transactions", href: "/transactions", icon: Receipt, roles: ["admin", "manager"] },
  { label: "Prescribers", href: "/prescribers", icon: Stethoscope, roles: ["admin", "manager"] },
  { label: "Prescriptions", href: "/prescriptions", icon: FileText, roles: ["admin", "manager", "staff"] },
  { label: "Purchases", href: "/purchases", icon: ShoppingBag, roles: ["admin", "manager"] },
  { label: "Transfers", href: "/transfers", icon: ArrowLeftRight, roles: ["admin", "manager"] },
  { label: "Cash Drawers", href: "/cash-drawers", icon: Banknote, roles: ["admin", "manager", "staff"] },
  { label: "Compliance", href: "/compliance", icon: Shield, roles: ["admin", "manager"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin", "manager"] },
  { label: "Daily Report", href: "/reports/daily", icon: ClipboardList, roles: ["admin", "manager"] },
  // Zoho and Reconciliation hidden — re-enable when integrations are ready
  // { label: "Zoho", href: "/zoho", icon: Settings2, roles: ["admin"] },
  // { label: "Reconciliation", href: "/reconciliation", icon: Scale, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const userRole = user?.role ?? null

  // If role is null/undefined, show all items (server-side auth checks protect actual access)
  const visibleItems = NAV_ITEMS.filter(
    (item) => !userRole || item.roles.includes(userRole as UserRole)
  )

  async function handleSignOut() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
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
      </nav>

      {/* Bottom section */}
      <div className="border-t p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">
              {user?.email ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {user?.role ?? "—"}
            </p>
          </div>
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="flex-1 h-10"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
