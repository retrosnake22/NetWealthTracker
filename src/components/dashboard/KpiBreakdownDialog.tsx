import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateTotalAssets, calculateTotalLiabilities,
  calculateDashboardMetrics,
  calculateTotalNegativeGearingBenefit,
} from '@/lib/calculations'
import type { CashAsset } from '@/types/models'
import { getMarginalTaxRate } from '@/lib/ausTax'
import { useNavigate } from 'react-router-dom'

export type BreakdownType = 'net-wealth' | 'cashflow' | 'yearly-cashflow' | 'savings-rate' | 'debt-ratio' | 'surplus' | 'neg-gearing' | null

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

export function KpiBreakdownDialog({ open, onClose }: Props) {
  const { assets, properties, liabilities, incomes, expenseBudgets, expenseActuals, userProfile } = useFinanceStore()

  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const netWealth = totalAssets - totalLiabilities
  const superAssets = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
  const netWealthExclSuper = netWealth - superAssets

  // Use shared metrics so figures always match the dashboard
  const metrics = calculateDashboardMetrics(incomes, expenseBudgets, properties, liabilities, assets, expenseActuals, userProfile?.budgetMode, userProfile?.estimatedMonthlyExpenses, userProfile?.expenseCalcSource)
  const {
    rentalIncome, interestIncome, dividendIncome, monthlyIncome,
    baseExpenses, mortgageExpenses, propertyRunningCosts, monthlyExpenses,
    negGearingBenefitPA: negGearingPA, offsetInterestSavedMonthly, monthlyCashflow, savingsRate,
  } = metrics
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

  // Income breakdown (include rental, interest, dividends)
  const incomeBySource: { label: string; amount: number }[] = incomes.filter(i => i.isActive).map(i => ({
    label: i.name,
    amount: i.monthlyAmount,
  }))
  if (rentalIncome > 0) {
    properties
      .filter(p => p.type === 'investment' && (p.weeklyRent ?? 0) > 0)
      .forEach(p => {
        incomeBySource.push({
          label: `${p.name} (rent)`,
          amount: ((p.weeklyRent ?? 0) * 52) / 12,
        })
      })
  }
  if (interestIncome > 0) {
    assets
      .filter(a => a.category === 'cash' && !(a as CashAsset).isOffset && (a.growthRatePA > 0 || ((a as CashAsset).interestRatePA ?? 0) > 0))
      .forEach(a => {
        const rate = (a as CashAsset).interestRatePA ?? a.growthRatePA
        incomeBySource.push({
          label: `${a.name} (interest)`,
          amount: (a.currentValue * rate) / 12,
        })
      })
  }
  if (dividendIncome > 0) {
    assets
      .filter(a => a.category === 'stocks' && (a as any).paysDividends && ((a as any).dividendYieldPA ?? 0) > 0)
      .forEach(a => {
        incomeBySource.push({
          label: `${a.name} (dividends)`,
          amount: (a.currentValue * ((a as any).dividendYieldPA ?? 0)) / 12,
        })
      })
  }

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
    'yearly-cashflow': 'Yearly Cashflow Breakdown',
    'surplus': 'Monthly Surplus Breakdown',
    'neg-gearing': 'Negative Gearing Breakdown',
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

        {open === 'cashflow' && (() => {
          const budgetMode = userProfile?.budgetMode ?? 'estimate'
          const isEstimate = budgetMode === 'estimate'
          const expenseLabel = isEstimate ? 'Living Expenses (estimate)' : (metrics.usingActuals ? 'Living Expenses (actuals)' : 'Living Expenses (budget)')

          // Break down loan repayments by type
          const mortgageRepayments = liabilities
            .filter(l => ['mortgage', 'home_loan'].includes(l.category))
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + (r * 52) / 12
              if (l.repaymentFrequency === 'fortnightly') return sum + (r * 26) / 12
              return sum + r
            }, 0)
          const personalLoanRepayments = liabilities
            .filter(l => l.category === 'personal_loan')
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + (r * 52) / 12
              if (l.repaymentFrequency === 'fortnightly') return sum + (r * 26) / 12
              return sum + r
            }, 0)
          const otherLoanRepayments = liabilities
            .filter(l => !['mortgage', 'home_loan', 'personal_loan', 'car_loan'].includes(l.category))
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + (r * 52) / 12
              if (l.repaymentFrequency === 'fortnightly') return sum + (r * 26) / 12
              return sum + r
            }, 0)

          return (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Income</p>
              {incomeBySource.map(i => (
                <Row key={i.label} label={i.label} value={formatCurrency(i.amount)} indent />
              ))}
              <Row label="Total Income" value={formatCurrency(monthlyIncome)} bold color="text-blue-400" />

              <div className="h-3" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expenses</p>
              <Row label={expenseLabel} value={formatCurrency(baseExpenses)} indent />
              {mortgageRepayments > 0 && (
                <Row label="Mortgage repayments" value={formatCurrency(mortgageRepayments)} indent />
              )}
              {personalLoanRepayments > 0 && (
                <Row label="Personal loan repayments" value={formatCurrency(personalLoanRepayments)} indent />
              )}
              {otherLoanRepayments > 0 && (
                <Row label="Other loan repayments" value={formatCurrency(otherLoanRepayments)} indent />
              )}
              {propertyRunningCosts > 0 && (
                <Row label="Property running costs" value={formatCurrency(propertyRunningCosts)} indent />
              )}
              <Row label="Total Expenses" value={formatCurrency(monthlyExpenses)} bold color="text-red-400" />

              {negGearingPA > 0 && (
                <>
                  <div className="h-3" />
                  <Row label="Neg. gearing benefit" value={formatCurrency(negGearingPA / 12)} color="text-green-400" />
                </>
              )}

              {offsetInterestSavedMonthly > 0 && (
                <>
                  <div className="h-3" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Offset Savings</p>
                  <Row label="Interest saved by offsets" value={formatCurrency(offsetInterestSavedMonthly)} indent color="text-emerald-400" />
                  <p className="text-xs text-muted-foreground mt-1 pl-4">Your offset accounts reduce the interest charged on linked mortgages. This doesn't change your repayment amount but more goes to principal.</p>
                </>
              )}

              <div className="h-3" />
              <Row label="Net Cashflow" value={formatCurrency(monthlyCashflow)} bold color={monthlyCashflow >= 0 ? 'text-blue-400' : 'text-red-400'} />

              <NavLink to="/income" label="Income" />
            </div>
          )
        })()}

        {open === 'yearly-cashflow' && (() => {
          const budgetModeY = userProfile?.budgetMode ?? 'estimate'
          const isEstimateY = budgetModeY === 'estimate'
          const expenseLabelY = isEstimateY ? 'Living Expenses (estimate)' : (metrics.usingActuals ? 'Living Expenses (actuals)' : 'Living Expenses (budget)')

          const yearlyIncome = monthlyIncome * 12
          const yearlyBaseExpenses = baseExpenses * 12
          const yearlyMortgage = mortgageExpenses * 12
          const yearlyPropertyCosts = propertyRunningCosts * 12
          const yearlyTotalExpenses = monthlyExpenses * 12
          const yearlyEffectiveIncome = yearlyIncome + negGearingPA
          const yearlySurplus = yearlyEffectiveIncome - yearlyTotalExpenses

          // Break down loan repayments by type (annualised)
          const mortgageRepaymentsY = liabilities
            .filter(l => ['mortgage', 'home_loan'].includes(l.category))
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + r * 52
              if (l.repaymentFrequency === 'fortnightly') return sum + r * 26
              return sum + r * 12
            }, 0)
          const personalLoanRepaymentsY = liabilities
            .filter(l => l.category === 'personal_loan')
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + r * 52
              if (l.repaymentFrequency === 'fortnightly') return sum + r * 26
              return sum + r * 12
            }, 0)
          const otherLoanRepaymentsY = liabilities
            .filter(l => !['mortgage', 'home_loan', 'personal_loan', 'car_loan'].includes(l.category))
            .reduce((sum, l) => {
              const r = l.minimumRepayment ?? 0
              if (l.repaymentFrequency === 'weekly') return sum + r * 52
              if (l.repaymentFrequency === 'fortnightly') return sum + r * 26
              return sum + r * 12
            }, 0)

          // Yearly income breakdown (includes interest + dividends)
          const yearlyInterestIncome = interestIncome * 12
          const yearlyDividendIncome = dividendIncome * 12
          const yearlyIncomeBySource = incomes.filter(i => i.isActive).map(i => ({
            label: i.name,
            amount: i.monthlyAmount * 12,
          }))
          if (rentalIncome > 0) {
            properties
              .filter(p => p.type === 'investment' && (p.weeklyRent ?? 0) > 0)
              .forEach(p => {
                yearlyIncomeBySource.push({
                  label: `${p.name} (rent)`,
                  amount: (p.weeklyRent ?? 0) * 52,
                })
              })
          }
          if (yearlyInterestIncome > 0) {
            assets
              .filter(a => a.category === 'cash' && !(a as CashAsset).isOffset && (a.growthRatePA > 0 || ((a as CashAsset).interestRatePA ?? 0) > 0))
              .forEach(a => {
                const rate = (a as CashAsset).interestRatePA ?? a.growthRatePA
                yearlyIncomeBySource.push({
                  label: `${a.name} (interest)`,
                  amount: a.currentValue * rate,
                })
              })
          }
          if (yearlyDividendIncome > 0) {
            assets
              .filter(a => a.category === 'stocks' && (a as any).paysDividends && ((a as any).dividendYieldPA ?? 0) > 0)
              .forEach(a => {
                yearlyIncomeBySource.push({
                  label: `${a.name} (dividends)`,
                  amount: a.currentValue * ((a as any).dividendYieldPA ?? 0),
                })
              })
          }

          return (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Annual Income</p>
              {yearlyIncomeBySource.map(i => (
                <Row key={i.label} label={i.label} value={formatCurrency(i.amount)} indent />
              ))}
              <Row label="Total Income" value={formatCurrency(yearlyIncome)} bold color="text-blue-400" />

              <div className="h-3" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Annual Expenses</p>
              <Row label={expenseLabelY} value={formatCurrency(yearlyBaseExpenses)} indent />
              {mortgageRepaymentsY > 0 && (
                <Row label="Mortgage repayments" value={formatCurrency(mortgageRepaymentsY)} indent />
              )}
              {personalLoanRepaymentsY > 0 && (
                <Row label="Personal loan repayments" value={formatCurrency(personalLoanRepaymentsY)} indent />
              )}
              {otherLoanRepaymentsY > 0 && (
                <Row label="Other loan repayments" value={formatCurrency(otherLoanRepaymentsY)} indent />
              )}
              {yearlyPropertyCosts > 0 && (
                <Row label="Property running costs" value={formatCurrency(yearlyPropertyCosts)} indent />
              )}
              <Row label="Total Expenses" value={formatCurrency(yearlyTotalExpenses)} bold color="text-red-400" />

              {negGearingPA > 0 && (
                <>
                  <div className="h-3" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tax Benefits</p>
                  <Row label="Neg. gearing benefit" value={formatCurrency(negGearingPA)} indent color="text-green-400" />
                  <Row label="Effective Income (incl. benefits)" value={formatCurrency(yearlyEffectiveIncome)} bold color="text-blue-400" />
                </>
              )}

              <div className="h-3" />
              <Row label="Annual Surplus" value={formatCurrency(yearlySurplus)} bold color={yearlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <Row label="Monthly Equivalent" value={formatCurrency(yearlySurplus / 12)} color="text-muted-foreground" />

              <div className="h-3" />
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  {negGearingPA > 0
                    ? `Your negative gearing benefit of ${formatCurrency(negGearingPA)}/yr is included as income, as it reduces your tax liability.`
                    : 'This view annualises your monthly income and expenses to show your full-year cashflow position.'}
                </p>
              </div>

              <NavLink to="/income" label="Income" />
            </div>
          )
        })()}

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
                {savingsRate >= 50 ? '🟢 Excellent — you\'re saving over 50% of income.'
                  : savingsRate >= 30 ? '🟡 Moderate — aim for 50%+ for faster financial independence.'
                  : savingsRate >= 0 ? '🔴 Low — look for ways to reduce expenses or increase income.'
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

        {open === 'neg-gearing' && (() => {
          const salaryIncome = incomes.find(i => i.isActive && i.category === 'salary')
          const grossSalary = salaryIncome?.grossAnnualSalary ?? (salaryIncome ? salaryIncome.monthlyAmount * 12 : 0)
          const marginalRate = grossSalary > 0 ? getMarginalTaxRate(grossSalary) : 0
          const cashAssets = assets.filter(a => a.category === 'cash') as CashAsset[]
          const negGearingDetail = calculateTotalNegativeGearingBenefit(properties, liabilities, cashAssets, grossSalary)

          return (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">How It Works</p>
              <div className="bg-muted/50 rounded-lg p-3 text-center mb-3">
                <p className="text-xs text-muted-foreground">When investment expenses exceed income, the loss reduces your taxable income at your marginal tax rate. This includes investment property losses and interest on investment-purpose personal loans.</p>
              </div>

              <Row label="Gross Salary" value={formatCurrency(grossSalary)} />
              <Row label="Marginal Tax Rate" value={formatPercent(marginalRate)} />

              {/* Investment Properties */}
              <div className="h-3" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Investment Properties</p>
              {negGearingDetail.propertyDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No investment properties.</p>
              ) : (
                negGearingDetail.propertyDetails.map(detail => (
                  <div key={detail.propertyId} className="space-y-1 mb-3">
                    <p className="text-sm font-semibold">{detail.propertyName}</p>
                    <Row label="Gross Rent" value={formatCurrency(detail.netRentPA)} indent />
                    <Row label="Expenses" value={`(${formatCurrency(detail.expensesPA)})`} indent color="text-red-400" />
                    <Row label="Interest" value={`(${formatCurrency(detail.interestPA)})`} indent color="text-red-400" />
                    <Row label="Net Position" value={formatCurrency(detail.netCashflow)} indent color={detail.netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                    {detail.benefit > 0 && (
                      <Row label="Tax Benefit" value={formatCurrency(detail.benefit)} indent color="text-green-400" />
                    )}
                  </div>
                ))
              )}

              {/* Investment-purpose personal loans */}
              {negGearingDetail.investmentLoanDetails.length > 0 && (
                <>
                  <div className="h-3" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Investment Personal Loans</p>
                  {negGearingDetail.investmentLoanDetails.map(detail => (
                    <div key={detail.loanId} className="space-y-1 mb-3">
                      <p className="text-sm font-semibold">{detail.loanName}</p>
                      <Row label="Interest (deductible)" value={`(${formatCurrency(detail.interestPA)})`} indent color="text-red-400" />
                      <Row label="Tax Benefit" value={formatCurrency(detail.benefit)} indent color="text-green-400" />
                    </div>
                  ))}
                </>
              )}

              <div className="h-3" />
              <Row label="Total Annual Benefit" value={formatCurrency(negGearingPA)} bold color="text-green-400" />
              <Row label="Monthly Benefit" value={formatCurrency(negGearingPA / 12)} color="text-green-400" />

              <NavLink to="/assets?category=property" label="Properties" />
            </div>
          )
        })()}

        {open === 'surplus' && (() => {
          const budgetMode2 = userProfile?.budgetMode ?? 'estimate'
          const isEstimate2 = budgetMode2 === 'estimate'
          const expenseLabel2 = isEstimate2 ? 'Living Expenses (estimate)' : (metrics.usingActuals ? 'Living Expenses (actuals)' : 'Living Expenses (budget)')
          return (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Income</p>
            {incomeBySource.map(i => (
              <Row key={i.label} label={i.label} value={formatCurrency(i.amount)} indent />
            ))}
            <Row label="Total Income" value={formatCurrency(monthlyIncome)} bold color="text-blue-400" />

            <div className="h-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expenses</p>
            <Row label={expenseLabel2} value={`(${formatCurrency(baseExpenses)})`} indent color="text-red-400" />
            <Row label="Loan & mortgage repayments" value={`(${formatCurrency(mortgageExpenses)})`} indent color="text-red-400" />
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
          )
        })()}
      </DialogContent>
    </Dialog>
  )
}
