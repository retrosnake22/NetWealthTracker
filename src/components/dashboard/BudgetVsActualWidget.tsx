import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, ArrowUpRight } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory } from '@/types/models'

const SUPER_CATEGORIES: { label: string; icon: string; categories: ExpenseCategory[] }[] = [
  { label: 'Housing', icon: '🏡', categories: ['rent', 'electricity', 'water', 'rates', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'home_insurance', 'insurance_pet', 'insurance_other'] },
  { label: 'Living', icon: '🛒', categories: ['groceries', 'household_goods', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
  { label: 'Lifestyle', icon: '✨', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', categories: ['hecs_repayment', 'tax', 'accounting_fees', 'other'] },
]

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

type TrafficLight = 'green' | 'yellow' | 'red' | 'none'

function getTrafficLight(budget: number, actual: number): TrafficLight {
  if (budget <= 0 || actual <= 0) return 'none'
  const ratio = actual / budget
  if (ratio <= 0.85) return 'green'
  if (ratio <= 1.0) return 'yellow'
  return 'red'
}

const trafficDot: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  none: 'bg-slate-300 dark:bg-white/20',
}

const trafficBarBg: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  none: 'bg-slate-300 dark:bg-white/20',
}

interface GroupSummary {
  label: string
  icon: string
  budget: number
  actual: number
  light: TrafficLight
}

export function BudgetVsActualWidget() {
  const { expenseBudgets, expenseActuals } = useFinanceStore()
  const currentMonth = getCurrentMonth()

  const { groups, totalBudget, totalActual, overallLight, hasAnyData } = useMemo(() => {
    // Build budget lookup: category → monthly budget total
    const budgetByCategory = new Map<string, { id: string; amount: number }>()
    for (const b of expenseBudgets) {
      if (b.linkedPropertyId || b.linkedAssetId) continue
      if (b.label.endsWith('Car Loan Repayment') || b.label.endsWith('Lease Payment')) continue
      const existing = budgetByCategory.get(b.category)
      budgetByCategory.set(b.category, {
        id: existing?.id ?? b.id,
        amount: (existing?.amount ?? 0) + b.monthlyBudget,
      })
    }

    // Build actuals lookup for current month: budgetId → actual amount
    const actualsByBudgetId = new Map<string, number>()
    for (const a of expenseActuals) {
      if (a.month !== currentMonth) continue
      actualsByBudgetId.set(a.budgetId, (actualsByBudgetId.get(a.budgetId) ?? 0) + a.actualAmount)
    }

    // Build a budgetId → category map so we can aggregate actuals by category
    const budgetIdToCategory = new Map<string, string>()
    for (const b of expenseBudgets) {
      budgetIdToCategory.set(b.id, b.category)
    }

    // Aggregate actuals by category
    const actualByCategory = new Map<string, number>()
    for (const [budgetId, amount] of actualsByBudgetId) {
      const cat = budgetIdToCategory.get(budgetId)
      if (cat) {
        actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + amount)
      }
    }

    let totalBudget = 0
    let totalActual = 0
    let hasAnyActuals = false

    const groups: GroupSummary[] = SUPER_CATEGORIES.map(group => {
      let groupBudget = 0
      let groupActual = 0

      for (const cat of group.categories) {
        const budget = budgetByCategory.get(cat)
        if (budget) groupBudget += budget.amount
        const actual = actualByCategory.get(cat) ?? 0
        groupActual += actual
      }

      totalBudget += groupBudget
      totalActual += groupActual
      if (groupActual > 0) hasAnyActuals = true

      return {
        label: group.label,
        icon: group.icon,
        budget: groupBudget,
        actual: groupActual,
        light: getTrafficLight(groupBudget, groupActual),
      }
    }).filter(g => g.budget > 0 || g.actual > 0)

    const overallLight = getTrafficLight(totalBudget, totalActual)
    const hasAnyData = expenseBudgets.filter(b => !b.linkedPropertyId && !b.linkedAssetId).length > 0

    return { groups, totalBudget, totalActual, overallLight, hasAnyData }
  }, [expenseBudgets, expenseActuals, currentMonth])

  if (!hasAnyData) {
    return (
      <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Budget vs Actual</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{getMonthLabel(currentMonth)}</p>
            </div>
          </div>
          <div className="text-center py-6">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">Set up your expense budget to track spending.</p>
            <Link
              to="/expenses/living"
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Set Up Budget <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="h-1 w-full bg-violet-500" style={{ opacity: 0.8 }} />
      </div>
    )
  }

  const variance = totalActual - totalBudget
  const overallTag = totalActual === 0 ? 'No Data' : overallLight === 'green' ? 'Under Budget' : overallLight === 'yellow' ? 'On Track' : 'Over Budget'
  const overallTagColor = totalActual === 0 ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
    : overallLight === 'green' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
    : overallLight === 'yellow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Budget vs Actual</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{getMonthLabel(currentMonth)}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${overallTagColor}`}>
            {overallTag}
          </span>
        </div>

        {/* Overall summary bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Spent
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatCurrency(totalActual)} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/ {formatCurrency(totalBudget)}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${trafficBarBg[overallLight]} transition-all duration-500`}
              style={{ width: `${totalBudget > 0 ? Math.min((totalActual / totalBudget) * 100, 100) : 0}%` }}
            />
          </div>
          {totalActual > 0 && (
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-xs font-semibold ${
                variance > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {variance > 0 ? '+' : ''}{formatCurrency(variance)} {variance > 0 ? 'over' : 'under'} budget
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {totalBudget > 0 ? `${((totalActual / totalBudget) * 100).toFixed(0)}%` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          {groups.map(group => {
            const pct = group.budget > 0 ? Math.min((group.actual / group.budget) * 100, 100) : 0

            return (
              <div key={group.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${trafficDot[group.light]}`} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {group.icon} {group.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                      {formatCurrency(group.actual)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      / {formatCurrency(group.budget)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${trafficBarBg[group.light]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Link to full actuals page */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {groups.reduce((s, g) => s + (g.actual > 0 ? 1 : 0), 0)}/{groups.length} categories tracked
          </span>
          <Link
            to="/expenses"
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            View Details <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Bottom accent */}
      <div className={`h-1 w-full ${
        totalActual === 0 ? 'bg-slate-300 dark:bg-white/10' :
        overallLight === 'green' ? 'bg-emerald-500' :
        overallLight === 'yellow' ? 'bg-amber-500' :
        'bg-rose-500'
      }`} style={{ opacity: 0.8 }} />
    </div>
  )
}
