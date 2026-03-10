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
  const categoryTotals = new Map<string, number>()
  assets.forEach(a => {
    const label = a.category.charAt(0).toUpperCase() + a.category.slice(1)
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + a.currentValue)
  })
  if (properties.length > 0) {
    categoryTotals.set('Property', properties.reduce((s, p) => s + p.currentValue, 0))
  }
  const breakdownData = Array.from(categoryTotals.entries()).map(([name, value]) => ({
    name, value, color: '',
  }))

  const isEmpty = assets.length === 0 && properties.length === 0 && liabilities.length === 0

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

      {/* ── Compare strip — always visible ──────────────────────────── */}
      <Card className="rounded-xl bg-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-y-0 md:divide-x divide-border">

            {/* Savings Rate */}
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <PiggyBank className="h-3.5 w-3.5" />
                Savings Rate
              </div>
              <p className={`text-xl font-bold tabular-nums ${
                savingsRate > 0.2 ? 'text-emerald-500' : savingsRate > 0 ? 'text-foreground' : 'text-red-500'
              }`}>
                {formatPercent(savingsRate)}
              </p>
              <p className="text-xs text-muted-foreground">of monthly income</p>
            </div>

            {/* Debt Ratio */}
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <BarChart3 className="h-3.5 w-3.5" />
                Debt Ratio
              </div>
              <p className={`text-xl font-bold tabular-nums ${
                debtRatio < 0.5 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {formatPercent(debtRatio)}
              </p>
              <p className="text-xs text-muted-foreground">
                {debtRatio < 0.5 ? 'Healthy leverage' : 'High leverage'}
              </p>
            </div>

            {/* Monthly Surplus */}
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <TrendingUp className="h-3.5 w-3.5" />
                Monthly Surplus
              </div>
              <p className={`text-xl font-bold tabular-nums ${
                monthlyCashflow > 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {formatCurrency(monthlyCashflow)}
              </p>
              <p className="text-xs text-muted-foreground">available to allocate</p>
            </div>

          </div>
        </CardContent>
      </Card>

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
