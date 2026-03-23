import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DollarSign, TrendingUp, Target, BarChart3, Calendar,
  PiggyBank, BarChart, CreditCard, LineChart, Eye, EyeOff,
  RotateCcw,
} from 'lucide-react'

const STORAGE_KEY = 'nwt-dashboard-hidden-widgets'

export const WIDGET_META: { id: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'hero', label: 'Net Wealth Banner', description: 'Hero banner with net wealth, assets, liabilities', icon: DollarSign },
  { id: 'net-worth-history', label: 'Net Worth History', description: 'Monthly snapshot chart tracking net worth over time', icon: LineChart },
  { id: 'financial-goals', label: 'Financial Goals', description: 'Goal tracking with progress bars', icon: Target },
  { id: 'fi-tracker', label: 'Financial Independence', description: 'Passive income vs expenses tracker', icon: Target },
  { id: 'cashflow-kpis', label: 'Cashflow & KPIs', description: 'Monthly cashflow, savings rate, debt ratio', icon: BarChart3 },
  { id: 'yearly-cashflow', label: 'Yearly Cashflow', description: 'Annual income vs expenses breakdown', icon: Calendar },
  { id: 'budget-vs-actual', label: 'Budget vs Actual', description: 'Compare budgeted vs actual spending', icon: PiggyBank },
  { id: 'expenses-chart', label: 'Expenses Trend', description: 'Living expenses bar chart over time', icon: BarChart },
  { id: 'debt-timeline', label: 'Debt Payoff Timeline', description: 'Projected debt payoff schedule', icon: CreditCard },
  { id: 'charts', label: 'Projections & Breakdown', description: 'Wealth projection chart and asset pie chart', icon: TrendingUp },
]

export function loadHiddenWidgets(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set()
}

function saveHiddenWidgets(hidden: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]))
}

export function DashboardSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hidden, setHidden] = useState<Set<string>>(() => loadHiddenWidgets())

  // Re-read from localStorage when dialog opens
  useEffect(() => {
    if (open) setHidden(loadHiddenWidgets())
  }, [open])

  const toggle = (id: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveHiddenWidgets(next)
      return next
    })
  }

  const resetAll = () => {
    const empty = new Set<string>()
    saveHiddenWidgets(empty)
    setHidden(empty)
  }

  const hiddenCount = hidden.size
  const visibleCount = WIDGET_META.length - hiddenCount

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Dashboard Widgets
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Toggle which widgets appear on your dashboard. {visibleCount} of {WIDGET_META.length} visible.
        </p>

        <div className="space-y-1 max-h-[400px] overflow-y-auto -mx-1 px-1">
          {WIDGET_META.map(({ id, label, description, icon: Icon }) => {
            const isVisible = !hidden.has(id)
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isVisible
                    ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                    : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                  isVisible
                    ? 'bg-blue-100 dark:bg-blue-500/20'
                    : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${isVisible ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/50'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 truncate">
                    {description}
                  </div>
                </div>
                {isVisible ? (
                  <Eye className="h-4 w-4 text-blue-500 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            disabled={hiddenCount === 0}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Show All
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
