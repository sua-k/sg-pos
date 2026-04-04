'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LowStockItem {
  id: string
  productName: string
  sku: string
  branchName: string
  quantity: string
}

interface LowStockAlertProps {
  items: LowStockItem[]
}

function getQuantitySeverity(quantity: string): 'critical' | 'warning' {
  return parseFloat(quantity) < 5 ? 'critical' : 'warning'
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Low Stock Alerts
          {items.length > 0 && (
            <span className="ml-auto text-xs font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="px-6 pb-6 text-center text-sm text-muted-foreground py-4">
            No low stock items
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const severity = getQuantitySeverity(item.quantity)
              return (
                <div key={item.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku} · {item.branchName}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full',
                      severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    )}
                  >
                    {parseFloat(item.quantity).toFixed(0)} left
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
