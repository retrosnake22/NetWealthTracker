import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'hero'
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: MetricCardProps) {
  const isHero = variant === 'hero'

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-xl bg-card',
        isHero && 'glow-emerald',
        className
      )}
    >
      <CardContent className={cn('p-6', isHero && 'p-8')}>
        <div className={cn('flex items-center justify-between', isHero && 'gap-6')}>
          <div className={cn('space-y-1', isHero && 'space-y-2')}>
            <p
              className={cn(
                'text-sm text-muted-foreground',
                isHero && 'text-base font-medium'
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                'font-bold tracking-tight',
                isHero ? 'text-4xl' : 'text-2xl',
                !isHero && trend === 'up' && 'text-emerald-500',
                !isHero && trend === 'down' && 'text-red-500',
                isHero && trend === 'up' && 'text-emerald-500',
                isHero && trend === 'down' && 'text-red-500',
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className={cn('text-muted-foreground', isHero ? 'text-sm' : 'text-xs')}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Icon badge */}
          <div
            className={cn(
              'shrink-0 rounded-xl p-3',
              isHero && 'gradient-emerald p-4',
              !isHero && trend === 'up' && 'bg-emerald-500/10',
              !isHero && trend === 'down' && 'bg-red-500/10',
              !isHero && (!trend || trend === 'neutral') && 'bg-primary/10',
            )}
          >
            <Icon
              className={cn(
                isHero ? 'h-7 w-7 text-white' : 'h-5 w-5',
                !isHero && trend === 'up' && 'text-emerald-500',
                !isHero && trend === 'down' && 'text-red-500',
                !isHero && (!trend || trend === 'neutral') && 'text-primary',
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
