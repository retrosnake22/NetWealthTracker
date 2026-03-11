import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateTotalAssets, calculateTotalLiabilities,
  calculateMonthlyIncome, calculateMonthlyExpenses,
  calculateTotalNegativeGearingBenefit,
} from '@/lib/calculations'
import type { CashAsset, Liability } from '@/types/models'
import { useNavigate } from 'react-router-dom'

export type BreakdownType = 'net-wealth' | 'cashflow' | 'savings-rate' | 'debt-ratio' | 'surplus' | null

interface Props {
  open: BreakdownType
  onClose: () => void
}

function Row({ label, value, color, bold, indent }: { label: string; value: string; color?: string; bold?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-4' : ''} ${bold ? 'border-t border-border pt-2 mt-1' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm font-mono tabular-nums ${bold ? 'font-semibold' : ''} ${color ?? 'text-foreground'}`}>{value}</span>
    </div>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 mt-3 block"
    >
      Go to {label} →
    </button>
  )
}

function getMonthlyRepayment(l: Liability): number {
  const repayment = l.minimumRepayment ?? 0
  switch (l.repaymentFrequency) {
    case 'weekly': return repayment * 52 / 12
    case 'fortnightly': return repayment * 26 / 12
    case 'monthly': return repayment
    default: return repayment
  }
}

