'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ExpiringProduct {
  id: string
  name: string
  sku: string
  expiryDate?: string
  batchNumber: string | null
}

interface ExpiryAlertProps {
  products: ExpiringProduct[]
}

function getDaysSeverity(days: number): 'critical' | 'warning' | 'info' {
  if (days <= 7) return 'critical'
  if (days <= 14) return 'warning'
  return 'info'
}

export function ExpiryAlert({ products }: ExpiryAlertProps) {
  const now = new Date()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-yellow-500" />
          Expiry Alerts
          {products.length > 0 && (
            <span className="ml-auto text-xs font-normal bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {products.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <div className="px-6 pb-6 text-center text-sm text-muted-foreground py-4">
            No expiring products
          </div>
        ) : (
          <div className="divide-y">
            {products.map((product) => {
              const expiry = product.expiryDate ? new Date(product.expiryDate) : null
              const daysLeft = expiry ? differenceInDays(expiry, now) : null
              const severity = daysLeft !== null ? getDaysSeverity(daysLeft) : 'info'

              return (
                <div key={product.id} className="flex items-center justify-between px-6 py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku}
                      {product.batchNumber && ` · Batch: ${product.batchNumber}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : severity === 'warning'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {daysLeft !== null ? `${daysLeft}d left` : 'Unknown'}
                    </span>
                    {expiry && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(expiry, 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
