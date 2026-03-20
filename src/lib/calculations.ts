import type { Asset, CashAsset, StockAsset, Liability, Property, IncomeItem, ExpenseBudget, ExpenseActual, SurplusAllocation, BudgetMode, ExpenseCalcSource, MonthlySnapshot } from '@/types/models'
import { getMarginalTaxRate } from './ausTax'

export function calculatePropertyEquity(property: Property, mortgage?: Liability): number {
  if (!mortgage) return property.currentValue
  return property.currentValue - mortgage.currentBalance
}

export function calculateEffectiveMortgageBalance(
  mortgage: Liability,
  offsetAccounts: CashAsset[]
): number {
  const totalOffset = offsetAccounts.reduce((sum: number, acc: CashAsset) => sum + acc.currentValue, 0)
  return Math.max(0, mortgage.currentBalance - totalOffset)
}

export function calculatePropertyNetYield(
  property: Property,
  mortgage?: Liability,
  offsetAccounts?: CashAsset[]
): number {
  if (property.type !== 'investment' || !property.weeklyRent) return 0

  const grossRent = property.weeklyRent * 52 * (1 - (property.vacancyRatePA ?? 0) / 100)
  const expenses =
    (property.councilRatesPA ?? 0) +
    (property.waterRatesPA ?? 0) +
    (property.insurancePA ?? 0) +
    (property.strataPA ?? 0) +
    (property.landTaxPA ?? 0) +
    (property.maintenanceBudgetPA ?? 0) +
    ((property.propertyManagementPct ?? 0) / 100) * grossRent

  let interestPA = 0
  if (mortgage) {
    const effectiveBalance = offsetAccounts
      ? calculateEffectiveMortgageBalance(mortgage, offsetAccounts)
      : mortgage.currentBalance
    interestPA = effectiveBalance * mortgage.interestRatePA
  }

  const netIncome = grossRent - expenses - interestPA
  return property.currentValue > 0 ? netIncome / property.currentValue : 0
}

export function calculatePropertyCashflow(
  property: Property,
  mortgage?: Liability,
  offsetAccounts?: CashAsset[]
): number {
  if (property.type !== 'investment' || !property.weeklyRent) return 0

  const grossRent = property.weeklyRent * 52 * (1 - (property.vacancyRatePA ?? 0) / 100)
  const expenses =
    (property.councilRatesPA ?? 0) +
    (property.waterRatesPA ?? 0) +
    (property.insurancePA ?? 0) +
    (property.strataPA ?? 0) +
    (property.landTaxPA ?? 0) +
    (property.maintenanceBudgetPA ?? 0) +
    ((property.propertyManagementPct ?? 0) / 100) * grossRent

  let repaymentPA = 0
  if (mortgage) {
    const freq = mortgage.repaymentFrequency === 'weekly' ? 52 : mortgage.repaymentFrequency === 'fortnightly' ? 26 : 12
    repaymentPA = mortgage.minimumRepayment * freq
  }

  return (grossRent - expenses - repaymentPA) / 12
}

export function calculateTotalAssets(assets: Asset[], properties: Property[]): number {
  const assetTotal = assets.reduce((sum, a) => sum + a.currentValue, 0)
  const propertyTotal = properties.reduce((sum, p) => sum + p.currentValue, 0)
  return assetTotal + propertyTotal
}

export function calculateTotalLiabilities(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + l.currentBalance, 0)
}

export function calculateNetWealth(assets: Asset[], properties: Property[], liabilities: Liability[]): number {
  return calculateTotalAssets(assets, properties) - calculateTotalLiabilities(liabilities)
}

export function calculateMonthlyIncome(incomes: IncomeItem[]): number {
  return incomes.filter(i => i.isActive).reduce((sum, i) => sum + i.monthlyAmount, 0)
}

export function calculateMonthlyExpenses(budgets: ExpenseBudget[]): number {
  return budgets.reduce((sum, b) => sum + b.monthlyBudget, 0)
}

