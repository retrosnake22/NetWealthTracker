// NWT Dashboard
import { DollarSign, TrendingUp, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { AssetBreakdown } from '@/components/dashboard/AssetBreakdown'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateMonthlyIncome, calculateMonthlyExpenses,
  calculateSavingsRate, calculateDebtToAssetRatio, projectNetWealth
} from '@/lib/calculations'

function CashflowBar({ label, amount, max, color, icon: Icon }: {
  label: string
  amount: number
  max: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color.includes('blue') ? 'text-blue-400' : 'text-red-400'}`} />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} progress-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function KpiCard({
  label, value, tag, tagColor, ratio, icon: Icon, accentColor,
}: {
  label: string
  value: string
  tag: string
  tagColor: 'blue' | 'amber' | 'red'
  ratio: number
  icon: React.ComponentType<{ className?: string }>
  accentColor: string
}) {
  const barColor = { blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tagColor]
  const tagBg = {
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  }[tagColor]

  return (
    <Card
      className="rounded-xl bg-card card-hover card-accent-left h-full"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      <CardContent className="p-5 pl-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${tagBg}`}>
            {tag}
          </span>
        </div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight mb-3 animate-count">{value}</p>
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

  const netWealthIncSuper = calculateNetWealth(assets, properties, liabilities)
  const totalAssets       = calculateTotalAssets(assets, properties)
  const totalLiabilities  = calculateTotalLiabilities(liabilities)
  const superTotal        = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
  const netWealth         = netWealthIncSuper - superTotal

  // Base income + rental income from investment properties
  const baseIncome = calculateMonthlyIncome(incomes)
  const rentalIncome = properties
    .filter(p => p.type === 'investment' && (p.weeklyRent ?? 0) > 0)
    .reduce((sum, p) => sum + ((p.weeklyRent ?? 0) * 52) / 12, 0)
  const monthlyIncome = baseIncome + rentalIncome

  // Base expenses + mortgage repayments + property running costs
  const baseExpenses = calculateMonthlyExpenses(expenseBudgets)
  const mortgageExpenses = liabilities.reduce((sum, l) => {
    const repayment = l.minimumRepayment ?? 0
    if (l.repaymentFrequency === 'weekly') return sum + (repayment * 52) / 12
    if (l.repaymentFrequency === 'fortnightly') return sum + (repayment * 26) / 12
    return sum + repayment
  }, 0)
  const propertyRunningCosts = properties.reduce((sum, p) => {
    return sum
      + (p.councilRatesPA ?? 0) / 12
      + (p.waterRatesPA ?? 0) / 12
      + (p.insurancePA ?? 0) / 12
      + (p.strataPA ?? 0) / 12
      + (p.maintenanceBudgetPA ?? 0) / 12
      + ((p.propertyManagementPct ?? 0) / 100) * (p.weeklyRent ?? 0) * 52 / 12
      + (p.landTaxPA ?? 0) / 12
  }, 0)
  const monthlyExpenses = baseExpenses + mortgageExpenses + propertyRunningCosts

  const monthlyCashflow = monthlyIncome - monthlyExpenses
  const savingsRate      = calculateSavingsRate(incomes, expenseBudgets)
  const debtRatio        = calculateDebtToAssetRatio(assets, properties, liabilities)

  const projectionData = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears,
    projectionSettings.propertyGrowthOverride,
    projectionSettings.stockGrowthOverride
  )

  // Asset breakdown for pie chart
  const PIE_COLORS: Record<string, string> = {
    cash: '#f59e0b', property: '#3b82f6', stocks: '#6366f1',
    super: '#8b5cf6', vehicles: '#f97316', other: '#6b7280',
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
  const savingsColor = savingsRate > 0.2 ? 'blue' as const : savingsRate > 0.1 ? 'blue' as const : savingsRate > 0 ? 'amber' as const : 'red' as const
  const debtTag = debtRatio < 0.3 ? 'Healthy' : debtRatio < 0.5 ? 'Moderate' : 'High'
  const debtColor = debtRatio < 0.3 ? 'blue' as const : debtRatio < 0.5 ? 'amber' as const : 'red' as const
  const surplusTag = monthlyCashflow > 500 ? 'Strong' : monthlyCashflow > 0 ? 'Positive' : 'Deficit'
  const surplusColor = monthlyCashflow > 500 ? 'blue' as const : monthlyCashflow > 0 ? 'amber' as const : 'red' as const

  const cashflowMax = Math.max(monthlyIncome, monthlyExpenses)

  return (
    <div className="space-y-6">

      {/* ── Empty state ─── */}
      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center animate-fade-up">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to Net Wealth Tracker</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your properties, assets, income, and expenses to see your financial picture.
          </p>
        </div>
      )}

      {/* ── Hero card — Net Wealth with breakdown ─── */}
      <div className="animate-fade-up">
        <MetricCard
          variant="hero"
          title="Net Wealth (excl. Super)"
          value={formatCurrency(netWealth)}
          subtitle={`Incl. Super: ${formatCurrency(netWealthIncSuper)}`}
          icon={DollarSign}
          trend={netWealth >= 0 ? 'up' : 'down'}
          breakdownItems={[
            { label: 'Total Assets',     value: formatCurrency(totalAssets),      color: '#60A5FA' },
            { label: 'Total Liabilities', value: formatCurrency(totalLiabilities), color: '#f87171' },
            { label: 'Monthly Surplus',  value: formatCurrency(monthlyCashflow),  color: monthlyCashflow >= 0 ? '#3b82f6' : '#f59e0b' },
          ]}
        />
      </div>

      {/* ── Cashflow + KPIs row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">

        {/* Cashflow bar chart */}
        <Card className="rounded-xl bg-card lg:col-span-1 animate-fade-up animate-delay-1 h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Cashflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CashflowBar
              label="Income"
              amount={monthlyIncome}
              max={cashflowMax}
              color="bg-blue-500"
              icon={ArrowUpRight}
            />
            <CashflowBar
              label="Expenses"
              amount={monthlyExpenses}
              max={cashflowMax}
              color="bg-red-400"
              icon={ArrowDownRight}
            />
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Surplus</span>
                <span className={`text-lg font-bold tabular-nums ${monthlyCashflow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(monthlyCashflow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="animate-fade-up animate-delay-2 h-full">
            <KpiCard
              label="Savings Rate"
              value={formatPercent(savingsRate)}
              tag={savingsTag}
              tagColor={savingsColor}
              ratio={savingsRate}
              icon={PiggyBank}
              accentColor="#3B82F6"
            />
          </div>
          <div className="animate-fade-up animate-delay-3 h-full">
            <KpiCard
              label="Debt Ratio"
              value={formatPercent(debtRatio)}
              tag={debtTag}
              tagColor={debtColor}
              ratio={debtRatio}
              icon={BarChart3}
              accentColor="#f87171"
            />
          </div>
          <div className="animate-fade-up animate-delay-4 h-full">
            <KpiCard
              label="Monthly Surplus"
              value={formatCurrency(monthlyCashflow)}
              tag={surplusTag}
              tagColor={surplusColor}
              ratio={monthlyIncome > 0 ? monthlyCashflow / monthlyIncome : 0}
              icon={TrendingUp}
              accentColor="#3b82f6"
            />
          </div>
        </div>
      </div>

      {/* ── Charts — 2/3 + 1/3 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 animate-fade-up animate-delay-5">
          <WealthChart data={projectionData} />
        </div>
        <div className="animate-fade-up animate-delay-6">
          <AssetBreakdown data={breakdownData} />
        </div>
      </div>

    </div>
  )
}
