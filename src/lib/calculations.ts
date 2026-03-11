import type { Asset, CashAsset, Liability, Property, IncomeItem, ExpenseBudget, SurplusAllocation } from '@/types/models'
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
  _offsetAccounts?: CashAsset[]
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

export function calculateMonthlyPropertyExpenses(properties: Property[], liabilities: Liability[]): number {
  let total = 0
  for (const prop of properties) {
    if (prop.mortgageId) {
      const lia = liabilities.find(l => l.id === prop.mortgageId)
      if (lia && lia.minimumRepayment > 0) {
        const freq = lia.repaymentFrequency === 'weekly' ? 52 : lia.repaymentFrequency === 'fortnightly' ? 26 : 12
        total += (lia.minimumRepayment * freq) / 12
      }
    }
    total += (prop.councilRatesPA ?? 0) / 12
    total += (prop.waterRatesPA ?? 0) / 12
    total += (prop.insurancePA ?? 0) / 12
    total += (prop.strataPA ?? 0) / 12
    total += (prop.landTaxPA ?? 0) / 12
    total += (prop.maintenanceBudgetPA ?? 0) / 12
    if (prop.weeklyRent && prop.weeklyRent > 0 && prop.propertyManagementPct && prop.propertyManagementPct > 0) {
      total += (prop.weeklyRent * 52 * prop.propertyManagementPct) / 100 / 12
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
export function calculateTotalNegativeGearingBenefit(
  properties: Property[],
  liabilities: Liability[],
  assets: CashAsset[],
  grossSalary: number
): number {
  if (grossSalary <= 0) return 0
  const marginalRate = getMarginalTaxRate(grossSalary)

  let totalBenefit = 0
  for (const prop of properties) {
    if (prop.type !== 'investment' || !prop.weeklyRent) continue

    const grossRentPA = prop.weeklyRent * 52
    const vacancyLoss = grossRentPA * (prop.vacancyRatePA ?? 0) / 100
    const netRentPA = grossRentPA - vacancyLoss
    const managementFee = netRentPA * (prop.propertyManagementPct ?? 0) / 100
    const expenses =
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

    const netCashflow = netRentPA - expenses - interestPA
    if (netCashflow < 0) {
      totalBenefit += Math.abs(netCashflow) * marginalRate
    }
  }

  return totalBenefit
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
  years: number,
  propertyGrowthOverride?: number,
  stockGrowthOverride?: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const months = years * 12

  let assetValues = new Map<string, number>()
  assets.forEach(a => assetValues.set(a.id, a.currentValue))
  properties.forEach(p => assetValues.set(p.id, p.currentValue))

  let liabilityValues = new Map<string, number>()
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
  const salaryIncome = incomes.find(i => i.isActive && i.source === 'salary')
  const grossSalary = salaryIncome ? salaryIncome.monthlyAmount * 12 : 0
  const cashAssets = (assets.filter(a => a.category === 'cash') as CashAsset[])
  const negGearingBenefitMonthly = calculateTotalNegativeGearingBenefit(properties, liabilities, cashAssets, grossSalary) / 12
  const monthlySurplus = calculateMonthlyCashflow(incomes, budgets, properties, liabilities) + negGearingBenefitMonthly

  for (let m = 0; m <= months; m++) {
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

    for (const [id, value] of assetValues) {
      const annualRate = growthRates.get(id) ?? 0
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
      assetValues.set(id, value * (1 + monthlyRate))
    }

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
