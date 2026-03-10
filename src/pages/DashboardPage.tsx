import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Building2, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { AssetBreakdown } from '@/components/dashboard/AssetBreakdown'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateMonthlyIncome, calculateMonthlyExpenses, calculateMonthlyCashflow,
  calculateSavingsRate, calculateDebtToAssetRatio, projectNetWealth
} from '@/lib/calculations'

function KpiCard({
  label,
  value,
  tag,
  tagColor,
  ratio,
  icon: Icon,
}: {
  label: string
  value: string
  tag: string
  tagColor: 'emerald' | 'amber' | 'red'
  ratio: number // 0-1 for progress bar
  icon: React.ComponentType<{ className?: string }>
}) {
  const barColor = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }[tagColor]

  const tagBg = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  }[tagColor]

  return (
    <Card className="rounded-xl bg-card card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${tagBg}`}>
            {tag}
          </span>
        </div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight mb-3">{value}</p>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full progress-fill ${barColor}`}
            style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings } = useFinanceStore()

  const netWealth        = calculateNetWealth(assets, properties, liabilities)
  const totalAssets      = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const monthlyIncome    = calculateMonthlyIncome(incomes)
  const monthlyExpenses  = calculateMonthlyExpenses(expenseBudgets)
  const monthlyCashflow  = calculateMonthlyCashflow(incomes, expenseBudgets)
  const savingsRate      = calculateSavingsRate(incomes, expenseBudgets)
  const debtRatio        = calculateDebtToAssetRatio(assets, properties, liabilities)

  // Projection data for chart
  const projectionData = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears
  )

  // Asset breakdown for pie chart
  const PIE_COLORS: Record<string, string> = {
    cash: '#10b981',
    property: '#3b82f6',
    stocks: '#6366f1',
    super: '#8b5cf6',
    vehicles: '#f59e0b',
    other: '#6b7280',
  }
  const categoryTotals = new Map<string, { value: number; color: string }>()
  assets.forEach(a => {
    const label = a.category.charAt(0).toUpperCase() + a.category.slice(1)
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
  const savingsTag = savingsRate > 0.2 ? 'Excellent' : savingsRate > 0.1 ? 'Good' : savingsRate > 0 ? 'Low' : 'None'
  const savingsColor = savingsRate > 0.2 ? 'emerald' as const : savingsRate > 0.1 ? 'emerald' as const : savingsRate > 0 ? 'amber' as const : 'red' as const
  const debtTag = debtRatio < 0.3 ? 'Healthy' : debtRatio < 0.5 ? 'Moderate' : 'High'
  const debtColor = debtRatio < 0.3 ? 'emerald' as const : debtRatio < 0.5 ? 'amber' as const : 'red' as const
  const surplusTag = monthlyCashflow > 500 ? 'Strong' : monthlyCashflow > 0 ? 'Positive' : 'Deficit'
  const surplusColor = monthlyCashflow > 500 ? 'emerald' as const : monthlyCashflow > 0 ? 'amber' as const : 'red' as const

  return (
    <div className="space-y-6">

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to Net Wealth Tracker</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your properties, assets, income, and expenses to see your financial picture.
          </p>
        </div>
      )}

      {/* ── Hero card — Net Wealth ───────────────────────────────────── */}
      <MetricCard
        variant="hero"
        title="Net Wealth"
        value={formatCurrency(netWealth)}
        subtitle={`Total Assets ${formatCurrency(totalAssets)} · Total Liabilities ${formatCurrency(totalLiabilities)}`}
        icon={DollarSign}
        trend={netWealth >= 0 ? 'up' : 'down'}
      />

      {/* ── KPI Cards with progress bars ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Savings Rate"
          value={formatPercent(savingsRate)}
          tag={savingsTag}
          tagColor={savingsColor}
          ratio={savingsRate}
          icon={PiggyBank}
        />
        <KpiCard
          label="Debt Ratio"
          value={formatPercent(debtRatio)}
          tag={debtTag}
          tagColor={debtColor}
          ratio={debtRatio}
          icon={BarChart3}
        />
        <KpiCard
          label="Monthly Surplus"
          value={formatCurrency(monthlyCashflow)}
          tag={surplusTag}
          tagColor={surplusColor}
          ratio={monthlyIncome > 0 ? monthlyCashflow / monthlyIncome : 0}
          icon={TrendingUp}
        />
      </div>

      {/* ── 3-card row: Cashflow · Assets · Liabilities ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Monthly Cashflow"
          value={formatCurrency(monthlyCashflow)}
          subtitle={`${formatCurrency(monthlyIncome)} in · ${formatCurrency(monthlyExpenses)} out`}
          icon={monthlyCashflow >= 0 ? TrendingUp : TrendingDown}
          trend={monthlyCashflow >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Assets"
          value={formatCurrency(totalAssets)}
          icon={PiggyBank}
          trend="neutral"
        />
        <MetricCard
          title="Total Liabilities"
          value={formatCurrency(totalLiabilities)}
          icon={Building2}
          trend={totalLiabilities > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* ── Charts — 2/3 + 1/3 ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WealthChart data={projectionData} />
        </div>
        <AssetBreakdown data={breakdownData} />
      </div>

    </div>
  )
}
