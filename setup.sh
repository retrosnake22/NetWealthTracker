#!/bin/bash
set -e
echo "🚀 Building Net Wealth Tracker..."

# --- Fix package.json name and title ---
sed -i '' 's/"name": "temp-nwt"/"name": "nwt"/' package.json

cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Net Wealth Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# --- Create directories ---
mkdir -p src/types src/stores src/lib src/hooks
mkdir -p src/components/layout src/components/dashboard src/components/forms
mkdir -p src/pages

echo "📁 Directories created"

# ============================================
# TYPES
# ============================================
cat > src/types/models.ts << 'EOF'
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

export interface Liability extends BaseEntity {
  name: string
  category: LiabilityCategory
  currentBalance: number
  interestRatePA: number
  minimumRepayment: number
  repaymentFrequency: 'weekly' | 'fortnightly' | 'monthly'
  linkedPropertyId?: string
  offsetAccountIds?: string[]
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
EOF

echo "✅ Types created"

# ============================================
# UTILITY FUNCTIONS
# ============================================
cat > src/lib/format.ts << 'EOF'
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}
EOF

cat > src/lib/calculations.ts << 'EOF'
import type { Asset, CashAsset, Liability, Property, IncomeItem, ExpenseBudget, SurplusAllocation, MonthlySnapshot } from '@/types/models'

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
  offsetAccounts?: CashAsset[]
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
  offsetAccounts?: CashAsset[]
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
EOF

echo "✅ Utilities created"

# ============================================
# ZUSTAND STORES
# ============================================
cat > src/stores/useFinanceStore.ts << 'EOF'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Asset, CashAsset, StockAsset, SuperAsset, VehicleAsset,
  Property, Liability, IncomeItem, ExpenseBudget, ExpenseActual,
  SurplusAllocation, ProjectionSettings, AssetCategory
} from '@/types/models'
import { generateId } from '@/lib/format'

interface FinanceState {
  // Data
  assets: Asset[]
  properties: Property[]
  liabilities: Liability[]
  incomes: IncomeItem[]
  expenseBudgets: ExpenseBudget[]
  expenseActuals: ExpenseActual[]
  projectionSettings: ProjectionSettings

  // Asset CRUD
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> | Omit<CashAsset, 'id' | 'createdAt' | 'updatedAt'> | Omit<StockAsset, 'id' | 'createdAt' | 'updatedAt'> | Omit<SuperAsset, 'id' | 'createdAt' | 'updatedAt'> | Omit<VehicleAsset, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void

  // Property CRUD
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProperty: (id: string, updates: Partial<Property>) => void
  removeProperty: (id: string) => void

  // Liability CRUD
  addLiability: (liability: Omit<Liability, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateLiability: (id: string, updates: Partial<Liability>) => void
  removeLiability: (id: string) => void

  // Income CRUD
  addIncome: (income: Omit<IncomeItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateIncome: (id: string, updates: Partial<IncomeItem>) => void
  removeIncome: (id: string) => void

  // Expense Budget CRUD
  addExpenseBudget: (budget: Omit<ExpenseBudget, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateExpenseBudget: (id: string, updates: Partial<ExpenseBudget>) => void
  removeExpenseBudget: (id: string) => void

  // Expense Actuals
  addExpenseActual: (actual: Omit<ExpenseActual, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateExpenseActual: (id: string, updates: Partial<ExpenseActual>) => void

  // Projection Settings
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void
  setSurplusAllocations: (allocations: SurplusAllocation[]) => void
}

const now = () => new Date().toISOString()

const DEFAULT_GROWTH_RATES: Record<AssetCategory, number> = {
  cash: 0.045,
  property: 0.07,
  stocks: 0.08,
  super: 0.07,
  vehicles: -0.10,
  other: 0.03,
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      assets: [],
      properties: [],
      liabilities: [],
      incomes: [],
      expenseBudgets: [],
      expenseActuals: [],
      projectionSettings: {
        surplusAllocations: [],
        projectionYears: 20,
        defaultGrowthRates: DEFAULT_GROWTH_RATES,
      },

      // Assets
      addAsset: (asset) => set((state) => ({
        assets: [...state.assets, { ...asset, id: generateId(), createdAt: now(), updatedAt: now() } as Asset]
      })),
      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),
      removeAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
      })),

