import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Asset,
  Property, Liability, IncomeItem, ExpenseBudget, ExpenseActual,
  SurplusAllocation, ProjectionSettings, AssetCategory,
  UserProfile, ProfileType, BudgetMode,
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
  userProfile: UserProfile

  // Cloud sync
  resetStore: () => void
  hydrateFromCloud: (data: Record<string, unknown>) => void

  // Profile
  setProfileType: (type: ProfileType) => void
  setIndividualName: (name: string) => void
  setEstimatedMonthlyExpenses: (amount: number) => void
  setBudgetMode: (mode: BudgetMode) => void
  dismissNotification: (id: string) => void
  addHouseholdMember: (name: string) => void
  updateHouseholdMember: (id: string, name: string) => void
  removeHouseholdMember: (id: string) => void

  // Asset CRUD
  addAsset: (asset: Partial<Asset>) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void

  // Property CRUD
  addProperty: (property: Partial<Property>) => void
  updateProperty: (id: string, updates: Partial<Property>) => void
  removeProperty: (id: string) => void

  // Liability CRUD
  addLiability: (liability: Partial<Liability>) => void
  updateLiability: (id: string, updates: Partial<Liability>) => void
  removeLiability: (id: string) => void

  // Income CRUD
  addIncome: (income: Partial<IncomeItem>) => void
  updateIncome: (id: string, updates: Partial<IncomeItem>) => void
  removeIncome: (id: string) => void

  // Expense Budget CRUD
  addExpenseBudget: (budget: Partial<ExpenseBudget>) => void
  updateExpenseBudget: (id: string, updates: Partial<ExpenseBudget>) => void
  removeExpenseBudget: (id: string) => void

  // Expense Actuals
  addExpenseActual: (actual: Partial<ExpenseActual>) => void
  updateExpenseActual: (id: string, updates: Partial<ExpenseActual>) => void
  removeExpenseActual: (id: string) => void
  /** Upsert actuals for a given month — updates existing by budgetId+month, creates new ones */
  bulkUpsertExpenseActuals: (month: string, entries: { budgetId: string; actualAmount: number; notes?: string }[]) => void

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

const DEFAULT_PROFILE: UserProfile = {
  profileType: 'individual',
  householdMembers: [],
  budgetMode: 'estimate',
  estimatedMonthlyExpenses: 0,
  dismissedNotifications: [],
}

