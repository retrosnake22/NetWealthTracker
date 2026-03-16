// NWT Dashboard
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, TrendingUp, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight, GripVertical, AlertTriangle, Target, Home, Landmark, TrendingDown, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { AssetBreakdown } from '@/components/dashboard/AssetBreakdown'
import { KpiBreakdownDialog, type BreakdownType } from '@/components/dashboard/KpiBreakdownDialog'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateDebtToAssetRatio, projectNetWealth,
  calculateDashboardMetrics,
  LIVING_EXPENSE_CATEGORIES,
} from '@/lib/calculations'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STORAGE_KEY = 'nwt-dashboard-order'
const DEFAULT_ORDER = ['hero', 'fi-tracker', 'cashflow-kpis', 'yearly-cashflow', 'expenses-chart', 'charts']

function loadOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const missing = DEFAULT_ORDER.filter(id => !parsed.includes(id))
      return [...parsed.filter((id: string) => DEFAULT_ORDER.includes(id)), ...missing]
    }
  } catch { /* ignore */ }
  return [...DEFAULT_ORDER]
}

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-80 scale-[1.01]' : ''}>
      <div className="relative group">
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md
                     text-muted-foreground/0 group-hover:text-muted-foreground/60
                     hover:!text-muted-foreground hover:bg-muted/50
                     transition-all cursor-grab active:cursor-grabbing
                     touch-none md:opacity-0 md:group-hover:opacity-100
                     opacity-40"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="pl-4 md:pl-0 md:group-hover:pl-4 transition-all">
          {children}
        </div>
      </div>
    </div>
  )
}

