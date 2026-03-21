// Australian individual income tax rates (2024-25 FY)
// https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents

interface TaxBracket {
  min: number
  max: number
  rate: number // marginal rate as decimal
}

const TAX_BRACKETS_2024_25: TaxBracket[] = [
  { min: 0, max: 18_200, rate: 0 },
  { min: 18_201, max: 45_000, rate: 0.16 },
  { min: 45_001, max: 135_000, rate: 0.30 },
  { min: 135_001, max: 190_000, rate: 0.37 },
  { min: 190_001, max: Infinity, rate: 0.45 },
]

/**
 * Returns the marginal tax rate for a given gross annual income.
 * Used for negative gearing calculations to determine the tax benefit
 * of deductible investment losses.
 */
export function getMarginalTaxRate(grossIncome: number): number {
  if (grossIncome <= 0) return 0

  for (const bracket of TAX_BRACKETS_2024_25) {
    if (grossIncome >= bracket.min && grossIncome <= bracket.max) {
      return bracket.rate
    }
  }

  // Above highest bracket
  return TAX_BRACKETS_2024_25[TAX_BRACKETS_2024_25.length - 1].rate
}

/**
 * Calculates the total income tax payable for a given gross annual income.
 */
export function calculateIncomeTax(grossIncome: number): number {
  if (grossIncome <= 0) return 0

  let tax = 0
  let remaining = grossIncome

  for (const bracket of TAX_BRACKETS_2024_25) {
    const bracketWidth = bracket.max === Infinity
      ? remaining
      : bracket.max - bracket.min + 1

    const taxableInBracket = Math.min(remaining, bracketWidth)
    if (taxableInBracket <= 0) break

    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
  }

  return Math.round(tax * 100) / 100
}