      // Properties
      addProperty: (property) => set((state) => ({
        properties: [...state.properties, { ...property, id: generateId(), createdAt: now(), updatedAt: now() }]
      })),
      updateProperty: (id, updates) => set((state) => ({
        properties: state.properties.map(p => p.id === id ? { ...p, ...updates, updatedAt: now() } : p)
      })),
      removeProperty: (id) => set((state) => ({
        properties: state.properties.filter(p => p.id !== id)
      })),

      // Liabilities
      addLiability: (liability) => set((state) => ({
        liabilities: [...state.liabilities, { ...liability, id: generateId(), createdAt: now(), updatedAt: now() }]
      })),
      updateLiability: (id, updates) => set((state) => ({
        liabilities: state.liabilities.map(l => l.id === id ? { ...l, ...updates, updatedAt: now() } : l)
      })),
      removeLiability: (id) => set((state) => ({
        liabilities: state.liabilities.filter(l => l.id !== id)
      })),

      // Income
      addIncome: (income) => set((state) => ({
        incomes: [...state.incomes, { ...income, id: generateId(), createdAt: now(), updatedAt: now() }]
      })),
      updateIncome: (id, updates) => set((state) => ({
        incomes: state.incomes.map(i => i.id === id ? { ...i, ...updates, updatedAt: now() } : i)
      })),
      removeIncome: (id) => set((state) => ({
        incomes: state.incomes.filter(i => i.id !== id)
      })),

      // Expense Budgets
      addExpenseBudget: (budget) => set((state) => ({
        expenseBudgets: [...state.expenseBudgets, { ...budget, id: generateId(), createdAt: now(), updatedAt: now() }]
      })),
      updateExpenseBudget: (id, updates) => set((state) => ({
        expenseBudgets: state.expenseBudgets.map(b => b.id === id ? { ...b, ...updates, updatedAt: now() } : b)
      })),
      removeExpenseBudget: (id) => set((state) => ({
        expenseBudgets: state.expenseBudgets.filter(b => b.id !== id)
      })),

      // Expense Actuals
      addExpenseActual: (actual) => set((state) => ({
        expenseActuals: [...state.expenseActuals, { ...actual, id: generateId(), createdAt: now(), updatedAt: now() }]
      })),
      updateExpenseActual: (id, updates) => set((state) => ({
        expenseActuals: state.expenseActuals.map(a => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),

      // Projection Settings
      updateProjectionSettings: (settings) => set((state) => ({
        projectionSettings: { ...state.projectionSettings, ...settings }
      })),
      setSurplusAllocations: (allocations) => set((state) => ({
        projectionSettings: { ...state.projectionSettings, surplusAllocations: allocations }
      })),
    }),
    {
      name: 'nwt-finance-store',
    }
  )
)
EOF

echo "✅ Store created"

# ============================================
# LAYOUT COMPONENTS
# ============================================
cat > src/components/layout/Sidebar.tsx << 'EOF'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Wallet, TrendingUp,
  TrendingDown, LineChart, Menu, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/assets', icon: Wallet, label: 'Assets' },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/expenses', icon: TrendingDown, label: 'Expenses' },
  { to: '/projections', icon: LineChart, label: 'Projections' },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-primary">Net Wealth</span>
            <span className="text-muted-foreground ml-1 font-normal">Tracker</span>
          </h1>
        </div>

        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-xs text-muted-foreground">
            NWT v1.0 · AUD
          </div>
        </div>
      </aside>
    </>
  )
}
EOF

cat > src/components/layout/AppLayout.tsx << 'EOF'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:ml-64 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
EOF

echo "✅ Layout created"