export function calculateMonthlyPropertyExpenses(properties: Property[], liabilities: Liability[], cashAssets?: CashAsset[]): number {
  // Only include mortgage interest (not principal — that's debt reduction, not spending).
  // Running costs (council rates, water, insurance, etc.) are already captured
  // as auto-generated expenses in the budgets array, so we don't add them here.
  // Offset accounts reduce the effective balance used to calculate interest.
  let total = 0
  for (const prop of properties) {
    if (prop.mortgageId) {
      const lia = liabilities.find(l => l.id === prop.mortgageId)
      if (lia && lia.interestRatePA > 0) {
        const effectiveBalance = cashAssets
          ? calculateEffectiveMortgageBalance(lia, cashAssets.filter(a => a.isOffset && a.linkedMortgageId === lia.id))
          : lia.currentBalance
        total += (effectiveBalance * lia.interestRatePA) / 12
      }
    }
  }
  return total
}

export function calculateMonthlyCashflow(incomes: IncomeItem[], budgets: ExpenseBudget[], properties?: Property[], liabilities?: Liability[]): number {
  const propertyExpenses = properties && liabilities ? calculateMonthlyPropertyExpenses(properties, liabilities) : 0
  return calculateMonthlyIncome(incomes) - calculateMonthlyExpenses(budgets) - propertyExpenses
}

export function calculateSavingsRate(incomes: IncomeItem[], budgets: ExpenseBudget[], properties?: Property[], liabilities?: Liability[]): number {
  const income = calculateMonthlyIncome(incomes)
  if (income === 0) return 0
  return calculateMonthlyCashflow(incomes, budgets, properties, liabilities) / income
}

export function calculateDebtToAssetRatio(
  assets: Asset[],
  properties: Property[],
  liabilities: Liability[]
): number {
  const totalAssets = calculateTotalAssets(assets, properties)
  if (totalAssets === 0) return 0
  return calculateTotalLiabilities(liabilities) / totalAssets
}

/**
 * Calculate total annual negative gearing tax benefit across all investment properties.
 * For each property with a loss (rent < expenses + interest), the loss reduces
 * taxable income at the investor's marginal rate.
 */
export interface NegGearingPropertyDetail {
  propertyId: string
  propertyName: string
  netRentPA: number
  expensesPA: number
  interestPA: number
  netCashflow: number
  benefit: number
}

export interface NegGearingLoanDetail {
  loanId: string
  loanName: string
  interestPA: number
  benefit: number
}

export interface NegGearingResult {
  benefit: number
  totalDeductible: number
  propertyDetails: NegGearingPropertyDetail[]
  investmentLoanDetails: NegGearingLoanDetail[]
}

export function calculateTotalNegativeGearingBenefit(
  properties: Property[],
  liabilities: Liability[],
  assets: CashAsset[],
  grossSalary: number
): NegGearingResult {
  if (grossSalary <= 0) return { benefit: 0, totalDeductible: 0, propertyDetails: [], investmentLoanDetails: [] }
  const marginalRate = getMarginalTaxRate(grossSalary)

  let totalBenefit = 0
  let totalDeductible = 0
  const propertyDetails: NegGearingPropertyDetail[] = []
  const investmentLoanDetails: NegGearingLoanDetail[] = []

  // --- Investment properties ---
  for (const prop of properties) {
    if (prop.type !== 'investment' || !prop.weeklyRent) continue

    const grossRentPA = prop.weeklyRent * 52
    const vacancyLoss = grossRentPA * (prop.vacancyRatePA ?? 0) / 100
    const netRentPA = grossRentPA - vacancyLoss
    const managementFee = netRentPA * (prop.propertyManagementPct ?? 0) / 100
    const expensesPA =
      managementFee +
      (prop.councilRatesPA ?? 0) +
      (prop.waterRatesPA ?? 0) +
      (prop.insurancePA ?? 0) +
      (prop.strataPA ?? 0) +
      (prop.landTaxPA ?? 0) +
      (prop.maintenanceBudgetPA ?? 0)

    // Find linked mortgage
    const mortgage = liabilities.find(l =>
      l.linkedPropertyId === prop.id || l.id === prop.mortgageId
    )
    let interestPA = 0
    if (mortgage) {
      // Account for offset
      const offsetAccounts = assets.filter(a => a.isOffset && a.linkedMortgageId === mortgage.id)
      const totalOffset = offsetAccounts.reduce((sum, a) => sum + a.currentValue, 0)
      const effectiveBalance = Math.max(0, mortgage.currentBalance - totalOffset)
      interestPA = effectiveBalance * mortgage.interestRatePA
    }

    const netCashflow = netRentPA - expensesPA - interestPA
    let benefit = 0
    if (netCashflow < 0) {
      const loss = Math.abs(netCashflow)
      totalDeductible += loss
      benefit = loss * marginalRate
      totalBenefit += benefit
    }

    propertyDetails.push({
      propertyId: prop.id,
      propertyName: prop.name,
      netRentPA,
      expensesPA,
      interestPA,
      netCashflow,
      benefit,
    })
  }

  // --- Investment-purpose personal loans ---
  // Interest on personal loans used for investment purposes is fully tax-deductible
  for (const loan of liabilities) {
    if (loan.category !== 'personal_loan' || !loan.isInvestmentPurpose) continue
    if (loan.currentBalance <= 0 || loan.interestRatePA <= 0) continue

    const interestPA = loan.currentBalance * loan.interestRatePA
    const benefit = interestPA * marginalRate
    totalDeductible += interestPA
    totalBenefit += benefit

    investmentLoanDetails.push({
      loanId: loan.id,
      loanName: loan.name,
      interestPA,
      benefit,
    })
  }

  return { benefit: totalBenefit, totalDeductible, propertyDetails, investmentLoanDetails }
}

