// Australian Tax Calculator — FY 2024-25
// Marginal rates, Medicare Levy, and Super Guarantee

const SUPER_RATE = 0.115 // 11.5% for FY 2024-25

// FY 2024-25 marginal tax brackets
const TAX_BRACKETS: { min: number; max: number; rate: number; base: number }[] = [
  { min: 0,       max: 18_200,  rate: 0,     base: 0 },
  { min: 18_200,  max: 45_000,  rate: 0.19,  base: 0 },
  { min: 45_000,  max: 120_000, rate: 0.325, base: 5_092 },
  { min: 120_000, max: 180_000, rate: 0.37,  base: 29_467 },
  { min: 180_000, max: Infinity, rate: 0.45, base: 51_667 },
]

const MEDICARE_LEVY = 0.02 // 2%

export interface TaxBreakdown {
  grossSalary: number          // gross salary (excl. super)
  superAmount: number          // employer super contribution
  totalPackage: number         // gross + super (total package)
  incomeTax: number            // marginal income tax
  medicareLevy: number         // 2% medicare levy
  totalTax: number             // income tax + medicare
  netAnnual: number            // after tax annual
  netMonthly: number           // after tax monthly
}

/**
 * Calculate income tax on taxable income using Australian marginal rates.
 */
export function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      return bracket.base + (taxableIncome - bracket.min) * bracket.rate
    }
  }
  // Above all brackets (shouldn't reach here)
  const last = TAX_BRACKETS[TAX_BRACKETS.length - 1]
  return last.base + (taxableIncome - last.min) * last.rate
}

/**
 * Full tax breakdown from a gross salary.
 * @param grossAnnual - Gross annual salary (before tax)
 * @param includesSuper - If true, the gross amount is a "total package" that includes super
 */
export function calculateTaxBreakdown(grossAnnual: number, includesSuper: boolean): TaxBreakdown {
  if (grossAnnual <= 0) {
    return {
      grossSalary: 0, superAmount: 0, totalPackage: 0,
      incomeTax: 0, medicareLevy: 0, totalTax: 0,
      netAnnual: 0, netMonthly: 0,
    }
  }

  let grossSalary: number
  let superAmount: number

  if (includesSuper) {
    // Total package includes super — extract super from the gross
    grossSalary = grossAnnual / (1 + SUPER_RATE)
    superAmount = grossAnnual - grossSalary
  } else {
    // Gross salary is on top of super
    grossSalary = grossAnnual
    superAmount = grossAnnual * SUPER_RATE
  }

  const taxableIncome = grossSalary
  const incomeTax = calculateIncomeTax(taxableIncome)
  const medicareLevy = taxableIncome * MEDICARE_LEVY
  const totalTax = Math.round(incomeTax + medicareLevy)
  const netAnnual = grossSalary - totalTax
  const netMonthly = netAnnual / 12

  return {
    grossSalary: Math.round(grossSalary),
    superAmount: Math.round(superAmount),
    totalPackage: Math.round(grossSalary + superAmount),
    incomeTax: Math.round(incomeTax),
    medicareLevy: Math.round(medicareLevy),
    totalTax,
    netAnnual: Math.round(netAnnual),
    netMonthly: Math.round(netMonthly * 100) / 100,
  }
}

/**
 * Get the marginal tax rate for a given taxable income (including Medicare Levy).
 * Used for negative gearing calculations — the tax saving on each dollar of deductible loss.
 */
export function getMarginalTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0

  let marginalRate = 0
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      marginalRate = bracket.rate
      break
    }
  }
  // If above all brackets
  if (marginalRate === 0 && taxableIncome > TAX_BRACKETS[TAX_BRACKETS.length - 1].min) {
    marginalRate = TAX_BRACKETS[TAX_BRACKETS.length - 1].rate
  }

  return marginalRate + MEDICARE_LEVY
}

export { SUPER_RATE }
