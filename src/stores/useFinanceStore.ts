import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Asset, CashAsset, StockAsset, SuperAsset, VehicleAsset,
  Property, Liability, IncomeItem, ExpenseBudget, ExpenseActual,
  SurplusAllocation, ProjectionSettings, AssetCategory
} from '@/types/models'
import { generateId } from '@/lib/format'

export interface FinanceState {
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
