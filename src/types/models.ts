export type AssetCategory = 'cash' | 'property' | 'stocks' | 'super' | 'vehicles' | 'other'
export type PropertyType = 'primary_residence' | 'investment'
export type LiabilityCategory = 'mortgage' | 'home_loan' | 'personal_loan' | 'car_loan' | 'credit_card' | 'hecs' | 'other'
export type CashSavingsType = 'cash' | 'bank'
export type IncomeCategory = 'salary' | 'rental' | 'dividends' | 'interest' | 'side_hustle' | 'other'
export type ExpenseCategory =
  | 'mortgage_repayment' | 'rent' | 'council_rates' | 'water_rates' | 'strata'
  | 'security' | 'home_improvements' | 'repairs_maintenance' | 'gardening' | 'home_insurance'
  | 'insurance_health' | 'insurance_car' | 'insurance_life' | 'insurance_other'
  | 'electricity' | 'water' | 'rates' | 'groceries' | 'transport' | 'fuel'
  | 'medical' | 'pharmacy' | 'pet_expenses' | 'school_costs'
  | 'subscriptions' | 'entertainment' | 'dining_out'
  | 'clothing' | 'health_fitness' | 'education'
  | 'childcare' | 'phone_internet'
  | 'personal_care' | 'gifts_donations'
  | 'hecs_repayment' | 'tax' | 'accounting_fees'
  | 'property_management' | 'land_tax' | 'maintenance' | 'building_insurance'
  | 'other'

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
  cashType?: CashSavingsType    // 'cash' = no interest, 'bank' = interest-bearing
  bankName?: string              // only when cashType is 'bank'
  interestRatePA?: number       // default 3% for bank, 0 for cash
  isOffset: boolean
  linkedMortgageId?: string
}

export interface StockAsset extends Asset {
  category: 'stocks'
  ticker?: string
  units?: number
  avgBuyPrice?: number
  hasMarginLoan?: boolean
  linkedLiabilityId?: string
}

export interface SuperAsset extends Asset {
  category: 'super'
  fund?: string
}

export type VehicleFinancingType = 'owned' | 'car_loan' | 'lease'

export interface VehicleAsset extends Asset {
  category: 'vehicles'
  year?: number
  make?: string
  model?: string
  financingType?: VehicleFinancingType
  linkedLiabilityId?: string    // for car_loan: linked Liability id
  linkedExpenseId?: string      // for lease: linked ExpenseBudget id
  leaseMonthlyPayment?: number  // for lease: monthly payment amount
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
  grossAnnualSalary?: number    // for salary items: gross annual amount entered
  includesSuper?: boolean       // for salary items: whether gross includes super
  memberId?: string             // for household mode: which member this income belongs to
}

export interface ExpenseBudget extends BaseEntity {
  category: ExpenseCategory
  label: string
  monthlyBudget: number
  linkedPropertyId?: string
  linkedAssetId?: string       // auto-generated from vehicle financing (car loan / lease)
}

export interface ExpenseActual extends BaseEntity {
  budgetId: string
  /** YYYY-MM format, e.g. "2025-01" */
  month: string
  actualAmount: number
  notes?: string
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
  propertyGrowthOverride?: number   // annual %, e.g. 0.05 = 5%
  stockGrowthOverride?: number      // annual %, e.g. 0.08 = 8%
}

export type ProfileType = 'individual' | 'household'
export type BudgetMode = 'estimate' | 'detailed'
export type ExpenseCalcSource = 'budget' | 'actuals'

export interface HouseholdMember {
  id: string
  name: string
}

export interface UserProfile {
  profileType: ProfileType
  individualName?: string
  householdMembers: HouseholdMember[]
  estimatedMonthlyExpenses?: number
  budgetMode: BudgetMode
  expenseCalcSource: ExpenseCalcSource
  dismissedNotifications: string[]
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
