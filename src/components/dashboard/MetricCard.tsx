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
        'relative overflow-hidden rounded-xl bg-card card-hover',
        isHero && 'glow-emerald border-primary/20',
        className
      )}
    >
      {/* Hero gradient orb */}
      {isHero && (
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full shimmer pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--emerald-glow) 0%, transparent 70%)',
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
                'font-extrabold tracking-tight tabular-nums',
                isHero ? 'text-[42px] leading-none -tracking-[1.5px]' : 'text-2xl',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-red-500',
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
              isHero && 'gradient-emerald p-4 shadow-lg',
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