// --- Shared Dashboard Metrics ---
// Single source of truth for income/expense/cashflow/savings figures.
// Used by both DashboardPage and KpiBreakdownDialog so figures always match.

export interface DashboardMetrics {
  /** Income from IncomeItem entries (salary, dividends, etc.) */
  baseIncome: number
  /** Rental income from investment properties */
  rentalIncome: number
  /** Interest income from cash/savings accounts */
  interestIncome: number
  /** Dividend income from stocks */
  dividendIncome: number
  /** baseIncome + rentalIncome + interestIncome + dividendIncome */
  monthlyIncome: number
  /** Living expenses only (from budget, estimate, or actuals) */
  baseExpenses: number
  /** Total mortgage / liability repayments */
  mortgageExpenses: number
  /** Council rates, water, insurance, strata, etc. */
  propertyRunningCosts: number
  /** baseExpenses + mortgageExpenses + propertyRunningCosts */
  monthlyExpenses: number
  /** Annual negative-gearing tax benefit */
  negGearingBenefitPA: number
  /** Total annual deductible loss (before tax benefit) */
  negGearingDeductiblePA: number
  /** Monthly interest saved by offset accounts */
  offsetInterestSavedMonthly: number
  /** monthlyIncome - monthlyExpenses + negGearing/12 */
  monthlyCashflow: number
  /** monthlyCashflow / monthlyIncome × 100 (percentage, e.g. 20.7) */
  savingsRate: number
  /** Whether actuals are being used for expenses instead of budget */
  usingActuals: boolean
}

/**
 * Filter expense budgets to only LIVING expenses.
 * Excludes auto-generated vehicle loan/lease entries and property-linked entries
 * since those are tracked separately as mortgageExpenses and propertyRunningCosts.
 */
// Whitelist of categories that count as "living expenses" — must match
// LIVING_SUPER_CATEGORIES in LivingExpensesPage.tsx exactly.
export const LIVING_EXPENSE_CATEGORIES = new Set([
  // Housing
  'rent', 'electricity', 'water', 'rates', 'security', 'home_improvements', 'repairs_maintenance', 'gardening',
  // Insurance
  'insurance_health', 'insurance_car', 'insurance_life', 'home_insurance', 'insurance_pet', 'insurance_other',
  // Living
  'groceries', 'household_goods', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs',
  // Lifestyle
  'subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations',
  // Financial
  'hecs_repayment', 'tax', 'accounting_fees', 'other',
])

function filterLivingBudgets(budgets: ExpenseBudget[]): ExpenseBudget[] {
  return budgets.filter(b =>
    LIVING_EXPENSE_CATEGORIES.has(b.category) &&
    !b.linkedPropertyId &&
    !b.linkedAssetId
  )
}

/**
 * Get the effective monthly living expense amount based on user settings.
 * - 'budget' source: sum of living expense budget entries only
 * - 'actuals' source: rolling average of the last 3 completed months of actuals.
 *   Excludes the current (incomplete) month. Excludes months with $0 total.
 *   Falls back to budget if no qualifying months exist.
 */
