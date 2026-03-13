import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Asset,
  Property, Liability, IncomeItem, ExpenseBudget, ExpenseActual,
  SurplusAllocation, ProjectionSettings, AssetCategory,
  UserProfile, ProfileType, BudgetMode, ExpenseCalcSource,
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
  setExpenseCalcSource: (source: ExpenseCalcSource) => void
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
  expenseCalcSource: 'budget',
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
      hydrateFromCloud: (data: Record<string, unknown>) => set(() => {
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
      setProfileType: (type: ProfileType) => set((state: FinanceState) => ({
        userProfile: { ...state.userProfile, profileType: type },
      })),
      setIndividualName: (name: string) => set((state: FinanceState) => ({
        userProfile: { ...state.userProfile, individualName: name },
      })),
      setEstimatedMonthlyExpenses: (amount: number) => set((state: FinanceState) => ({
        userProfile: { ...state.userProfile, estimatedMonthlyExpenses: amount },
      })),
      setBudgetMode: (mode: BudgetMode) => set((state: FinanceState) => ({
        userProfile: { ...state.userProfile, budgetMode: mode },
      })),
      setExpenseCalcSource: (source: ExpenseCalcSource) => set((state: FinanceState) => ({
        userProfile: { ...state.userProfile, expenseCalcSource: source },
      })),
      dismissNotification: (id: string) => set((state: FinanceState) => ({
        userProfile: {
          ...state.userProfile,
          dismissedNotifications: [...(state.userProfile.dismissedNotifications || []), id],
        },
      })),
      addHouseholdMember: (name: string) => set((state: FinanceState) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: [
            ...state.userProfile.householdMembers,
            { id: generateId(), name },
          ],
        },
      })),
      updateHouseholdMember: (id: string, name: string) => set((state: FinanceState) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: state.userProfile.householdMembers.map((m: { id: string; name: string }) =>
            m.id === id ? { ...m, name } : m
          ),
        },
      })),
      removeHouseholdMember: (id: string) => set((state: FinanceState) => ({
        userProfile: {
          ...state.userProfile,
          householdMembers: state.userProfile.householdMembers.filter((m: { id: string; name: string }) => m.id !== id),
        },
      })),

      // Assets
      addAsset: (asset: Partial<Asset>) => set((state: FinanceState) => ({
        assets: [...state.assets, { ...asset, id: generateId(), createdAt: now(), updatedAt: now() } as Asset]
      })),
      updateAsset: (id: string, updates: Partial<Asset>) => set((state: FinanceState) => ({
        assets: state.assets.map((a: Asset) => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),
      removeAsset: (id: string) => set((state: FinanceState) => ({
        assets: state.assets.filter((a: Asset) => a.id !== id),
        // Cascade: remove any expense budgets linked to this asset (e.g. vehicle loan/lease repayments)
        expenseBudgets: state.expenseBudgets.filter((b: ExpenseBudget) => b.linkedAssetId !== id),
      })),

      // Properties
      addProperty: (property: Partial<Property>) => set((state: FinanceState) => ({
        properties: [...state.properties, { ...property, id: generateId(), createdAt: now(), updatedAt: now() } as Property]
      })),
      updateProperty: (id: string, updates: Partial<Property>) => set((state: FinanceState) => ({
        properties: state.properties.map((p: Property) => p.id === id ? { ...p, ...updates, updatedAt: now() } : p)
      })),
      removeProperty: (id: string) => set((state: FinanceState) => ({
        properties: state.properties.filter((p: Property) => p.id !== id)
      })),

      // Liabilities
      addLiability: (liability: Partial<Liability>) => set((state: FinanceState) => ({
        liabilities: [...state.liabilities, { ...liability, id: generateId(), createdAt: now(), updatedAt: now() } as Liability]
      })),
      updateLiability: (id: string, updates: Partial<Liability>) => set((state: FinanceState) => ({
        liabilities: state.liabilities.map((l: Liability) => l.id === id ? { ...l, ...updates, updatedAt: now() } : l)
      })),
      removeLiability: (id: string) => set((state: FinanceState) => {
        const liability = state.liabilities.find((l: Liability) => l.id === id)
        const result: Partial<FinanceState> = {
          liabilities: state.liabilities.filter((l: Liability) => l.id !== id),
        }
        // Cascade: if removing a car loan or lease liability, also remove its auto-generated expense budget
        if (liability && (liability.category === 'car_loan')) {
          const loanName = liability.name
          result.expenseBudgets = state.expenseBudgets.filter((b: ExpenseBudget) =>
            !(b.label === `${loanName} Repayment` || b.label.endsWith('Car Loan Repayment') && b.label.startsWith(loanName.replace(' Car Loan', '')))
          )
        }
        return result
      }),

      // Income
      addIncome: (income: Partial<IncomeItem>) => set((state: FinanceState) => ({
        incomes: [...state.incomes, { ...income, id: generateId(), createdAt: now(), updatedAt: now() } as IncomeItem]
      })),
      updateIncome: (id: string, updates: Partial<IncomeItem>) => set((state: FinanceState) => ({
        incomes: state.incomes.map((i: IncomeItem) => i.id === id ? { ...i, ...updates, updatedAt: now() } : i)
      })),
      removeIncome: (id: string) => set((state: FinanceState) => ({
        incomes: state.incomes.filter((i: IncomeItem) => i.id !== id)
      })),

      // Expense Budgets
      addExpenseBudget: (budget: Partial<ExpenseBudget>) => set((state: FinanceState) => ({
        expenseBudgets: [...state.expenseBudgets, { ...budget, id: generateId(), createdAt: now(), updatedAt: now() } as ExpenseBudget]
      })),
      updateExpenseBudget: (id: string, updates: Partial<ExpenseBudget>) => set((state: FinanceState) => ({
        expenseBudgets: state.expenseBudgets.map((b: ExpenseBudget) => b.id === id ? { ...b, ...updates, updatedAt: now() } : b)
      })),
      removeExpenseBudget: (id: string) => set((state: FinanceState) => ({
        expenseBudgets: state.expenseBudgets.filter((b: ExpenseBudget) => b.id !== id)
      })),

      // Expense Actuals
      addExpenseActual: (actual: Partial<ExpenseActual>) => set((state: FinanceState) => ({
        expenseActuals: [...state.expenseActuals, { ...actual, id: generateId(), createdAt: now(), updatedAt: now() } as ExpenseActual]
      })),
      updateExpenseActual: (id: string, updates: Partial<ExpenseActual>) => set((state: FinanceState) => ({
        expenseActuals: state.expenseActuals.map((a: ExpenseActual) => a.id === id ? { ...a, ...updates, updatedAt: now() } : a)
      })),
      removeExpenseActual: (id: string) => set((state: FinanceState) => ({
        expenseActuals: state.expenseActuals.filter((a: ExpenseActual) => a.id !== id)
      })),
      bulkUpsertExpenseActuals: (month: string, entries: { budgetId: string; actualAmount: number; notes?: string }[]) => set((state: FinanceState) => {
        const updated = [...state.expenseActuals]
        for (const entry of entries) {
          if (entry.actualAmount === 0 && !entry.notes) {
            // Remove zero entries to keep data clean
            const idx = updated.findIndex((a: ExpenseActual) => a.budgetId === entry.budgetId && a.month === month)
            if (idx !== -1) updated.splice(idx, 1)
            continue
          }
          const existing = updated.findIndex((a: ExpenseActual) => a.budgetId === entry.budgetId && a.month === month)
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
      updateProjectionSettings: (settings: Partial<ProjectionSettings>) => set((state: FinanceState) => ({
        projectionSettings: { ...state.projectionSettings, ...settings }
      })),
      setSurplusAllocations: (allocations: SurplusAllocation[]) => set((state: FinanceState) => ({
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
