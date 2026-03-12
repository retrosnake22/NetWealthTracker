import { useState, useMemo, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Calendar, ClipboardList, X, ArrowRight } from 'lucide-react'
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
  const {
    userProfile, dismissNotification,
    assets, properties, liabilities, incomes, expenseBudgets,
  } = useFinanceStore()
  const budgetMode = userProfile?.budgetMode ?? 'estimate'
  const estimatedMonthlyExpenses = userProfile?.estimatedMonthlyExpenses ?? 0
  const dismissedNotifications = userProfile?.dismissedNotifications ?? []

  // Build notification list
  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = []

    // 1. Budget not activated
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

    // 2. Monthly actuals reminder — 2 days before end of month
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysRemaining = lastDay - now.getDate()
    if (daysRemaining <= 2) {
      const monthName = now.toLocaleString('default', { month: 'long' })
      // Use month-specific ID so it resets each month
      const actualsId = `actuals-reminder-${now.getFullYear()}-${now.getMonth()}`
      items.push({
        id: actualsId,
        type: 'info',
        title: `Update your ${monthName} actuals`,
        message: `The month is almost over. Record your actual spending for ${monthName} to track how you went against your budget.`,
        linkTo: '/expenses/living',
        linkLabel: 'Update actuals',
      })
    }

    // 3. Complete your setup — check unfilled wizard areas
    const missingAreas: string[] = []
    if (assets.length === 0 && properties.length === 0) missingAreas.push('Assets & Properties')
    else if (assets.length === 0) missingAreas.push('Non-property Assets (cash, stocks, super)')
    else if (properties.length === 0) missingAreas.push('Properties')
    if (liabilities.length === 0) missingAreas.push('Liabilities')
    if (incomes.length === 0) missingAreas.push('Income')
    if (budgetMode === 'estimate' && estimatedMonthlyExpenses === 0 && expenseBudgets.length === 0) {
      missingAreas.push('Expenses')
    }

    if (missingAreas.length > 0) {
      items.push({
        id: 'complete-setup',
        type: 'warning',
        title: 'Complete your financial setup',
        message: `You haven't entered data for: ${missingAreas.join(', ')}. Complete these to get accurate insights.`,
        linkTo: '/wizard',
        linkLabel: 'Open setup wizard',
      })
    }

    return items.filter(n => !dismissedNotifications.includes(n.id))
  }, [budgetMode, estimatedMonthlyExpenses, dismissedNotifications, assets, properties, liabilities, incomes, expenseBudgets])

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

  const getIcon = (n: Notification) => {
    if (n.id.startsWith('actuals-reminder')) return <Calendar className="h-4 w-4" />
    if (n.id === 'complete-setup') return <ClipboardList className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

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
            <div className="flex items-center gap-1">
              {notifications.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    notifications.forEach(n => dismissNotification(n.id))
                  }}
                >
                  Dismiss all
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
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
                      {getIcon(n)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {n.linkTo && (
                          <Link
                            to={n.linkTo}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                          >
                            {n.linkLabel} <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(n.id) }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
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
