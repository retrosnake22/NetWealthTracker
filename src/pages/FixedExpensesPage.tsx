import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ExternalLink, Car, CreditCard, Landmark } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { ExpenseCategory, Property } from '@/types/models'

interface AutoExpenseItem {
  key: string
  propertyName: string
  label: string
  category: ExpenseCategory
  monthlyAmount: number
}

/* ── Expense-type colour map ── */
const EXPENSE_COLORS: Record<string, { badge: string; dot: string }> = {
  mortgage_repayment: {
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  council_rates: {
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  water_rates: {
    badge: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
    dot: 'bg-cyan-500',
  },
  building_insurance: {
    badge: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  property_management: {
    badge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  strata: {
    badge: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
  land_tax: {
    badge: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  maintenance: {
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
}
const DEFAULT_EXPENSE_COLOR = {
  badge: 'bg-slate-50 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  dot: 'bg-slate-500',
}

const LIABILITY_LABELS: Record<string, string> = {
  personal_loan: 'Personal Loan',
  credit_card: 'Credit Card',
  hecs: 'HECS-HELP',
  home_loan: 'Home Loan',
  other: 'Other',
}

export function FixedExpensesPage() {
  const { properties, liabilities, expenseBudgets } = useFinanceStore()

  // Clean up orphaned vehicle expenses on mount
  useEffect(() => {
    const state = useFinanceStore.getState()
    const assetIds = new Set(state.assets.map(a => a.id))
    const liabilityNames = new Set(state.liabilities.map(l => l.name))

    for (const b of state.expenseBudgets) {
      if (b.linkedAssetId && !assetIds.has(b.linkedAssetId)) {
        state.removeExpenseBudget(b.id)
        continue
      }
      if (b.label.endsWith('Car Loan Repayment')) {
        const loanName = b.label.replace(' Repayment', '')
        if (!liabilityNames.has(loanName)) {
          state.removeExpenseBudget(b.id)
          continue
        }
      }
      if (b.label.endsWith('Lease Payment')) {
        const leaseName = b.label.replace(' Payment', '')
        if (!liabilityNames.has(leaseName)) {
          state.removeExpenseBudget(b.id)
          continue
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generated property expenses
  const autoPropertyExpenses = useMemo<AutoExpenseItem[]>(() => {
    const items: AutoExpenseItem[] = []
    for (const prop of properties as Property[]) {
      if (prop.mortgageId) {
        const lia = liabilities.find(l => l.id === prop.mortgageId)
        if (lia && lia.minimumRepayment > 0) {
          items.push({ key: `${prop.id}-mortgage`, propertyName: prop.name, label: 'Mortgage', category: 'mortgage_repayment', monthlyAmount: lia.minimumRepayment })
        }
      }
      if (prop.councilRatesPA && prop.councilRatesPA > 0)
        items.push({ key: `${prop.id}-council`, propertyName: prop.name, label: 'Council Rates', category: 'council_rates', monthlyAmount: prop.councilRatesPA / 12 })
      if (prop.waterRatesPA && prop.waterRatesPA > 0)
        items.push({ key: `${prop.id}-water`, propertyName: prop.name, label: 'Water Rates', category: 'water_rates', monthlyAmount: prop.waterRatesPA / 12 })
      if (prop.insurancePA && prop.insurancePA > 0)
        items.push({ key: `${prop.id}-insurance`, propertyName: prop.name, label: 'Insurance', category: 'building_insurance', monthlyAmount: prop.insurancePA / 12 })
      if (prop.strataPA && prop.strataPA > 0)
        items.push({ key: `${prop.id}-strata`, propertyName: prop.name, label: 'Strata', category: 'strata', monthlyAmount: prop.strataPA / 12 })
      if (prop.weeklyRent && prop.weeklyRent > 0 && prop.propertyManagementPct && prop.propertyManagementPct > 0) {
        const monthly = (prop.weeklyRent * 52 * prop.propertyManagementPct) / 100 / 12
        if (monthly > 0) items.push({ key: `${prop.id}-mgmt`, propertyName: prop.name, label: 'Property Management', category: 'property_management', monthlyAmount: monthly })
      }
      if (prop.landTaxPA && prop.landTaxPA > 0)
        items.push({ key: `${prop.id}-landtax`, propertyName: prop.name, label: 'Land Tax', category: 'land_tax', monthlyAmount: prop.landTaxPA / 12 })
      if (prop.maintenanceBudgetPA && prop.maintenanceBudgetPA > 0)
        items.push({ key: `${prop.id}-maintenance`, propertyName: prop.name, label: 'Maintenance', category: 'maintenance', monthlyAmount: prop.maintenanceBudgetPA / 12 })
    }
    return items
  }, [properties, liabilities])

  // Auto-generated vehicle expenses
  const autoVehicleExpenses = useMemo(() => {
    return expenseBudgets.filter(b =>
      b.linkedAssetId ||
      b.label.endsWith('Car Loan Repayment') ||
      b.label.endsWith('Lease Payment')
    )
  }, [expenseBudgets])

  const vehicleExpenseTotal = useMemo(() =>
    autoVehicleExpenses.reduce((s, b) => s + b.monthlyBudget, 0),
    [autoVehicleExpenses]
  )

  // Auto-generated loan & debt repayments
  const autoLoanExpenses = useMemo(() => {
    const propertyMortgageIds = new Set(properties.map(p => p.mortgageId).filter(Boolean))
    return liabilities
      .filter(l => !['mortgage', 'car_loan'].includes(l.category) && l.minimumRepayment > 0)
      .filter(l => !propertyMortgageIds.has(l.id))
      .map(l => {
        const freq = l.repaymentFrequency === 'weekly' ? 52 : l.repaymentFrequency === 'fortnightly' ? 26 : 12
        return {
          id: l.id,
          name: l.name,
          category: l.category,
          monthlyAmount: (l.minimumRepayment * freq) / 12,
          interestRate: l.interestRatePA,
          repaymentFrequency: l.repaymentFrequency,
        }
      })
  }, [liabilities, properties])

  const loanExpenseTotal = autoLoanExpenses.reduce((s, e) => s + e.monthlyAmount, 0)

  const propertyTotal = autoPropertyExpenses.reduce((s, e) => s + e.monthlyAmount, 0)
  const totalMonthly = propertyTotal + vehicleExpenseTotal + loanExpenseTotal

  // Group by property
  const autoByProperty = useMemo(() => {
    const map = new Map<string, AutoExpenseItem[]>()
    for (const item of autoPropertyExpenses) {
      const arr = map.get(item.propertyName) ?? []
      arr.push(item)
      map.set(item.propertyName, arr)
    }
    return Array.from(map.entries()).map(([name, items]) => ({
      name, items, total: items.reduce((s, i) => s + i.monthlyAmount, 0),
    }))
  }, [autoPropertyExpenses])

  // Collect unique expense categories for the legend
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>()
    const result: { category: string; label: string }[] = []
    for (const item of autoPropertyExpenses) {
      if (!seen.has(item.category)) {
        seen.add(item.category)
        result.push({ category: item.category, label: item.label })
      }
    }
    return result
  }, [autoPropertyExpenses])

  const hasAnyExpenses = autoPropertyExpenses.length > 0 || autoVehicleExpenses.length > 0 || autoLoanExpenses.length > 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Fixed Monthly */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-red-800 to-rose-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 dark:bg-white/5" />
          <p className="text-xs font-medium opacity-80 dark:text-slate-400">Total Fixed Monthly</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums dark:text-rose-400">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs opacity-70 mt-0.5 dark:text-slate-500">{formatCurrency(totalMonthly * 12)}/year</p>
        </div>
        {/* Property Costs */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-blue-800 to-blue-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 dark:bg-white/5" />
          <p className="text-xs font-medium opacity-80 dark:text-slate-400">Property Costs</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums dark:text-white">{formatCurrency(propertyTotal)}</p>
          <p className="text-xs opacity-70 mt-0.5 dark:text-slate-500">{autoByProperty.length} propert{autoByProperty.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {/* Vehicle Costs */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-orange-700 to-amber-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 dark:bg-white/5" />
          <p className="text-xs font-medium opacity-80 dark:text-slate-400">Vehicle Costs</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums dark:text-white">{formatCurrency(vehicleExpenseTotal)}</p>
          <p className="text-xs opacity-70 mt-0.5 dark:text-slate-500">{autoVehicleExpenses.length} item{autoVehicleExpenses.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Loans & Debts */}
        <div className="relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br from-violet-800 to-purple-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 dark:bg-white/5" />
          <p className="text-xs font-medium opacity-80 dark:text-slate-400">Loans & Debts</p>
          <p className="text-2xl font-extrabold mt-1 tabular-nums dark:text-white">{formatCurrency(loanExpenseTotal)}</p>
          <p className="text-xs opacity-70 mt-0.5 dark:text-slate-500">{autoLoanExpenses.length} item{autoLoanExpenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {!hasAnyExpenses ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-10 text-center">
          <Building2 className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2 dark:text-white">No fixed expenses yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Fixed expenses are automatically generated from your property, vehicle, and loan data.
          </p>
          <Link
            to="/assets?category=property"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go to Properties <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Property Expenses */}
          {autoPropertyExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-base font-bold dark:text-white">Property Expenses</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {autoByProperty.length}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{'\u{1F517}'} Auto-generated</span>
                </div>
                <span className="text-base font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatCurrency(propertyTotal)}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>

              {/* Expense type legend */}
              {uniqueCategories.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  {uniqueCategories.map(({ category, label }) => {
                    const colors = EXPENSE_COLORS[category] ?? DEFAULT_EXPENSE_COLOR
                    return (
                      <span key={category} className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        {label}
                      </span>
                    )
                  })}
                </div>
              )}

              {autoByProperty.map(({ name, items, total: propTotal }) => (
                <div
                  key={name}
                  className="rounded-xl border-l-4 border-l-blue-500 bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/10 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold dark:text-white">{name}</p>
                        <p className="text-xs text-slate-400">{items.length} expense{items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(propTotal)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                      <p className="text-xs text-slate-400 tabular-nums">{formatCurrency(propTotal * 12)}/yr</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5">
                    {items.map((item, idx) => {
                      const colors = EXPENSE_COLORS[item.category] ?? DEFAULT_EXPENSE_COLOR
                      return (
                        <div
                          key={item.key}
                          className={`flex items-center justify-between px-5 py-3 pl-16 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                            idx !== items.length - 1 ? 'border-b border-slate-50 dark:border-white/5' : ''
                          }`}
                        >
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${colors.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {item.label}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-semibold tabular-nums dark:text-white">{formatCurrency(item.monthlyAmount)}</span>
                            <span className="text-xs text-slate-400 ml-1">/mo</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vehicle Expenses */}
          {autoVehicleExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                  <h2 className="text-base font-bold dark:text-white">Vehicle Expenses</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    {autoVehicleExpenses.length}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{'\u{1F517}'} Auto-generated</span>
                </div>
                <span className="text-base font-bold tabular-nums text-orange-600 dark:text-orange-400">
                  {formatCurrency(vehicleExpenseTotal)}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>

              <div className="rounded-xl border-l-4 border-l-orange-500 bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/10 overflow-hidden">
                {autoVehicleExpenses.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                      idx !== autoVehicleExpenses.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                        <Car className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm dark:text-white">{expense.label}</p>
                        <p className="text-xs text-slate-400">
                          {expense.label.includes('Lease') ? 'Lease' : 'Car Loan'} · Transport
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums dark:text-white">{formatCurrency(expense.monthlyBudget)}</span>
                      <span className="text-xs text-slate-400 ml-1">/mo</span>
                    </div>
                  </div>
                ))}
                {autoVehicleExpenses.length > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Vehicle Expenses</span>
                    <div>
                      <span className="text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">{formatCurrency(vehicleExpenseTotal)}</span>
                      <span className="text-xs text-slate-400 ml-1">/mo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loan & Debt Repayments */}
          {autoLoanExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                  <h2 className="text-base font-bold dark:text-white">Loan & Debt Repayments</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    {autoLoanExpenses.length}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{'\u{1F517}'} Auto-generated</span>
                </div>
                <span className="text-base font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatCurrency(loanExpenseTotal)}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>

              <div className="rounded-xl border-l-4 border-l-violet-500 bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none border border-slate-100 dark:border-white/10 overflow-hidden">
                {autoLoanExpenses.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                      idx !== autoLoanExpenses.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm dark:text-white">{expense.name}</p>
                        <p className="text-xs text-slate-400">
                          {LIABILITY_LABELS[expense.category] ?? expense.category} · {formatPercent(expense.interestRate)} p.a.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums dark:text-white">{formatCurrency(expense.monthlyAmount)}</span>
                      <span className="text-xs text-slate-400 ml-1">/mo</span>
                    </div>
                  </div>
                ))}
                {autoLoanExpenses.length > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Loan Repayments</span>
                    <div>
                      <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">{formatCurrency(loanExpenseTotal)}</span>
                      <span className="text-xs text-slate-400 ml-1">/mo</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
