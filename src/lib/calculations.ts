import type { Asset, CashAsset, Liability, Property, IncomeItem, ExpenseBudget, SurplusAllocation } from '@/types/models'

export function calculatePropertyEquity(property: Property, mortgage?: Liability): number {
  if (!mortgage) return property.currentValue
  return property.currentValue - mortgage.currentBalance
}

export function calculateEffectiveMortgageBalance(
  mortgage: Liability,
  offsetAccounts: CashAsset[]
): number {
  const totalOffset = offsetAccounts.reduce((sum, acc) => sum + acc.currentValue, 0)
  return Math.max(0, mortgage.currentBalance - totalOffset)
}

export function calculatePropertyNetYield(
  property: Property,
  mortgage?: Liability,
  offsetAccounts: CashAsset[]
): number {
  if (property.type !== 'investment' || !property.weeklyRent) return 0

  const grossRent = property.weeklyRent * 52 * (1 - (property.vacancyRatePA ?? 0))
  const expenses =
    (property.councilRatesPA ?? 0) +
    (property.waterRatesPA ?? 0) +
    (property.insurancePA ?? 0) +
    (property.strataPA ?? 0) +
    (property.landTaxPA ?? 0) +
    (property.maintenanceBudgetPA ?? 0) +
    (property.propertyManagementPct ?? 0) * grossRent

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
  offsetAccounts: CashAsset[]
): number {
  if (property.type !== 'investment' || !property.weeklyRent) return 0

  const grossRent = property.weeklyRent * 52 * (1 - (property.vacancyRatePA ?? 0))
  const expenses =
    (property.councilRatesPA ?? 0) +
    (property.waterRatesPA ?? 0) +
    (property.insurancePA ?? 0) +
    (property.strataPA ?? 0) +
    (property.landTaxPA ?? 0) +
    (property.maintenanceBudgetPA ?? 0) +
    (property.propertyManagementPct ?? 0) * grossRent

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

export function calculateMonthlyCashflow(incomes: IncomeItem[], budgets: ExpenseBudget[]): number {
  return calculateMonthlyIncome(incomes) - calculateMonthlyExpenses(budgets)
}

export function calculateSavingsRate(incomes: IncomeItem[], budgets: ExpenseBudget[]): number {
  const income = calculateMonthlyIncome(incomes)
  if (income === 0) return 0
  return calculateMonthlyCashflow(incomes, budgets) / income
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

// --- Projection Engine ---
export interface ProjectionPoint {
  month: number
  label: string
  netWealth: number
  totalAssets: number
  totalLiabilities: number
}

export function projectNetWealth(
  assets: Asset[],
  properties: Property[],
  liabilities: Liability[],
  incomes: IncomeItem[],
  budgets: ExpenseBudget[],
  allocations: SurplusAllocation[],
  years: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const months = years * 12

  // Clone current values
  let assetValues = new Map<string, number>()
  assets.forEach(a => assetValues.set(a.id, a.currentValue))
  properties.forEach(p => assetValues.set(p.id, p.currentValue))

  let liabilityValues = new Map<string, number>()
  liabilities.forEach(l => liabilityValues.set(l.id, l.currentBalance))

  // Growth rates map
  const growthRates = new Map<string, number>()
  assets.forEach(a => growthRates.set(a.id, a.growthRatePA))
  properties.forEach(p => growthRates.set(p.id, p.growthRatePA))

  // Interest rates
  const interestRates = new Map<string, number>()
  liabilities.forEach(l => interestRates.set(l.id, l.interestRatePA))

  const monthlySurplus = calculateMonthlyCashflow(incomes, budgets)

  for (let m = 0; m <= months; m++) {
    // Record point every 12 months or at start
    if (m % 12 === 0) {
      const totalA = Array.from(assetValues.values()).reduce((s, v) => s + v, 0)
      const totalL = Array.from(liabilityValues.values()).reduce((s, v) => s + v, 0)
      points.push({
        month: m,
        label: m === 0 ? 'Now' : `Year ${m / 12}`,
        netWealth: totalA - totalL,
        totalAssets: totalA,
        totalLiabilities: totalL,
      })
    }

    if (m === months) break

    // Apply monthly growth to assets
    for (const [id, value] of assetValues) {
      const annualRate = growthRates.get(id) ?? 0
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
      assetValues.set(id, value * (1 + monthlyRate))
    }

    // Apply interest to liabilities (simplified - interest accrues, min repayments reduce)
    for (const [id, balance] of liabilityValues) {
      const annualRate = interestRates.get(id) ?? 0
      const monthlyInterest = balance * (annualRate / 12)
      const liability = liabilities.find(l => l.id === id)
      let monthlyRepayment = 0
      if (liability) {
        const freq = liability.repaymentFrequency === 'weekly' ? 52 : liability.repaymentFrequency === 'fortnightly' ? 26 : 12
        monthlyRepayment = (liability.minimumRepayment * freq) / 12
      }
      const newBalance = Math.max(0, balance + monthlyInterest - monthlyRepayment)
      liabilityValues.set(id, newBalance)
    }

    // Allocate surplus
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
