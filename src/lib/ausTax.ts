/**
 * Australian marginal tax rates for the 2024-25 financial year.
 * https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
 */

interface TaxBracket {
  min: number
  max: number       // Infinity for the top bracket
  rate: number      // marginal rate as a decimal (e.g. 0.325)
}

const AUS_TAX_BRACKETS_2024: TaxBracket[] = [
  { min: 0,       max: 18_200,   rate: 0 },
  { min: 18_201,  max: 45_000,   rate: 0.16 },
  { min: 45_001,  max: 135_000,  rate: 0.30 },
  { min: 135_001, max: 190_000,  rate: 0.37 },
  { min: 190_001, max: Infinity, rate: 0.45 },
]

/**
 * Returns the marginal tax rate for a given taxable income.
 * Used by negative-gearing calculations to determine the tax benefit
 * of deductible losses at the taxpayer's highest marginal rate.
 */
export function getMarginalTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  for (let i = AUS_TAX_BRACKETS_2024.length - 1; i >= 0; i--) {
    if (taxableIncome >= AUS_TAX_BRACKETS_2024[i].min) {
      return AUS_TAX_BRACKETS_2024[i].rate
    }
  }

  return 0
}

/**
 * Calculates total income tax payable for a given taxable income.
 */
export function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  let tax = 0
  for (const bracket of AUS_TAX_BRACKETS_2024) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min + (bracket.min === 0 ? 0 : 1)
    tax += Math.max(0, taxableInBracket) * bracket.rate
  }

  return Math.round(tax * 100) / 100
}

const MEDICARE_LEVY_RATE = 0.02
const SUPER_GUARANTEE_RATE = 0.115 // 11.5% for 2024-25

export interface TaxBreakdownResult {
  grossSalary: number
  superAmount: number
  totalPackage: number
  taxableIncome: number
  incomeTax: number
  medicareLevy: number
  netAnnual: number
  netMonthly: number
  effectiveRate: number
  marginalRate: number
}

/**
 * Full salary tax breakdown including super, medicare levy, and net pay.
 * @param grossAmount - gross annual salary or total package
 * @param includesSuper - if true, grossAmount is the total package (salary + super)
 */
export function calculateTaxBreakdown(grossAmount: number, includesSuper: boolean): TaxBreakdownResult {
  const totalPackage = grossAmount
  const grossSalary = includesSuper
    ? Math.round((grossAmount / (1 + SUPER_GUARANTEE_RATE)) * 100) / 100
    : grossAmount
  const superAmount = includesSuper
    ? totalPackage - grossSalary
    : Math.round(grossSalary * SUPER_GUARANTEE_RATE * 100) / 100

  const taxableIncome = grossSalary
  const incomeTax = calculateIncomeTax(taxableIncome)
  const medicareLevy = Math.round(taxableIncome * MEDICARE_LEVY_RATE * 100) / 100
  const netAnnual = grossSalary - incomeTax - medicareLevy
  const netMonthly = Math.round((netAnnual / 12) * 100) / 100
  const effectiveRate = grossSalary > 0 ? (incomeTax + medicareLevy) / grossSalary : 0
  const marginalRate = getMarginalTaxRate(taxableIncome)

  return {
    grossSalary,
    superAmount,
    totalPackage: includesSuper ? totalPackage : grossSalary + superAmount,
    taxableIncome,
    incomeTax,
    medicareLevy,
    netAnnual,
    netMonthly,
    effectiveRate,
    marginalRate,
  }
}