# ============================================
# DASHBOARD COMPONENTS
# ============================================
cat > src/components/dashboard/MetricCard.tsx << 'EOF'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn(
              "text-2xl font-bold tracking-tight",
              trend === 'up' && "text-emerald-500",
              trend === 'down' && "text-red-500",
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl",
            trend === 'up' && "bg-emerald-500/10",
            trend === 'down' && "bg-red-500/10",
            !trend && "bg-primary/10",
          )}>
            <Icon className={cn(
              "h-5 w-5",
              trend === 'up' && "text-emerald-500",
              trend === 'down' && "text-red-500",
              !trend && "text-primary",
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
EOF

cat > src/components/dashboard/WealthChart.tsx << 'EOF'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCompact } from '@/lib/format'

interface WealthChartProps {
  data: Array<{ label: string; netWealth: number; totalAssets: number; totalLiabilities: number }>
}

export function WealthChart({ data }: WealthChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Net Wealth Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Add assets and income to see your wealth projection
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Net Wealth Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="netWealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tickFormatter={formatCompact} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                formatter={(value: number) => [formatCompact(value), '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="netWealth"
                stroke="hsl(160, 60%, 45%)"
                fill="url(#netWealthGrad)"
                strokeWidth={2}
                name="Net Wealth"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
EOF

cat > src/components/dashboard/AssetBreakdown.tsx << 'EOF'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'

interface AssetBreakdownProps {
  data: Array<{ name: string; value: number; color: string }>
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6b7280', '#ec4899']

export function AssetBreakdown({ data }: AssetBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Add assets to see your breakdown
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Asset Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
EOF

echo "✅ Dashboard components created"

# ============================================
# PAGES
# ============================================
cat > src/pages/DashboardPage.tsx << 'EOF'
import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Building2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { AssetBreakdown } from '@/components/dashboard/AssetBreakdown'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateMonthlyIncome, calculateMonthlyExpenses, calculateMonthlyCashflow,
  calculateSavingsRate, calculateDebtToAssetRatio, projectNetWealth
} from '@/lib/calculations'

export function DashboardPage() {
  const [showMore, setShowMore] = useState(false)
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings } = useFinanceStore()

  const netWealth = calculateNetWealth(assets, properties, liabilities)
  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const monthlyIncome = calculateMonthlyIncome(incomes)
  const monthlyExpenses = calculateMonthlyExpenses(expenseBudgets)
  const monthlyCashflow = calculateMonthlyCashflow(incomes, expenseBudgets)
  const savingsRate = calculateSavingsRate(incomes, expenseBudgets)
  const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)

  // Projection data
  const projectionData = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears
  )

  // Asset breakdown for pie chart
  const categoryTotals = new Map<string, number>()
  assets.forEach(a => {
    const label = a.category.charAt(0).toUpperCase() + a.category.slice(1)
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + a.currentValue)
  })
  if (properties.length > 0) {
    categoryTotals.set('Property', properties.reduce((s, p) => s + p.currentValue, 0))
  }
  const breakdownData = Array.from(categoryTotals.entries()).map(([name, value]) => ({
    name, value, color: ''
  }))

  const isEmpty = assets.length === 0 && properties.length === 0 && liabilities.length === 0

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your financial overview at a glance</p>
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Welcome to Net Wealth Tracker</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your properties, assets, income, and expenses to see your financial picture.
          </p>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Wealth"
          value={formatCurrency(netWealth)}
          icon={DollarSign}
          trend={netWealth >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Monthly Cashflow"
          value={formatCurrency(monthlyCashflow)}
          subtitle={`${formatCurrency(monthlyIncome)} in · ${formatCurrency(monthlyExpenses)} out`}
          icon={monthlyCashflow >= 0 ? TrendingUp : TrendingDown}
          trend={monthlyCashflow >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Assets"
          value={formatCurrency(totalAssets)}
          icon={PiggyBank}
        />
        <MetricCard
          title="Total Liabilities"
          value={formatCurrency(totalLiabilities)}
          icon={Building2}
          trend={totalLiabilities > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Show More Metrics */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore ? (
          <>Hide Details <ChevronUp className="ml-2 h-4 w-4" /></>
        ) : (
          <>Show More Metrics <ChevronDown className="ml-2 h-4 w-4" /></>
        )}
      </Button>

      {showMore && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Savings Rate"
            value={formatPercent(savingsRate)}
            subtitle="of monthly income saved"
            icon={PiggyBank}
            trend={savingsRate > 0.2 ? 'up' : savingsRate > 0 ? 'neutral' : 'down'}
          />
          <MetricCard
            title="Debt-to-Asset Ratio"
            value={formatPercent(debtRatio)}
            subtitle={debtRatio < 0.5 ? 'Healthy' : 'High leverage'}
            icon={BarChart3}
            trend={debtRatio < 0.5 ? 'up' : 'down'}
          />
          <MetricCard
            title="Monthly Surplus"
            value={formatCurrency(monthlyCashflow)}
            subtitle="available to allocate"
            icon={TrendingUp}
            trend={monthlyCashflow > 0 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WealthChart data={projectionData} />
        </div>
        <AssetBreakdown data={breakdownData} />
      </div>
    </div>
  )
}
EOF

cat > src/pages/AssetsPage.tsx << 'EOF'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { AssetCategory } from '@/types/models'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash / Savings',
  property: 'Property',
  stocks: 'Stocks / ETFs',
  super: 'Superannuation',
  vehicles: 'Vehicles',
  other: 'Other',
}

const DEFAULT_GROWTH: Record<AssetCategory, number> = {
  cash: 0.045,
  property: 0.07,
  stocks: 0.08,
  super: 0.07,
  vehicles: -0.10,
  other: 0.03,
}

export function AssetsPage() {
  const { assets, addAsset, updateAsset, removeAsset } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'cash' as AssetCategory,
    currentValue: '',
    growthRatePA: '',
    isOffset: false,
  })

  const resetForm = () => {
    setForm({ name: '', category: 'cash', currentValue: '', growthRatePA: '', isOffset: false })
    setEditId(null)
  }

  const handleCategoryChange = (cat: AssetCategory) => {
    setForm({ ...form, category: cat, growthRatePA: String(DEFAULT_GROWTH[cat] * 100) })
  }

  const handleSave = () => {
    const data = {
      name: form.name,
      category: form.category,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 0) / 100,
      ...(form.category === 'cash' ? { isOffset: form.isOffset } : {}),
    }

    if (editId) {
      updateAsset(editId, data)
    } else {
      addAsset(data as any)
    }
    resetForm()
    setOpen(false)
  }

  const handleEdit = (id: string) => {
    const asset = assets.find(a => a.id === id)
    if (!asset) return
    setForm({
      name: asset.name,
      category: asset.category,
      currentValue: String(asset.currentValue),
      growthRatePA: String(asset.growthRatePA * 100),
      isOffset: (asset as any).isOffset ?? false,
    })
    setEditId(id)
    setOpen(true)
  }

  const total = assets.reduce((s, a) => s + a.currentValue, 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground mt-1">Manage your cash, stocks, super & more</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Add'} Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => handleCategoryChange(v as AssetCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'property').map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Value (AUD)</Label>
                <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} />
              </div>
              <div>
                <Label>Expected Growth Rate (% p.a.)</Label>
                <Input type="number" step="0.1" value={form.growthRatePA} onChange={e => setForm({...form, growthRatePA: e.target.value})} />
              </div>
              {form.category === 'cash' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isOffset" checked={form.isOffset} onChange={e => setForm({...form, isOffset: e.target.checked})} className="rounded" />
                  <Label htmlFor="isOffset">This is a mortgage offset account</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.currentValue}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Assets</span>
            <span className="text-emerald-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
          <p className="text-muted-foreground">Add your cash, stocks, super and other assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map(asset => (
            <Card key={asset.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{CATEGORY_LABELS[asset.category]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatPercent(asset.growthRatePA)} p.a.</span>
                    </div>
                    <p className="text-xl font-bold mt-2">{formatCurrency(asset.currentValue)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(asset.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeAsset(asset.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
EOF

cat > src/pages/PropertiesPage.tsx << 'EOF'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { PropertyType } from '@/types/models'

export function PropertiesPage() {
  const { properties, liabilities, addProperty, addLiability, updateProperty, removeProperty, removeLiability } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'primary_residence' as PropertyType, address: '',
    currentValue: '', growthRatePA: '7',
    // Mortgage
    hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
    repaymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
    // Investment
    weeklyRent: '', vacancyRate: '3.8',
    councilRatesPA: '', waterRatesPA: '', insurancePA: '',
    strataPA: '', propertyManagementPct: '8', landTaxPA: '', maintenanceBudgetPA: '',
  })

  const resetForm = () => {
    setForm({
      name: '', type: 'primary_residence', address: '', currentValue: '', growthRatePA: '7',
      hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
      repaymentFrequency: 'monthly',
      weeklyRent: '', vacancyRate: '3.8', councilRatesPA: '', waterRatesPA: '',
      insurancePA: '', strataPA: '', propertyManagementPct: '8', landTaxPA: '', maintenanceBudgetPA: '',
    })
  }

  const handleSave = () => {
    let mortgageId: string | undefined
    if (form.hasMortgage) {
      const tempId = crypto.randomUUID()
      addLiability({
        name: `${form.name} Mortgage`,
        category: 'mortgage',
        currentBalance: parseFloat(form.mortgageBalance) || 0,
        interestRatePA: (parseFloat(form.interestRate) || 0) / 100,
        minimumRepayment: parseFloat(form.repayment) || 0,
        repaymentFrequency: form.repaymentFrequency,
        linkedPropertyId: tempId,
        offsetAccountIds: [],
      })
      // Get the just-added mortgage
      const store = useFinanceStore.getState()
      mortgageId = store.liabilities[store.liabilities.length - 1]?.id
    }

    addProperty({
      name: form.name,
      type: form.type,
      address: form.address || undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 7) / 100,
      mortgageId,
      ...(form.type === 'investment' ? {
        weeklyRent: parseFloat(form.weeklyRent) || 0,
        vacancyRatePA: (parseFloat(form.vacancyRate) || 0) / 100,
        councilRatesPA: parseFloat(form.councilRatesPA) || 0,
        waterRatesPA: parseFloat(form.waterRatesPA) || 0,
        insurancePA: parseFloat(form.insurancePA) || 0,
        strataPA: parseFloat(form.strataPA) || 0,
        propertyManagementPct: (parseFloat(form.propertyManagementPct) || 0) / 100,
        landTaxPA: parseFloat(form.landTaxPA) || 0,
        maintenanceBudgetPA: parseFloat(form.maintenanceBudgetPA) || 0,
      } : {}),
    })

    resetForm()
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    const prop = properties.find(p => p.id === id)
    if (prop?.mortgageId) removeLiability(prop.mortgageId)
    removeProperty(id)
  }

  const getMortgage = (mortgageId?: string) => liabilities.find(l => l.id === mortgageId)

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0)
  const totalDebt = properties.reduce((s, p) => {
    const m = getMortgage(p.mortgageId)
    return s + (m?.currentBalance ?? 0)
  }, 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your property portfolio</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Property</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <Label>Property Name</Label>
                  <Input placeholder="e.g. Family Home" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({...form, type: v as PropertyType})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary_residence">Primary Residence</SelectItem>
                      <SelectItem value="investment">Investment Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input placeholder="Optional" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Value (AUD)</Label>
                    <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} />
                  </div>
                  <div>
                    <Label>Growth Rate (% p.a.)</Label>
                    <Input type="number" step="0.1" value={form.growthRatePA} onChange={e => setForm({...form, growthRatePA: e.target.value})} />
                  </div>
                </div>

                <Separator />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="hasMortgage" checked={form.hasMortgage} onChange={e => setForm({...form, hasMortgage: e.target.checked})} className="rounded" />
                  <Label htmlFor="hasMortgage">Has Mortgage</Label>
                </div>

                {form.hasMortgage && (
                  <div className="space-y-4 pl-4 border-l-2 border-border">
                    <div>
                      <Label>Mortgage Balance (AUD)</Label>
                      <Input type="number" value={form.mortgageBalance} onChange={e => setForm({...form, mortgageBalance: e.target.value})} />
                    </div>
                    <div>
                      <Label>Interest Rate (% p.a.)</Label>
                      <Input type="number" step="0.01" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Repayment Amount</Label>
                        <Input type="number" value={form.repayment} onChange={e => setForm({...form, repayment: e.target.value})} />
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Select value={form.repaymentFrequency} onValueChange={(v: any) => setForm({...form, repaymentFrequency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {form.type === 'investment' && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold">Investment Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Weekly Rent (AUD)</Label>
                        <Input type="number" value={form.weeklyRent} onChange={e => setForm({...form, weeklyRent: e.target.value})} />
                      </div>
                      <div>
                        <Label>Vacancy Rate (% p.a.)</Label>
                        <Input type="number" step="0.1" value={form.vacancyRate} onChange={e => setForm({...form, vacancyRate: e.target.value})} />
                      </div>
                      <div>
                        <Label>Council Rates (p.a.)</Label>
                        <Input type="number" value={form.councilRatesPA} onChange={e => setForm({...form, councilRatesPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Water Rates (p.a.)</Label>
                        <Input type="number" value={form.waterRatesPA} onChange={e => setForm({...form, waterRatesPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Insurance (p.a.)</Label>
                        <Input type="number" value={form.insurancePA} onChange={e => setForm({...form, insurancePA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Strata (p.a.)</Label>
                        <Input type="number" value={form.strataPA} onChange={e => setForm({...form, strataPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Management Fee (%)</Label>
                        <Input type="number" step="0.1" value={form.propertyManagementPct} onChange={e => setForm({...form, propertyManagementPct: e.target.value})} />
                      </div>
                      <div>
                        <Label>Land Tax (p.a.)</Label>
                        <Input type="number" value={form.landTaxPA} onChange={e => setForm({...form, landTaxPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Maintenance (p.a.)</Label>
                        <Input type="number" value={form.maintenanceBudgetPA} onChange={e => setForm({...form, maintenanceBudgetPA: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.currentValue}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Debt</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue - totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
          <p className="text-muted-foreground">Add your home, investment properties, and more.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(prop => {
            const mortgage = getMortgage(prop.mortgageId)
            const equity = prop.currentValue - (mortgage?.currentBalance ?? 0)
            return (
              <Card key={prop.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {prop.type === 'investment' ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                        <h3 className="text-lg font-semibold">{prop.name}</h3>
                        <Badge variant={prop.type === 'investment' ? 'default' : 'secondary'}>
                          {prop.type === 'investment' ? 'Investment' : 'Primary'}
                        </Badge>
                      </div>
                      {prop.address && <p className="text-sm text-muted-foreground">{prop.address}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Value</p>
                          <p className="font-semibold">{formatCurrency(prop.currentValue)}</p>
                        </div>
                        {mortgage && (
                          <div>
                            <p className="text-xs text-muted-foreground">Mortgage</p>
                            <p className="font-semibold text-red-500">{formatCurrency(mortgage.currentBalance)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Equity</p>
                          <p className="font-semibold text-emerald-500">{formatCurrency(equity)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Growth</p>
                          <p className="font-semibold">{formatPercent(prop.growthRatePA)} p.a.</p>
                        </div>
                        {prop.type === 'investment' && prop.weeklyRent && (
                          <div>
                            <p className="text-xs text-muted-foreground">Rent</p>
                            <p className="font-semibold">{formatCurrency(prop.weeklyRent)}/wk</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(prop.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
EOF

cat > src/pages/IncomePage.tsx << 'EOF'
import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { IncomeCategory } from '@/types/models'

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary / Wages',
  rental: 'Rental Income',
  dividends: 'Dividends',
  interest: 'Interest',
  side_hustle: 'Side Hustle',
  other: 'Other',
}

export function IncomePage() {
  const { incomes, addIncome, updateIncome, removeIncome } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: 'salary' as IncomeCategory, monthlyAmount: '', isActive: true,
  })

  const resetForm = () => { setForm({ name: '', category: 'salary', monthlyAmount: '', isActive: true }); setEditId(null) }

  const handleSave = () => {
    const data = {
      name: form.name,
      category: form.category,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0,
      isActive: form.isActive,
    }
    if (editId) updateIncome(editId, data)
    else addIncome(data)
    resetForm(); setOpen(false)
  }

  const handleEdit = (id: string) => {
    const item = incomes.find(i => i.id === id)
    if (!item) return
    setForm({ name: item.name, category: item.category, monthlyAmount: String(item.monthlyAmount), isActive: item.isActive })
    setEditId(id); setOpen(true)
  }

  const total = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground mt-1">Track your income sources</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Income</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Income</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input placeholder="e.g. Full-time Salary" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as IncomeCategory})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Amount (AUD)</Label><Input type="number" placeholder="0" value={form.monthlyAmount} onChange={e => setForm({...form, monthlyAmount: e.target.value})} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
                <Label htmlFor="isActive">Currently active</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.monthlyAmount}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Monthly Income</span>
            <span className="text-emerald-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {incomes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No income sources yet</h3>
          <p className="text-muted-foreground">Add your salary, rental income, dividends, etc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomes.map(item => (
            <Card key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
                      {!item.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-xl font-bold mt-2 text-emerald-500">{formatCurrency(item.monthlyAmount)}/mo</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeIncome(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
EOF

cat > src/pages/ExpensesPage.tsx << 'EOF'
import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory } from '@/types/models'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  insurance_home: 'Home Insurance', insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  utilities: 'Utilities', groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', pet_expenses: 'Pet Expenses', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', other: 'Other',
}

export function ExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    label: '', category: 'groceries' as ExpenseCategory, monthlyBudget: '',
  })

  const resetForm = () => { setForm({ label: '', category: 'groceries', monthlyBudget: '' }); setEditId(null) }

  const handleSave = () => {
    const data = {
      label: form.label || CATEGORY_LABELS[form.category],
      category: form.category,
      monthlyBudget: parseFloat(form.monthlyBudget) || 0,
    }
    if (editId) updateExpenseBudget(editId, data)
    else addExpenseBudget(data)
    resetForm(); setOpen(false)
  }

  const handleEdit = (id: string) => {
    const item = expenseBudgets.find(b => b.id === id)
    if (!item) return
    setForm({ label: item.label, category: item.category, monthlyBudget: String(item.monthlyBudget) })
    setEditId(id); setOpen(true)
  }

  const total = expenseBudgets.reduce((s, b) => s + b.monthlyBudget, 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Set your monthly budget</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as ExpenseCategory, label: form.label || CATEGORY_LABELS[v as ExpenseCategory]})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Label</Label><Input placeholder={CATEGORY_LABELS[form.category]} value={form.label} onChange={e => setForm({...form, label: e.target.value})} /></div>
              <div><Label>Monthly Budget (AUD)</Label><Input type="number" placeholder="0" value={form.monthlyBudget} onChange={e => setForm({...form, monthlyBudget: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.monthlyBudget}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Monthly Expenses</span>
            <span className="text-red-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {expenseBudgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground">Set your monthly budget for each category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseBudgets.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <Badge variant="secondary" className="mt-1">{CATEGORY_LABELS[item.category]}</Badge>
                    <p className="text-xl font-bold mt-2 text-red-500">{formatCurrency(item.monthlyBudget)}/mo</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeExpenseBudget(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
EOF

cat > src/pages/ProjectionsPage.tsx << 'EOF'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import { projectNetWealth } from '@/lib/calculations'
import { LineChart } from 'lucide-react'

export function ProjectionsPage() {
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings, updateProjectionSettings } = useFinanceStore()

  const data = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears
  )

  const finalPoint = data[data.length - 1]
  const startPoint = data[0]

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projections</h1>
        <p className="text-muted-foreground mt-1">See where your wealth is heading</p>
      </div>

      {data.length <= 1 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Not enough data</h3>
          <p className="text-muted-foreground">Add assets, income, and expenses to generate projections.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Current Net Wealth</p>
                <p className="text-2xl font-bold">{formatCurrency(startPoint?.netWealth ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected ({projectionSettings.projectionYears}yr)</p>
                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(finalPoint?.netWealth ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected Growth</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {formatCurrency((finalPoint?.netWealth ?? 0) - (startPoint?.netWealth ?? 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label>Projection Period (years)</Label>
                <Input
                  type="number"
                  value={projectionSettings.projectionYears}
                  onChange={e => updateProjectionSettings({ projectionYears: parseInt(e.target.value) || 20 })}
                  min={1}
                  max={50}
                />
              </div>
            </CardContent>
          </Card>

          <WealthChart data={data} />
        </>
      )}
    </div>
  )
}
EOF

echo "✅ Pages created"

# ============================================
# APP.TSX WITH ROUTING
# ============================================
cat > src/App.tsx << 'EOF'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { IncomePage } from '@/pages/IncomePage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ProjectionsPage } from '@/pages/ProjectionsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
EOF

# Remove old App.css
rm -f src/App.css

echo "✅ App with routing created"

# ============================================
# SET DARK MODE BY DEFAULT
# ============================================
sed -i '' 's/<html lang="en">/<html lang="en" class="dark">/' index.html

echo "✅ Dark mode enabled"
echo ""
echo "🎉 Net Wealth Tracker is ready!"
echo "Run: npm run dev"
