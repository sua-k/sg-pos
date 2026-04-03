import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt } from "lucide-react"

export default function TransactionsPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Coming Soon — Transaction history and receipt management will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
