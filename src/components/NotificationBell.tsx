import { useState, useMemo, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'

interface Notification {
  id: string
  type: 'warning' | 'info'
  title: string
  message: string
  linkTo?: string
  linkLabel?: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { userProfile } = useFinanceStore()
  const budgetMode = userProfile?.budgetMode ?? 'estimate'
  const estimatedMonthlyExpenses = userProfile?.estimatedMonthlyExpenses ?? 0

  // Build notification list
  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = []

    if (budgetMode === 'estimate') {
      items.push({
        id: 'budget-not-activated',
        type: 'warning',
        title: 'Detailed budget not activated',
        message: estimatedMonthlyExpenses > 0
          ? `You're using an estimated ${formatCurrency(estimatedMonthlyExpenses)}/mo for expenses. Activate the detailed budget for more accurate tracking.`
          : 'You haven\'t set up your expense budget yet. Set up a detailed budget to track spending by category.',
        linkTo: '/expenses/living',
        linkLabel: 'Set up budget',
      })
    }

    return items
  }, [budgetMode, estimatedMonthlyExpenses])

  const count = notifications.length

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">
            {count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">All caught up! No notifications.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${n.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      {n.linkTo && (
                        <Link
                          to={n.linkTo}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-2"
                        >
                          {n.linkLabel} <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