function getEffectiveMonthlyExpenses(
  budgets: ExpenseBudget[],
  actuals: ExpenseActual[],
  expenseCalcSource: ExpenseCalcSource = 'budget',
): { total: number; usingActuals: boolean } {
  // IMPORTANT: Only count living expense budgets, not vehicle/property-linked ones
  const livingBudgets = filterLivingBudgets(budgets)
  const budgetTotal = calculateMonthlyExpenses(livingBudgets)

  // If user explicitly chose "budget", always use budget total
  if (expenseCalcSource === 'budget') {
    return { total: budgetTotal, usingActuals: false }
  }

  // User chose "actuals" — use rolling 3-month average of completed months
  if (!actuals || actuals.length === 0) {
    return { total: budgetTotal, usingActuals: false }
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Only count actuals whose budgetId belongs to a living expense budget
  const livingBudgetIds = new Set(livingBudgets.map(b => b.id))

  // Group actuals by month, excluding the current incomplete month
  const monthTotals = new Map<string, number>()
  for (const a of actuals) {
    if (a.month !== currentMonth && livingBudgetIds.has(a.budgetId)) {
      monthTotals.set(a.month, (monthTotals.get(a.month) ?? 0) + a.actualAmount)
    }
  }

  // Sort months descending, take last 3 with non-zero totals
  const qualifyingMonths = Array.from(monthTotals.entries())
    .filter(([, total]) => total > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3)

  if (qualifyingMonths.length === 0) {
    return { total: budgetTotal, usingActuals: false }
  }

  const average = qualifyingMonths.reduce((sum, [, t]) => sum + t, 0) / qualifyingMonths.length

  return { total: Math.round(average), usingActuals: true }
}

export function calculateDashboardMetrics(
  incomes: IncomeItem[],
  expenseBudgets: ExpenseBudget[],
  properties: Property[],
  liabilities: Liability[],
  assets: Asset[],
  expenseActuals?: ExpenseActual[],
  budgetMode?: BudgetMode,
  estimatedMonthlyExpenses?: number,
  expenseCalcSource?: ExpenseCalcSource,
): DashboardMetrics {
  // Income: base + rental + interest + dividends
  const baseIncome = calculateMonthlyIncome(incomes)
  const rentalIncome = properties
    .filter(p => p.type === 'investment' && (p.weeklyRent ?? 0) > 0)
    .reduce((sum, p) => sum + ((p.weeklyRent ?? 0) * 52) / 12, 0)
  // Interest income from cash/savings accounts
  const interestIncome = assets
    .filter(a => a.category === 'cash' && !(a as CashAsset).isOffset && (a.growthRatePA > 0 || ((a as CashAsset).interestRatePA ?? 0) > 0))
    .reduce((sum, a) => {
      const rate = (a as CashAsset).interestRatePA ?? a.growthRatePA
      return sum + (a.currentValue * rate) / 12
    }, 0)

  // Dividend income from stocks (only where user opted in)
  const dividendIncome = assets
    .filter(a => a.category === 'stocks' && (a as StockAsset).paysDividends && ((a as StockAsset).dividendYieldPA ?? 0) > 0)
    .reduce((sum, a) => sum + (a.currentValue * ((a as StockAsset).dividendYieldPA ?? 0)) / 12, 0)

  const monthlyIncome = baseIncome + rentalIncome + interestIncome + dividendIncome

  // Living Expenses: use estimate, budget, or actuals depending on user settings
  // getEffectiveMonthlyExpenses already filters to living-only budgets internally
  const useEstimate = budgetMode === 'estimate' && (estimatedMonthlyExpenses ?? 0) > 0
  const { total: detailedExpenses, usingActuals } = getEffectiveMonthlyExpenses(expenseBudgets, expenseActuals ?? [], expenseCalcSource ?? 'budget')
  const baseExpenses = useEstimate ? estimatedMonthlyExpenses! : detailedExpenses

  // Loan repayments: ALL liabilities (mortgages, personal loans, car loans, etc.)
  const mortgageExpenses = liabilities
    .reduce((sum, l) => {
      const repayment = l.minimumRepayment ?? 0
      if (l.repaymentFrequency === 'weekly') return sum + (repayment * 52) / 12
      if (l.repaymentFrequency === 'fortnightly') return sum + (repayment * 26) / 12
      return sum + repayment
    }, 0)

  // Property running costs: council rates, water, insurance, strata, etc.
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

  // Negative gearing benefit
  const salaryIncome = incomes.find(i => i.isActive && i.category === 'salary')
  const grossSalary = salaryIncome?.grossAnnualSalary ?? (salaryIncome ? salaryIncome.monthlyAmount * 12 : 0)
  const cashAssets = assets.filter(a => a.category === 'cash') as CashAsset[]
  const negGearingResult = calculateTotalNegativeGearingBenefit(properties, liabilities, cashAssets, grossSalary)
  const negGearingBenefitPA = negGearingResult.benefit
  const negGearingDeductiblePA = negGearingResult.totalDeductible

  // Calculate interest saved by offset accounts
  // For each mortgage with linked offset accounts, calculate how much interest
  // is saved per month by reducing the effective loan balance.
  const offsetInterestSavedMonthly = properties.reduce((saved, prop) => {
    if (!prop.mortgageId) return saved
    const lia = liabilities.find(l => l.id === prop.mortgageId)
    if (!lia || lia.interestRatePA <= 0) return saved
    const offsets = cashAssets.filter(a => a.isOffset && a.linkedMortgageId === lia.id)
    const totalOffset = offsets.reduce((sum, a) => sum + a.currentValue, 0)
    if (totalOffset <= 0) return saved
    // Interest saved = min(offset, balance) * rate / 12
    const cappedOffset = Math.min(totalOffset, lia.currentBalance)
    return saved + (cappedOffset * lia.interestRatePA) / 12
  }, 0)

  const monthlyCashflow = monthlyIncome - monthlyExpenses + negGearingBenefitPA / 12
  const savingsRate = monthlyIncome > 0 ? (monthlyCashflow / monthlyIncome) * 100 : 0

  return {
    baseIncome, rentalIncome, interestIncome, dividendIncome, monthlyIncome,
    baseExpenses, mortgageExpenses, propertyRunningCosts, monthlyExpenses,
    negGearingBenefitPA, negGearingDeductiblePA, offsetInterestSavedMonthly,
    monthlyCashflow, savingsRate, usingActuals,
  }
}

// --- Projection Engine ---
export interface PropertyProjectionDetail {
  propertyId: string
  propertyName: string
  assetValue: number
  liabilityBalance: number
  equity: number
}

export interface ProjectionPoint {
  month: number
  label: string
  netWealth: number
  totalAssets: number
  totalLiabilities: number
  propertyDetails?: PropertyProjectionDetail[]
}

export function projectNetWealth(
  assets: Asset[],
  properties: Property[],
  liabilities: Liability[],
  incomes: IncomeItem[],
  budgets: ExpenseBudget[],
  allocations: SurplusAllocation[],
  years: number,
  propertyGrowthOverride?: number,
  stockGrowthOverride?: number,
  budgetMode?: BudgetMode,
  estimatedMonthlyExpenses?: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const months = years * 12

  const assetValues = new Map<string, number>()
  assets.forEach(a => assetValues.set(a.id, a.currentValue))
  properties.forEach(p => assetValues.set(p.id, p.currentValue))

  const liabilityValues = new Map<string, number>()
  liabilities.forEach(l => liabilityValues.set(l.id, l.currentBalance))

  const growthRates = new Map<string, number>()
  assets.forEach(a => {
    if ((a.category === 'stocks' || a.category === 'super') && stockGrowthOverride !== undefined) {
      growthRates.set(a.id, stockGrowthOverride)
    } else {
      growthRates.set(a.id, a.growthRatePA)
    }
  })
  properties.forEach(p => growthRates.set(p.id, propertyGrowthOverride ?? p.growthRatePA))

  const interestRates = new Map<string, number>()
  liabilities.forEach(l => interestRates.set(l.id, l.interestRatePA))

  // Find gross salary for negative gearing calculation
  const salaryIncome = incomes.find(i => i.isActive && i.category === 'salary')
  const grossSalary = salaryIncome?.grossAnnualSalary ?? (salaryIncome ? salaryIncome.monthlyAmount * 12 : 0)
  const cashAssets = (assets.filter(a => a.category === 'cash') as CashAsset[])
  const negGearingBenefitMonthly = calculateTotalNegativeGearingBenefit(properties, liabilities, cashAssets, grossSalary).benefit / 12

  // When using estimate mode, replace budget-based expenses with the flat estimate
  // Filter to living budgets only for projection too
  const useEstimate = budgetMode === 'estimate' && (estimatedMonthlyExpenses ?? 0) > 0
  const livingBudgets = filterLivingBudgets(budgets)
  const monthlyExpenseTotal = useEstimate ? estimatedMonthlyExpenses! : calculateMonthlyExpenses(livingBudgets)
  const propertyExpenses = calculateMonthlyPropertyExpenses(properties, liabilities, cashAssets)
  const monthlySurplus = calculateMonthlyIncome(incomes) - monthlyExpenseTotal - propertyExpenses + negGearingBenefitMonthly

  for (let m = 0; m <= months; m++) {
    if (m % 12 === 0) {
      const totalA = Array.from(assetValues.values()).reduce((s, v) => s + v, 0)
      const totalL = Array.from(liabilityValues.values()).reduce((s, v) => s + v, 0)

      // Track per-property details at each yearly snapshot
      const propertyDetails: PropertyProjectionDetail[] = properties.map(p => {
        const assetValue = assetValues.get(p.id) ?? 0
        const liabilityBalance = p.mortgageId ? (liabilityValues.get(p.mortgageId) ?? 0) : 0
        return {
          propertyId: p.id,
          propertyName: p.name,
          assetValue,
          liabilityBalance,
          equity: assetValue - liabilityBalance,
        }
      })

      points.push({
        month: m,
        label: m === 0 ? 'Now' : `${new Date().getFullYear() + m / 12}`,
        netWealth: totalA - totalL,
        totalAssets: totalA,
        totalLiabilities: totalL,
        propertyDetails,
      })
    }

    if (m === months) break

    for (const [id, value] of assetValues) {
      const annualRate = growthRates.get(id) ?? 0
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
      assetValues.set(id, value * (1 + monthlyRate))
    }

    for (const [id, balance] of liabilityValues) {
      const annualRate = interestRates.get(id) ?? 0
      // For mortgages with offset accounts, interest is only charged on
      // (balance - offset), so more of the repayment goes to principal.
      const offsetIds = cashAssets
        .filter(a => a.isOffset && a.linkedMortgageId === id)
        .map(a => a.id)
      const totalOffset = offsetIds.reduce((sum, oid) => sum + (assetValues.get(oid) ?? 0), 0)
      const effectiveBalance = Math.max(0, balance - totalOffset)
      const monthlyInterest = effectiveBalance * (annualRate / 12)
      const liability = liabilities.find(l => l.id === id)
      let monthlyRepayment = 0
      if (liability) {
        const freq = liability.repaymentFrequency === 'weekly' ? 52 : liability.repaymentFrequency === 'fortnightly' ? 26 : 12
        monthlyRepayment = (liability.minimumRepayment * freq) / 12
      }
      const newBalance = Math.max(0, balance + monthlyInterest - monthlyRepayment)
      liabilityValues.set(id, newBalance)
    }

    if (monthlySurplus > 0) {
      for (const alloc of allocations) {
        const amount = monthlySurplus * alloc.percentage
        if (alloc.targetType === 'asset') {
          const current = assetValues.get(alloc.targetId) ?? 0
          assetValues.set(alloc.targetId, current + amount)
        } else {
          const current = liabilityValues.get(alloc.targetId) ?? 0
          liabilityValues.set(alloc.targetId, Math.max(0, current - amount))
        }
      }
    }
  }

  return points
}

// --- Net Worth Snapshot ---
export function createNetWorthSnapshot(
  assets: Asset[],
  properties: Property[],
  liabilities: Liability[],
  incomes: IncomeItem[],
  expenseBudgets: ExpenseBudget[],
  expenseActuals: ExpenseActual[],
  budgetMode?: BudgetMode,
  estimatedMonthlyExpenses?: number,
  expenseCalcSource?: ExpenseCalcSource,
): MonthlySnapshot {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const netWealth = totalAssets - totalLiabilities
  const metrics = calculateDashboardMetrics(incomes, expenseBudgets, properties, liabilities, assets, expenseActuals, budgetMode, estimatedMonthlyExpenses, expenseCalcSource)
  return {
    month,
    totalAssets,
    totalLiabilities,
    netWealth,
    totalIncome: metrics.monthlyIncome,
    totalExpenses: metrics.monthlyExpenses,
    cashflow: metrics.monthlyCashflow,
  }
}
