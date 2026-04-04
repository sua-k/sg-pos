'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: 'green' | 'orange' | 'blue' | 'purple'
}

const colorMap = {
  green: {
    accent: 'bg-green-500',
    icon: 'bg-green-100 text-green-700',
    value: 'text-green-700',
  },
  orange: {
    accent: 'bg-orange-500',
    icon: 'bg-orange-100 text-orange-700',
    value: 'text-orange-700',
  },
  blue: {
    accent: 'bg-blue-500',
    icon: 'bg-blue-100 text-blue-700',
    value: 'text-blue-700',
  },
  purple: {
    accent: 'bg-purple-500',
    icon: 'bg-purple-100 text-purple-700',
    value: 'text-purple-700',
  },
}

export function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <Card className="relative overflow-hidden">
      {/* Left colored accent bar */}
      <div className={cn('absolute left-0 top-0 h-full w-1', colors.accent)} />
      <CardContent className="pl-6 pr-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className={cn('text-2xl font-bold mt-1 truncate', colors.value)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colors.icon)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