export function KpiBreakdownDialog({ open, onClose }: Props) {
  const { assets, properties, liabilities, incomes, expenseBudgets } = useFinanceStore()

  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const netWealth = totalAssets - totalLiabilities
  const superAssets = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
  const netWealthExclSuper = netWealth - superAssets

  const monthlyIncome = calculateMonthlyIncome(incomes)
  const baseExpenses = calculateMonthlyExpenses(expenseBudgets)

  // Mortgage repayments
  const mortgageExpenses = liabilities.reduce((sum, l) => sum + getMonthlyRepayment(l), 0)

  // Property running costs
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

  // Negative gearing
  const salaryIncome = incomes.find(i => i.isActive && i.category === 'salary')
  const grossSalary = salaryIncome?.grossAnnualSalary ?? (salaryIncome ? salaryIncome.monthlyAmount * 12 : 0)
  const cashAssets = assets.filter(a => a.category === 'cash') as CashAsset[]
  const negGearingPA = calculateTotalNegativeGearingBenefit(properties, liabilities, cashAssets, grossSalary)

  const monthlyCashflow = monthlyIncome - monthlyExpenses + negGearingPA / 12
  const savingsRate = monthlyIncome > 0 ? (monthlyCashflow / monthlyIncome) * 100 : 0
  const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0

  // Asset breakdown by category
  const categoryLabels: Record<string, string> = {
    cash: 'Cash & Savings', stocks: 'Shares / Stocks', super: 'Superannuation',
    vehicles: 'Vehicles', other: 'Other',
  }
  const assetsByCategory = new Map<string, number>()
  assets.forEach(a => {
    const label = categoryLabels[a.category] ?? a.category
    assetsByCategory.set(label, (assetsByCategory.get(label) ?? 0) + a.currentValue)
  })
  if (properties.length > 0) {
    assetsByCategory.set('Property', properties.reduce((s, p) => s + p.currentValue, 0))
  }

  // Liability breakdown by category
  const liabCategoryLabels: Record<string, string> = {
    mortgage: 'Mortgages', home_loan: 'Home Loans', investment_loan: 'Investment Loans',
    car_loan: 'Car Loans', personal_loan: 'Personal Loans', credit_card: 'Credit Cards',
    hecs: 'HECS-HELP', other: 'Other',
  }
  const liabByCategory = new Map<string, number>()
  liabilities.forEach(l => {
    const label = liabCategoryLabels[l.category] ?? l.category
    liabByCategory.set(label, (liabByCategory.get(label) ?? 0) + l.currentBalance)
  })

  // Income breakdown
  const incomeBySource = incomes.filter(i => i.isActive).map(i => ({
    label: i.name,
    amount: i.monthlyAmount,
  }))

  // Expense breakdown (top categories)
  const expensesByCategory = new Map<string, number>()
  expenseBudgets.filter(e => e.monthlyBudget > 0).forEach(e => {
    const label = e.label ?? e.category
    expensesByCategory.set(label, (expensesByCategory.get(label) ?? 0) + e.monthlyBudget)
  })

  const titles: Record<string, string> = {
    'net-wealth': 'Net Wealth Breakdown',
    'cashflow': 'Monthly Cashflow Breakdown',
    'savings-rate': 'Savings Rate Breakdown',
    'debt-ratio': 'Debt Ratio Breakdown',
    'surplus': 'Monthly Surplus Breakdown',
  }

  return (
    <Dialog open={open !== null} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{open ? titles[open] : ''}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tap any line to understand how this figure is calculated.
          </DialogDescription>
        </DialogHeader>

        {open === 'net-wealth' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assets</p>
            {Array.from(assetsByCategory.entries()).map(([label, value]) => (
              <Row key={label} label={label} value={formatCurrency(value)} indent />
            ))}
            <Row label="Total Assets" value={formatCurrency(totalAssets)} bold color="text-blue-400" />

            <div className="h-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Liabilities</p>
            {Array.from(liabByCategory.entries()).map(([label, value]) => (
              <Row key={label} label={label} value={formatCurrency(value)} indent />
            ))}
            <Row label="Total Liabilities" value={formatCurrency(totalLiabilities)} bold color="text-red-400" />

            <div className="h-3" />
            <Row label="Net Wealth (excl. Super)" value={formatCurrency(netWealthExclSuper)} bold />
            <Row label="Net Wealth (incl. Super)" value={formatCurrency(netWealth)} bold color="text-blue-400" />

            <NavLink to="/assets/cash" label="Assets" />
          </div>
        )}

        {open === 'cashflow' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Income</p>
            {incomeBySource.map(i => (
              <Row key={i.label} label={i.label} value={formatCurrency(i.amount)} indent />
            ))}
            <Row label="Total Income" value={formatCurrency(monthlyIncome)} bold color="text-blue-400" />

            <div className="h-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expenses</p>
            <Row label="Budget expenses" value={formatCurrency(baseExpenses)} indent />
            <Row label="Mortgage repayments" value={formatCurrency(mortgageExpenses)} indent />
            <Row label="Property running costs" value={formatCurrency(propertyRunningCosts)} indent />
            <Row label="Total Expenses" value={formatCurrency(monthlyExpenses)} bold color="text-red-400" />

            {negGearingPA > 0 && (
              <>
                <div className="h-3" />
                <Row label="Neg. gearing tax benefit" value={formatCurrency(negGearingPA / 12)} color="text-green-400" />
              </>
            )}

            <div className="h-3" />
            <Row label="Net Cashflow" value={formatCurrency(monthlyCashflow)} bold color={monthlyCashflow >= 0 ? 'text-blue-400' : 'text-red-400'} />

            <NavLink to="/income" label="Income" />
          </div>
        )}

        {open === 'savings-rate' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Formula</p>
            <div className="bg-muted/50 rounded-lg p-3 text-center mb-3">
              <p className="text-xs text-muted-foreground">Savings Rate = Monthly Surplus ÷ Monthly Income × 100</p>
            </div>

            <Row label="Monthly Income" value={formatCurrency(monthlyIncome)} />
            <Row label="Monthly Expenses" value={formatCurrency(monthlyExpenses)} />
            {negGearingPA > 0 && (
              <Row label="Neg. gearing benefit" value={formatCurrency(negGearingPA / 12)} color="text-green-400" />
            )}
            <Row label="Monthly Surplus" value={formatCurrency(monthlyCashflow)} color={monthlyCashflow >= 0 ? 'text-blue-400' : 'text-red-400'} />

            <div className="h-3" />
            <Row label="Savings Rate" value={formatPercent(savingsRate / 100)} bold color={savingsRate >= 0 ? 'text-blue-400' : 'text-red-400'} />

            <div className="h-3" />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                {savingsRate >= 20 ? '🟢 Excellent — you\'re saving over 20% of income.'
                  : savingsRate >= 10 ? '🟡 Good — aim for 20%+ for faster wealth growth.'
                  : savingsRate >= 0 ? '🟠 Low — look for ways to reduce expenses or increase income.'
                  : '🔴 Negative — you\'re spending more than you earn.'}
              </p>
            </div>

            <NavLink to="/expenses" label="Expenses" />
          </div>
        )}

        {open === 'debt-ratio' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Formula</p>
            <div className="bg-muted/50 rounded-lg p-3 text-center mb-3">
              <p className="text-xs text-muted-foreground">Debt Ratio = Total Liabilities ÷ Total Assets × 100</p>
            </div>

            <Row label="Total Assets" value={formatCurrency(totalAssets)} color="text-blue-400" />
            <Row label="Total Liabilities" value={formatCurrency(totalLiabilities)} color="text-red-400" />

            <div className="h-3" />
            <Row label="Debt Ratio" value={formatPercent(debtRatio)} bold color={debtRatio < 0.5 ? 'text-blue-400' : 'text-red-400'} />

            <div className="h-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Liabilities Detail</p>
            {liabilities.map(l => (
              <Row key={l.id} label={l.name} value={formatCurrency(l.currentBalance)} indent />
            ))}

            <div className="h-3" />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                {debtRatio < 0.3 ? '🟢 Healthy — your debt is well below 30% of assets.'
                  : debtRatio < 0.5 ? '🟡 Moderate — consider accelerating debt repayment.'
                  : '🔴 High — debt exceeds 50% of assets. Focus on paying down high-interest debt.'}
              </p>
            </div>

            <NavLink to="/liabilities" label="Liabilities" />
          </div>
        )}

        {open === 'surplus' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Income</p>
            {incomeBySource.map(i => (
              <Row key={i.label} label={i.label} value={formatCurrency(i.amount)} indent />
            ))}
            <Row label="Total Income" value={formatCurrency(monthlyIncome)} bold color="text-blue-400" />

            <div className="h-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expenses</p>
            <Row label="Budget expenses" value={`(${formatCurrency(baseExpenses)})`} indent color="text-red-400" />
            <Row label="Mortgage repayments" value={`(${formatCurrency(mortgageExpenses)})`} indent color="text-red-400" />
            {propertyRunningCosts > 0 && (
              <Row label="Property running costs" value={`(${formatCurrency(propertyRunningCosts)})`} indent color="text-red-400" />
            )}
            <Row label="Total Expenses" value={`(${formatCurrency(monthlyExpenses)})`} bold color="text-red-400" />

            {negGearingPA > 0 && (
              <>
                <div className="h-3" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tax Benefits</p>
                <Row label="Neg. gearing benefit" value={formatCurrency(negGearingPA / 12)} indent color="text-green-400" />
              </>
            )}

            <div className="h-3" />
            <Row label="Monthly Surplus" value={formatCurrency(monthlyCashflow)} bold color={monthlyCashflow >= 0 ? 'text-green-400' : 'text-red-400'} />
            <Row label="Annual Surplus" value={formatCurrency(monthlyCashflow * 12)} color="text-muted-foreground" />

            <NavLink to="/projections" label="Projections" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