const DEFAULT_PROJECTION_SETTINGS: ProjectionSettings = {
  surplusAllocations: [],
  projectionYears: 20,
  defaultGrowthRates: DEFAULT_GROWTH_RATES,
  propertyGrowthOverride: 0.07,
  stockGrowthOverride: 0.07,
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
      projectionSettings: { ...DEFAULT_PROJECTION_SETTINGS },
      userProfile: { ...DEFAULT_PROFILE },

      // Reset store to empty state (used on user switch)
      resetStore: () => set(() => ({
        assets: [],
        properties: [],
        liabilities: [],
        incomes: [],
        expenseBudgets: [],
        expenseActuals: [],
        projectionSettings: { ...DEFAULT_PROJECTION_SETTINGS },
        userProfile: { ...DEFAULT_PROFILE },
      })),

      // Cloud sync — replaces store data with cloud data
      hydrateFromCloud: (data) => set(() => {
        const hydrated: Record<string, unknown> = {}
        const keys = ['assets', 'properties', 'liabilities', 'incomes', 'expenseBudgets', 'expenseActuals', 'projectionSettings', 'userProfile']
        for (const key of keys) {
          if (data[key] !== undefined) {
            hydrated[key] = data[key]
          }
        }
        return hydrated as Partial<FinanceState>
      }),

      // Profile
      setProfileType: (type) => set((state) => ({
        userProfile: { ...state.userProfile, profileType: type },
      })),
      setIndividualName: (name) => set((state) => ({
        userProfile: { ...state.userProfile, individualName: name },
      })),
      setEstimatedMonthlyExpenses: (amount) => set((state) => ({
        userProfile: { ...state.userProfile, estimatedMonthlyExpenses: amount },
      })),
      setBudgetMode: (mode) => set((state) => ({
        userProfile: { ...state.userProfile, budgetMode: mode },
      })),
      dismissNotification: (id) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          dismissedNotifications: [...(state.userProfile.dismissedNotifications || []), id],
        },
      })),
      addHouseholdMember: (name) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: [
            ...state.userProfile.householdMembers,
            { id: generateId(), name },
          ],
        },
      })),
      updateHouseholdMember: (id, name) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: state.userProfile.householdMembers.map(m =>
            m.id === id ? { ...m, name } : m
          ),
        },
      })),
      removeHouseholdMember: (id) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: state.userProfile.householdMembers.filter(m => m.id !== id),
        },
      })),

      // Assets
      addAsset: (asset) => set((state) => ({
        assets: [...state.assets, { ...asset, id: generateId(), createdAt: now(), updatedAt: now() } as Asset]
      })),
      updateAsset: (id, updates) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),
      removeAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id),
        // Cascade: remove any expense budgets linked to this asset (e.g. vehicle loan/lease repayments)
        expenseBudgets: state.expenseBudgets.filter(b => b.linkedAssetId !== id),
      })),

      // Properties
      addProperty: (property) => set((state) => ({
        properties: [...state.properties, { ...property, id: generateId(), createdAt: now(), updatedAt: now() } as Property]
      })),
      updateProperty: (id, updates) => set((state) => ({
        properties: state.properties.map(p => p.id === id ? { ...p, ...updates, updatedAt: now() } : p)
      })),
      removeProperty: (id) => set((state) => ({
        properties: state.properties.filter(p => p.id !== id)
      })),

      // Liabilities
      addLiability: (liability) => set((state) => ({
        liabilities: [...state.liabilities, { ...liability, id: generateId(), createdAt: now(), updatedAt: now() } as Liability]
      })),
      updateLiability: (id, updates) => set((state) => ({
        liabilities: state.liabilities.map(l => l.id === id ? { ...l, ...updates, updatedAt: now() } : l)
      })),
      removeLiability: (id) => set((state) => {
        const liability = state.liabilities.find(l => l.id === id)
        const result: Partial<FinanceState> = {
          liabilities: state.liabilities.filter(l => l.id !== id),
        }
        // Cascade: if removing a car loan or lease liability, also remove its auto-generated expense budget
        if (liability && (liability.category === 'car_loan')) {
          const loanName = liability.name
          result.expenseBudgets = state.expenseBudgets.filter(b =>
            !(b.label === `${loanName} Repayment` || b.label.endsWith('Car Loan Repayment') && b.label.startsWith(loanName.replace(' Car Loan', '')))
          )
        }
        return result
      }),

      // Income
      addIncome: (income) => set((state) => ({
        incomes: [...state.incomes, { ...income, id: generateId(), createdAt: now(), updatedAt: now() } as IncomeItem]
      })),
      updateIncome: (id, updates) => set((state) => ({
        incomes: state.incomes.map(i => i.id === id ? { ...i, ...updates, updatedAt: now() } : i)
      })),
      removeIncome: (id) => set((state) => ({
        incomes: state.incomes.filter(i => i.id !== id)
      })),

      // Expense Budgets
      addExpenseBudget: (budget) => set((state) => ({
        expenseBudgets: [...state.expenseBudgets, { ...budget, id: generateId(), createdAt: now(), updatedAt: now() } as ExpenseBudget]
      })),
      updateExpenseBudget: (id, updates) => set((state) => ({
        expenseBudgets: state.expenseBudgets.map(b => b.id === id ? { ...b, ...updates, updatedAt: now() } : b)
      })),
      removeExpenseBudget: (id) => set((state) => ({
        expenseBudgets: state.expenseBudgets.filter(b => b.id !== id)
      })),

      // Expense Actuals
      addExpenseActual: (actual) => set((state) => ({
        expenseActuals: [...state.expenseActuals, { ...actual, id: generateId(), createdAt: now(), updatedAt: now() } as ExpenseActual]
      })),
      updateExpenseActual: (id, updates) => set((state) => ({
        expenseActuals: state.expenseActuals.map(a => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),
      removeExpenseActual: (id) => set((state) => ({
        expenseActuals: state.expenseActuals.filter(a => a.id !== id)
      })),
      bulkUpsertExpenseActuals: (month, entries) => set((state) => {
        const updated = [...state.expenseActuals]
        for (const entry of entries) {
          if (entry.actualAmount === 0 && !entry.notes) {
            // Remove zero entries to keep data clean
            const idx = updated.findIndex(a => a.budgetId === entry.budgetId && a.month === month)
            if (idx !== -1) updated.splice(idx, 1)
            continue
          }
          const existing = updated.findIndex(a => a.budgetId === entry.budgetId && a.month === month)
          if (existing !== -1) {
            updated[existing] = { ...updated[existing], actualAmount: entry.actualAmount, notes: entry.notes, updatedAt: now() }
          } else {
            updated.push({
              id: generateId(), budgetId: entry.budgetId, month,
              actualAmount: entry.actualAmount, notes: entry.notes,
              createdAt: now(), updatedAt: now(),
            } as ExpenseActual)
          }
        }
        return { expenseActuals: updated }
      }),

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
        merge: (persisted: any, current: any) => ({
          ...current,
          ...persisted,
          userProfile: { ...DEFAULT_PROFILE, ...(persisted?.userProfile ?? {}) },
        }),
    }
  )
)
