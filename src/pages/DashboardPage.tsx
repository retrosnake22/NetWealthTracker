import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Building2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [showMore, setShowMore] = useState(false)
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings } = useFinanceStore()

  const netWealth = calculateNetWealth(assets, properties, liabilities)
  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const monthlyIncome = calculateMonthlyIncome(incomes)
  const monthlyExpenses = calculateMonthlyExpenses(expenseBudgets)
  const monthlyCashflow = calculateMonthlyCashflow(incomes, expenseBudgets)
  const savingsRate = calculateSavingsRate(incomes, expenseBudgets)
  const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)

  // Projection data
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
    name, value, color: ''
  }))

  const isEmpty = assets.length === 0 && properties.length === 0 && liabilities.length === 0

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your financial overview at a glance</p>
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to Net Wealth Tracker</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your properties, assets, income, and expenses to see your financial picture.
          </p>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Wealth"
          value={formatCurrency(netWealth)}
          icon={DollarSign}
          trend={netWealth >= 0 ? 'up' : 'down'}
        />
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
        />
        <MetricCard
          title="Total Liabilities"
          value={formatCurrency(totalLiabilities)}
          icon={Building2}
          trend={totalLiabilities > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Show More Metrics */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore ? (
          <>Hide Details <ChevronUp className="ml-2 h-4 w-4" /></>
        ) : (
          <>Show More Metrics <ChevronDown className="ml-2 h-4 w-4" /></>
        )}
      </Button>

      {showMore && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Savings Rate"
            value={formatPercent(savingsRate)}
            subtitle="of monthly income saved"
            icon={PiggyBank}
            trend={savingsRate > 0.2 ? 'up' : savingsRate > 0 ? 'neutral' : 'down'}
          />
          <MetricCard
            title="Debt-to-Asset Ratio"
            value={formatPercent(debtRatio)}
            subtitle={debtRatio < 0.5 ? 'Healthy' : 'High leverage'}
            icon={BarChart3}
            trend={debtRatio < 0.5 ? 'up' : 'down'}
          />
          <MetricCard
            title="Monthly Surplus"
            value={formatCurrency(monthlyCashflow)}
            subtitle="available to allocate"
            icon={TrendingUp}
            trend={monthlyCashflow > 0 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WealthChart data={projectionData} />
        </div>
        <AssetBreakdown data={breakdownData} />
      </div>
    </div>
  )
}
