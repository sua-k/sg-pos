import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart } from "lucide-react"

export default function POSPage() {
  return (
    <AppShell>
      <div className="flex h-full gap-4">
        {/* Left pane — Product grid (60%) */}
        <div className="flex-[3] rounded-lg border border-dashed border-border p-6">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold">Product Grid</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Product search and selection will appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Right pane — Cart (40%) */}
        <div className="flex-[2] rounded-lg border border-dashed border-border p-6">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Card className="w-full max-w-xs text-center">
              <CardHeader>
                <CardTitle className="text-base">Cart</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  POS Checkout — Coming Soon
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
