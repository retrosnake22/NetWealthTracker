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
  breakdownItems?: Array<{ label: string; value: string; color: string }>
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  breakdownItems,
}: MetricCardProps) {
  const isHero = variant === 'hero'

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-xl bg-card',
        isHero && 'card-gradient-top glow-sapphire border-primary/20',
        !isHero && 'card-hover',
        className
      )}
    >
      {isHero && (
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full shimmer pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--sapphire-glow) 0%, transparent 70%)',
          }}
        />
      )}

      <CardContent className={cn('relative p-5', isHero && 'p-8')}>
        <div className={cn('flex items-center justify-between', isHero && 'gap-6')}>
          <div className={cn('space-y-1', isHero && 'space-y-2')}>
            <div className="flex items-center gap-2">
              {isHero && (
                <span className="inline-block w-2 h-2 rounded-full bg-primary pulse-dot" />
              )}
              <p
                className={cn(
                  'text-sm text-muted-foreground font-medium',
                  isHero && 'text-xs uppercase tracking-widest'
                )}
              >
                {title}
              </p>
            </div>
            <p
              className={cn(
                'font-extrabold tracking-tight tabular-nums animate-count',
                isHero ? 'text-[42px] leading-none -tracking-[1.5px]' : 'text-2xl',
                trend === 'up' && 'text-green-500',
                trend === 'down' && 'text-red-500',
              )}
            >
              {value}
            </p>
            {subtitle && !breakdownItems && (
              <p className={cn('text-muted-foreground', isHero ? 'text-sm' : 'text-xs')}>
                {subtitle}
              </p>
            )}
          </div>

          <div
            className={cn(
              'shrink-0 rounded-xl p-3',
              isHero && 'gradient-sapphire p-4 shadow-lg',
              !isHero && trend === 'up' && 'bg-green-500/10',
              !isHero && trend === 'down' && 'bg-red-500/10',
              !isHero && (!trend || trend === 'neutral') && 'bg-primary/10',
            )}
          >
            <Icon
              className={cn(
                isHero ? 'h-7 w-7 text-white' : 'h-5 w-5',
                !isHero && trend === 'up' && 'text-green-500',
                !isHero && trend === 'down' && 'text-red-500',
                !isHero && (!trend || trend === 'neutral') && 'text-primary',
              )}
            />
          </div>
        </div>

        {/* Breakdown row for hero */}
        {breakdownItems && breakdownItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/50">
            {breakdownItems.map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{item.label}</p>
                <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
