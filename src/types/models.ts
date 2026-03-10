export type AssetCategory = 'cash' | 'property' | 'stocks' | 'super' | 'vehicles' | 'other'
export type PropertyType = 'primary_residence' | 'investment'
export type LiabilityCategory = 'mortgage' | 'personal_loan' | 'car_loan' | 'credit_card' | 'hecs' | 'other'
export type IncomeCategory = 'salary' | 'rental' | 'dividends' | 'interest' | 'side_hustle' | 'other'
export type ExpenseCategory =
  | 'mortgage_repayment' | 'rent' | 'council_rates' | 'water_rates' | 'strata'
  | 'insurance_home' | 'insurance_health' | 'insurance_car' | 'insurance_life'
  | 'utilities' | 'groceries' | 'transport' | 'fuel'
  | 'subscriptions' | 'entertainment' | 'dining_out'
  | 'clothing' | 'health_fitness' | 'education'
  | 'childcare' | 'pet_expenses' | 'phone_internet'
  | 'personal_care' | 'gifts_donations'
  | 'hecs_repayment' | 'tax' | 'other'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Asset extends BaseEntity {
  name: string
  category: AssetCategory
  currentValue: number
  growthRatePA: number
}

export interface CashAsset extends Asset {
  category: 'cash'
  isOffset: boolean
  linkedMortgageId?: string
}

export interface StockAsset extends Asset {
  category: 'stocks'
  ticker?: string
  units?: number
  avgBuyPrice?: number
}

export interface SuperAsset extends Asset {
  category: 'super'
  fund?: string
}

export interface VehicleAsset extends Asset {
  category: 'vehicles'
  year?: number
  make?: string
  model?: string
}

export interface Property extends BaseEntity {
  name: string
  type: PropertyType
  address?: string
  currentValue: number
  growthRatePA: number
  mortgageId?: string
  weeklyRent?: number
  vacancyRatePA?: number
  councilRatesPA?: number
  waterRatesPA?: number
  insurancePA?: number
  strataPA?: number
  propertyManagementPct?: number
  landTaxPA?: number
  maintenanceBudgetPA?: number
}

export type MortgageType = 'interest_only' | 'principal_and_interest'

export interface Liability extends BaseEntity {
  name: string
  category: LiabilityCategory
  currentBalance: number
  interestRatePA: number
  minimumRepayment: number
  repaymentFrequency: 'weekly' | 'fortnightly' | 'monthly'
  linkedPropertyId?: string
  offsetAccountIds?: string[]
  mortgageType?: MortgageType
  loanTermYears?: number
}

export interface IncomeItem extends BaseEntity {
  name: string
  category: IncomeCategory
  monthlyAmount: number
  linkedPropertyId?: string
  isActive: boolean
}

export interface ExpenseBudget extends BaseEntity {
  category: ExpenseCategory
  label: string
  monthlyBudget: number
  linkedPropertyId?: string
}

export interface ExpenseActual extends BaseEntity {
  budgetId: string
  month: string
  actualAmount: number
}

export interface SurplusAllocation {
  targetId: string
  targetType: 'asset' | 'liability'
  targetName: string
  percentage: number
}

export interface ProjectionSettings {
  surplusAllocations: SurplusAllocation[]
  projectionYears: number
  defaultGrowthRates: Record<AssetCategory, number>
}

export interface MonthlySnapshot {
  month: string
  totalAssets: number
  totalLiabilities: number
  netWealth: number
  totalIncome: number
  totalExpenses: number
  cashflow: number
}
