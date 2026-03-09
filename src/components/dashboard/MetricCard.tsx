import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn(
              "text-2xl font-bold tracking-tight",
              trend === 'up' && "text-emerald-500",
              trend === 'down' && "text-red-500",
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl",
            trend === 'up' && "bg-emerald-500/10",
            trend === 'down' && "bg-red-500/10",
            !trend && "bg-primary/10",
          )}>
            <Icon className={cn(
              "h-5 w-5",
              trend === 'up' && "text-emerald-500",
              trend === 'down' && "text-red-500",
              !trend && "text-primary",
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