function CashflowBar({ label, amount, max, colorClass, icon: Icon }: {
  label: string
  amount: number
  max: number
  colorClass: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass.includes('green') || colorClass.includes('blue') ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`} />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function KpiCard({
  label, value, tag, tagColor, ratio, icon: Icon, accentColor, accentColorClass, onClick, subtitle,
}: {
  label: string
  value: string
  tag: string
  tagColor: 'green' | 'amber' | 'red'
  ratio?: number
  icon: React.ComponentType<{ className?: string }>
  accentColor: string
  accentColorClass: string
  onClick?: () => void
  subtitle?: string
}) {
  const tagStyles = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  }[tagColor]

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm h-full ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tagStyles}`}>
            {tag}
          </span>
        </div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white mb-3">{value}</p>
        {ratio !== undefined ? (
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${accentColorClass} transition-all duration-500`}
              style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
            />
          </div>
        ) : subtitle ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {/* Bottom accent bar */}
      <div className={`h-1 w-full ${accentColorClass}`} style={{ opacity: 0.8 }} />
    </div>
  )
}

// --- SVG Progress Ring for FI Tracker ---
function ProgressRing({ percent, size = 140, strokeWidth = 10 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPct = Math.min(Math.max(percent, 0), 100)
  const offset = circumference - (clampedPct / 100) * circumference

  // Color based on progress
  const strokeColor = clampedPct >= 100
    ? '#10b981' // emerald-500
    : clampedPct >= 50
      ? '#3b82f6' // blue-500
      : clampedPct >= 25
        ? '#f59e0b' // amber-500
        : '#ef4444' // red-500

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-slate-100 dark:text-white/10"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

export function DashboardPage() {
  const { assets, properties, liabilities, incomes, expenseBudgets, expenseActuals, projectionSettings, userProfile, dismissNotification } = useFinanceStore()
  const [widgetOrder, setWidgetOrder] = useState(loadOrder)
  const [breakdownOpen, setBreakdownOpen] = useState<BreakdownType>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetOrder))
  }, [widgetOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgetOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const netWealthIncSuper = calculateNetWealth(assets, properties, liabilities)
  const totalAssets       = calculateTotalAssets(assets, properties)
  const totalLiabilities  = calculateTotalLiabilities(liabilities)
  const superTotal        = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
  const netWealth         = netWealthIncSuper - superTotal

  // Use shared metrics so dashboard and breakdown dialogs always match
  const metrics = calculateDashboardMetrics(incomes, expenseBudgets, properties, liabilities, assets, expenseActuals, userProfile?.budgetMode, userProfile?.estimatedMonthlyExpenses, userProfile?.expenseCalcSource)
  const { monthlyIncome, monthlyExpenses, monthlyCashflow, savingsRate, usingActuals } = metrics
  const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)

  // --- Financial Independence Tracker ---
  // Passive income = rental + dividends + interest (from asset calculations, not manual store items)
  const passiveIncome = metrics.rentalIncome + metrics.interestIncome + metrics.dividendIncome
  const fiPercent = monthlyExpenses > 0 ? Math.min((passiveIncome / monthlyExpenses) * 100, 100) : 0
  const fiRemaining = Math.max(monthlyExpenses - passiveIncome, 0)
  const fiAchieved = passiveIncome >= monthlyExpenses && monthlyExpenses > 0
  const fiCapitalNeeded = fiRemaining > 0 ? (fiRemaining * 12) / 0.06 : 0

  // Passive income breakdown for display
  const fiBreakdown: { label: string; amount: number; icon: React.ComponentType<{ className?: string }> }[] = []
  if (metrics.rentalIncome > 0) fiBreakdown.push({ label: 'Rental Income', amount: metrics.rentalIncome, icon: Home })
  if (metrics.dividendIncome > 0) fiBreakdown.push({ label: 'Dividends', amount: metrics.dividendIncome, icon: BarChart3 })
  if (metrics.interestIncome > 0) fiBreakdown.push({ label: 'Interest', amount: metrics.interestIncome, icon: Landmark })

  // Dynamic label for Living Expenses based on budget mode and calc source
  const isEstimateMode = (userProfile?.budgetMode ?? 'estimate') === 'estimate'
  const livingExpenseLabel = isEstimateMode
    ? 'Living Expenses (estimate)'
    : usingActuals
      ? 'Living Expenses (actuals)'
      : 'Living Expenses (budget)'

  const projectionData = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears,
    projectionSettings.propertyGrowthOverride,
    projectionSettings.stockGrowthOverride,
    userProfile?.budgetMode,
    userProfile?.estimatedMonthlyExpenses
  )

  // Asset breakdown for pie chart
  const PIE_COLORS: Record<string, string> = {
    cash: '#f59e0b', property: '#3b82f6', stocks: '#6366f1',
    super: '#8b5cf6', vehicles: '#f97316', other: '#6b7280',
  }
  const categoryTotals = new Map<string, { value: number; color: string }>()
  assets.forEach(a => {
    const label = ({ cash: 'Cash & Savings', stocks: 'Shares / Stocks', super: 'Super', vehicles: 'Vehicles', other: 'Other' } as Record<string, string>)[a.category] ?? a.category.charAt(0).toUpperCase() + a.category.slice(1)
    const existing = categoryTotals.get(label)
    categoryTotals.set(label, {
      value: (existing?.value ?? 0) + a.currentValue,
      color: PIE_COLORS[a.category] ?? '#6b7280',
    })
  })
  if (properties.length > 0) {
    categoryTotals.set('Property', {
      value: properties.reduce((s, p) => s + p.currentValue, 0),
      color: PIE_COLORS.property,
    })
  }
  const breakdownData = Array.from(categoryTotals.entries()).map(([name, data]) => ({
    name, value: data.value, color: data.color,
  }))

  const isEmpty = assets.length === 0 && properties.length === 0 && liabilities.length === 0

  // KPI tags
  const savingsTag = savingsRate >= 50 ? 'Excellent' : savingsRate >= 30 ? 'Moderate' : savingsRate > 0 ? 'Low' : 'None'
  const savingsColor = savingsRate >= 50 ? 'green' as const : savingsRate >= 30 ? 'amber' as const : 'red' as const
  const debtTag = debtRatio < 0.3 ? 'Healthy' : debtRatio < 0.5 ? 'Moderate' : 'High'
  const debtColor = debtRatio < 0.3 ? 'green' as const : debtRatio < 0.5 ? 'amber' as const : 'red' as const
  const cashflowMax = Math.max(monthlyIncome, monthlyExpenses)

    // --- Yearly Cashflow ---
    const yearlyIncome = monthlyIncome * 12
    const yearlyExpenses = monthlyExpenses * 12
    const negGearingBenefitPA = metrics.negGearingBenefitPA ?? 0
    const yearlyEffectiveIncome = yearlyIncome + negGearingBenefitPA
    const yearlyCashflow = yearlyEffectiveIncome - yearlyExpenses
    const yearlyMax = Math.max(yearlyEffectiveIncome, yearlyExpenses)

  // Projection assumption labels
  const propGrowth = ((projectionSettings.propertyGrowthOverride ?? 0.07) * 100).toFixed(0)
  const stockGrowth = ((projectionSettings.stockGrowthOverride ?? 0.07) * 100).toFixed(0)

  const showBudgetBanner = (userProfile?.budgetMode ?? 'estimate') === 'estimate' && !(userProfile?.dismissedNotifications ?? []).includes('budget-not-activated')

  const expensesChartData = useMemo(() => {
    const data: { name: string; amount: number }[] = []

    // Budget baseline (living expenses only)
    data.push({ name: 'Budget', amount: metrics.baseExpenses })

    // Get living budget IDs to filter actuals
    const livingBudgetIds = new Set(
      expenseBudgets
        .filter(b => LIVING_EXPENSE_CATEGORIES.has(b.category) && !b.linkedPropertyId && !b.linkedAssetId)
        .map(b => b.id)
    )

    // Get unique months from actuals, sorted
    const months = [...new Set(expenseActuals.map(a => a.month))].sort()
    for (const month of months) {
      const monthActuals = expenseActuals.filter(a => a.month === month && livingBudgetIds.has(a.budgetId))
      const actualTotal = monthActuals.reduce((s, a) => s + a.actualAmount, 0)
      if (actualTotal > 0) {
        const [year, mo] = month.split('-')
        const label = new Date(parseInt(year), parseInt(mo) - 1).toLocaleString('default', { month: 'short' })
        data.push({ name: label, amount: actualTotal })
      }
    }

    return data
  }, [expenseActuals, expenseBudgets, metrics])

  const widgets: Record<string, React.ReactNode> = {
    hero: (
      <>
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-white">Welcome to Net Wealth Tracker</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Start by adding your properties, assets, income, and expenses to see your financial picture.
            </p>
          </div>
        )}

        {/* Hero Net Wealth Banner */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
          onClick={() => setBreakdownOpen('net-wealth')}
        >
          {/* Light mode: gradient background */}
          <div className="hidden dark:hidden sm:block absolute inset-0 bg-gradient-to-br from-blue-800 via-blue-600 to-blue-500" />
          {/* Dark mode: glass background */}
          <div className="hidden dark:block absolute inset-0 bg-white/[0.04] border border-white/10" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 dark:bg-white/[0.03]" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 dark:bg-white/[0.02]" />

          <div className="relative p-6 sm:p-8">
            {/* Mobile: simple card */}
            <div className="sm:hidden">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Wealth (excl. Super)</span>
              </div>
              <p className="text-3xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(netWealth)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Incl. Super: {formatCurrency(netWealthIncSuper)}</p>
            </div>

            {/* Desktop: full gradient banner */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-white/80 dark:bg-blue-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 dark:text-slate-400">Net Wealth (excl. Super)</span>
                  </div>
                  <p className="text-4xl sm:text-5xl font-extrabold tabular-nums text-white dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-300">
                    {formatCurrency(netWealth)}
                  </p>
                  <p className="text-sm text-white/60 dark:text-slate-400 mt-2">Incl. Super: {formatCurrency(netWealthIncSuper)}</p>
                </div>
                <div className="hidden lg:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 dark:bg-white/[0.06]">
                  <DollarSign className="h-8 w-8 text-white/80 dark:text-blue-400" />
                </div>
              </div>

              {/* Sub-stats bar */}
              <div className="mt-6 pt-4 border-t border-white/15 dark:border-white/10 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 dark:text-slate-500">Total Assets</span>
                  <p className="text-lg font-bold tabular-nums text-blue-200 dark:text-blue-400">{formatCurrency(totalAssets)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 dark:text-slate-500">Total Liabilities</span>
                  <p className="text-lg font-bold tabular-nums text-rose-300 dark:text-rose-400">{formatCurrency(totalLiabilities)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50 dark:text-slate-500">Monthly Surplus</span>
                  <p className={`text-lg font-bold tabular-nums ${monthlyCashflow >= 0 ? 'text-emerald-300 dark:text-emerald-400' : 'text-amber-300 dark:text-amber-400'}`}>
                    {formatCurrency(monthlyCashflow)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    ),

    'fi-tracker': (
      <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Financial Independence</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Passive income covering expenses</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
              fiAchieved
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : fiPercent >= 50
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  : fiPercent >= 25
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
            }`}>
              {fiAchieved ? 'Achieved!' : fiPercent >= 50 ? 'On Track' : fiPercent > 0 ? 'Building' : 'Not Started'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Progress Ring */}
            <div className="relative shrink-0">
              <ProgressRing percent={fiPercent} size={140} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {fiPercent.toFixed(0)}%
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Covered
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 w-full space-y-4">
              {/* Income vs Expenses bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Passive Income</span>
                    <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(passiveIncome)}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${monthlyExpenses > 0 ? Math.min((passiveIncome / monthlyExpenses) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Expenses</span>
                    <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(monthlyExpenses)}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-300 dark:bg-white/20 w-full" />
                  </div>
                </div>
              </div>

              {/* Gap / Surplus */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                {fiAchieved ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Monthly Surplus</span>
                    <span className="text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(passiveIncome - monthlyExpenses)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Still Needed</span>
                    <span className="text-lg font-extrabold tabular-nums text-rose-500 dark:text-rose-400">
                      {formatCurrency(fiRemaining)}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Capital needed callout */}
                {!fiAchieved && fiCapitalNeeded > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {formatCurrency(fiCapitalNeeded)} in capital needed
                        </p>
                        <p className="text-[11px] text-blue-600/70 dark:text-blue-400/60 mt-0.5">
                          At 6% annual return to cover remaining {formatCurrency(fiRemaining)}/mo in expenses
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passive income sources breakdown */}
              {fiBreakdown.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Income Sources</span>
                  {fiBreakdown.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {passiveIncome === 0 && monthlyExpenses === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                  Add income and expenses to track your path to financial independence.
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Bottom accent */}
        <div className={`h-1 w-full ${fiAchieved ? 'bg-emerald-500' : fiPercent >= 50 ? 'bg-blue-500' : fiPercent >= 25 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-white/10'}`} />
      </div>
    ),

    'cashflow-kpis': (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Monthly Cashflow Card */}
        <div
          className="relative rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm lg:col-span-1 h-full flex flex-col cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all"
          onClick={() => setBreakdownOpen('cashflow')}
        >
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Monthly Cashflow</span>
              {usingActuals && (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded-full">Actuals</span>
              )}
            </div>
            <div className="space-y-3">
              <CashflowBar label="Income" amount={monthlyIncome} max={cashflowMax} colorClass="bg-emerald-500" icon={ArrowUpRight} />
              <CashflowBar label={livingExpenseLabel} amount={metrics.baseExpenses} max={cashflowMax} colorClass="bg-rose-500" icon={ArrowDownRight} />
              {metrics.mortgageExpenses > 0 && (
                <CashflowBar label="Loan Repayments" amount={metrics.mortgageExpenses} max={cashflowMax} colorClass="bg-amber-500" icon={ArrowDownRight} />
              )}
              {metrics.propertyRunningCosts > 0 && (
                <CashflowBar label="Property Costs" amount={metrics.propertyRunningCosts} max={cashflowMax} colorClass="bg-violet-400" icon={ArrowDownRight} />
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Surplus</span>
                <span className={`text-lg font-extrabold tabular-nums ${monthlyCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(monthlyCashflow)}
                </span>
              </div>
            </div>
          </div>
          {/* Bottom accent */}
          <div className="h-1 w-full bg-blue-500" />
        </div>

        {/* 3 KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="h-full">
            <KpiCard
              label="Savings Rate"
              value={formatPercent(savingsRate / 100)}
              tag={savingsTag}
              tagColor={savingsColor}
              ratio={savingsRate / 100}
              icon={PiggyBank}
              accentColor={savingsColor === 'green' ? '#10b981' : savingsColor === 'amber' ? '#f59e0b' : '#f43f5e'}
              accentColorClass={savingsColor === 'green' ? 'bg-emerald-500' : savingsColor === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}
              onClick={() => setBreakdownOpen('savings-rate')}
            />
          </div>
          <div className="h-full">
            <KpiCard
              label="Debt Ratio"
              value={formatPercent(debtRatio)}
              tag={debtTag}
              tagColor={debtColor}
              ratio={debtRatio}
              icon={BarChart3}
              accentColor="#f59e0b"
              accentColorClass="bg-amber-500"
              onClick={() => setBreakdownOpen('debt-ratio')}
            />
          </div>
          <div className="h-full">
            <KpiCard
              label="Neg. Gearing Benefit"
              value={formatCurrency(metrics.negGearingBenefitPA)}
              tag={metrics.negGearingBenefitPA > 0 ? 'Active' : 'None'}
              tagColor={metrics.negGearingBenefitPA > 0 ? 'green' : 'amber'}
              subtitle={metrics.negGearingDeductiblePA > 0 ? `Total deductible: ${formatCurrency(metrics.negGearingDeductiblePA)}/yr` : 'No negatively geared properties'}
              icon={TrendingUp}
              accentColor="#8b5cf6"
              accentColorClass="bg-violet-500"
              onClick={() => setBreakdownOpen('neg-gearing')}
            />
          </div>
        </div>
      </div>
    ),

    'yearly-cashflow': (
      <div
        className="relative rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all"
        onClick={() => setBreakdownOpen('yearly-cashflow')}
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Yearly Cashflow</span>
            {negGearingBenefitPA > 0 && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded-full">Incl. Tax Benefits</span>
            )}
          </div>
          <div className="space-y-3">
            <CashflowBar label="Income" amount={yearlyIncome} max={yearlyMax} colorClass="bg-emerald-500" icon={ArrowUpRight} />
            {negGearingBenefitPA > 0 && (
              <CashflowBar label="Neg. Gearing Benefit" amount={negGearingBenefitPA} max={yearlyMax} colorClass="bg-teal-500" icon={TrendingUp} />
            )}
            <CashflowBar label="Expenses" amount={yearlyExpenses} max={yearlyMax} colorClass="bg-rose-500" icon={ArrowDownRight} />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Annual Surplus</span>
              <span className={`text-lg font-extrabold tabular-nums ${yearlyCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(yearlyCashflow)}
              </span>
            </div>
          </div>
        </div>
        {/* Bottom accent */}
        <div className="h-1 w-full bg-indigo-500" />
      </div>
    ),

    'expenses-chart': (
      <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="p-5 pb-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Living Expenses Trend</h3>
        </div>
        <div className="px-5 pb-5">
          {expensesChartData.length <= 1 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Track monthly actuals to see your expense trend over time.
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesChartData} margin={{ top: 25, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value)),
                      'Living Expenses',
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: 'var(--popover-foreground)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      backdropFilter: 'blur(8px)',
                    }}
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  />
                  <Bar dataKey="amount" fill="#818cf8" name="Living Expenses" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="amount" position="top" fill="#94a3b8" fontSize={12} formatter={(v: unknown) => `$${Number(v).toLocaleString()}`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    ),

    charts: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full">
          <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm h-full">
            <WealthChart data={projectionData} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
            Projection assumes {propGrowth}% p.a. property growth, {stockGrowth}% p.a. shares/super growth, and current monthly surplus reinvested.
            {' '}Adjust in <Link to="/projections" className="underline hover:text-slate-600 dark:hover:text-slate-300">Projections</Link>.
          </p>
        </div>
        <div className="h-full">
          <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm h-full">
            <AssetBreakdown data={breakdownData} />
          </div>
        </div>
      </div>
    ),
  }

  return (
    <>
      {showBudgetBanner && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Complete Your Setup</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your expenses are based on a monthly estimate. Activate the detailed budget in Living Expenses for category-level tracking.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <Link to="/expenses/living" className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">
                Set Up Budget <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => dismissNotification('budget-not-activated')}
                className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id}>
                {widgets[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <KpiBreakdownDialog open={breakdownOpen} onClose={() => setBreakdownOpen(null)} />
    </>
  )
}
