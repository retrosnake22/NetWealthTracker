import { useState, useMemo } from 'react'
import { Check, Plus, Trash2, X, Pencil, Receipt, Home, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { FinanceState } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory, Property } from '@/types/models'

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_home: 'Home Insurance', insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  utilities: 'Utilities', groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', pet_expenses: 'Pet Expenses', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', other: 'Other',
}

const EXPENSE_QUICK_PICKS: { label: string; categories: ExpenseCategory[] }[] = [
  { label: '🏡 Housing', categories: ['rent', 'utilities'] },
  { label: '🛡️ Insurance', categories: ['insurance_home', 'insurance_health', 'insurance_car', 'insurance_life'] },
  { label: '🛒 Living', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing'] },
  { label: '✨ Lifestyle', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'pet_expenses', 'gifts_donations'] },
  { label: '💰 Financial', categories: ['hecs_repayment', 'tax', 'other'] },
]

interface AutoExpenseItem {
  propertyName: string
  label: string
  monthlyAmount: number
  type: string
}

function StepHeader({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

export function ExpensesStep({ store }: { store: FinanceState }) {
  const { expenseBudgets, addExpenseBudget, removeExpenseBudget, updateExpenseBudget, liabilities, properties } = store
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState<ExpenseCategory | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [collapsedProps, setCollapsedProps] = useState<Set<string>>(new Set())

  const toggleProp = (name: string) => {
    setCollapsedProps(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Auto-generated property expenses grouped by property
  const groupedPropertyExpenses = useMemo(() => {
    const map = new Map<string, AutoExpenseItem[]>()

    // Mortgage repayments
    liabilities
      .filter(l => l.category === 'mortgage' && l.minimumRepayment > 0)
      .forEach(m => {
        const linkedProp = properties.find((p: Property) => p.mortgageId === m.id)
        const propName = linkedProp ? linkedProp.name : m.name
        const arr = map.get(propName) ?? []
        arr.push({
          propertyName: propName,
          label: 'Mortgage',
          monthlyAmount: m.minimumRepayment,
          type: m.mortgageType === 'interest_only' ? 'Interest Only' : 'P&I',
        })
        map.set(propName, arr)
      })

    // Property running costs
    properties.forEach((p: Property) => {
      const add = (label: string, monthlyAmount: number, type: string) => {
        const arr = map.get(p.name) ?? []
        arr.push({ propertyName: p.name, label, monthlyAmount, type })
        map.set(p.name, arr)
      }
      if (p.councilRatesPA && p.councilRatesPA > 0)
        add('Council Rates', p.councilRatesPA / 12, 'Quarterly')
      if (p.waterRatesPA && p.waterRatesPA > 0)
        add('Water Rates', p.waterRatesPA / 12, 'Quarterly')
      if (p.insurancePA && p.insurancePA > 0)
        add('Insurance', p.insurancePA / 12, 'Annual')
      if (p.strataPA && p.strataPA > 0)
        add('Strata', p.strataPA / 12, 'Quarterly')
      if (p.maintenanceBudgetPA && p.maintenanceBudgetPA > 0)
        add('Maintenance', p.maintenanceBudgetPA / 12, 'Annual')
      if (p.type === 'investment' && p.propertyManagementPct && p.propertyManagementPct > 0 && p.weeklyRent && p.weeklyRent > 0)
        add(`Property Mgmt (${p.propertyManagementPct}%)`, p.weeklyRent * 52 * p.propertyManagementPct / 100 / 12, '% of rent')
      if (p.type === 'investment' && p.landTaxPA && p.landTaxPA > 0)
        add('Land Tax', p.landTaxPA / 12, 'Annual')
    })

    return Array.from(map.entries()).map(([name, items]) => ({
      name, items, total: items.reduce((s, i) => s + i.monthlyAmount, 0),
    }))
  }, [liabilities, properties])

  const autoPropertyTotal = groupedPropertyExpenses.reduce((s, g) => s + g.total, 0)
  const existingCategories = new Set(expenseBudgets.map((b: { category: ExpenseCategory }) => b.category))
  const manualTotal = expenseBudgets.reduce((s: number, b: { monthlyBudget: number }) => s + b.monthlyBudget, 0)
  const totalMonthly = manualTotal + autoPropertyTotal

  const handleAdd = (cat: ExpenseCategory) => {
    if (!amount) return
    if (editingId) {
      updateExpenseBudget(editingId, { monthlyBudget: parseFloat(amount) || 0 })
    } else {
      addExpenseBudget({ category: cat, label: EXPENSE_LABELS[cat], monthlyBudget: parseFloat(amount) || 0 })
    }
    setAmount('')
    setAddingCategory(null)
    setEditingId(null)
  }

  const startEdit = (budget: typeof expenseBudgets[0]) => {
    setAddingCategory(budget.category)
    setEditingId(budget.id)
    setAmount(String(budget.monthlyBudget))
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you spend?"
        description="Go through each category and enter your monthly budget. Property costs from your assets are shown automatically."
        icon={Receipt}
      />

      {totalMonthly > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <span className="text-sm font-medium text-muted-foreground">Total Monthly Expenses</span>
          <span className="font-bold text-amber-400 tabular-nums">{formatCurrency(totalMonthly)}</span>
        </div>
      )}

      {/* Auto-generated property expenses — grouped by property */}
      {groupedPropertyExpenses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Home className="w-3.5 h-3.5" /> Property Expenses (Auto)
          </p>
          {groupedPropertyExpenses.map(({ name, items, total: propTotal }) => (
            <Card key={name} className="bg-muted/30 border-dashed overflow-hidden">
              <button
                onClick={() => toggleProp(name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {collapsedProps.has(name)
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Home className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{items.length} expense{items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-amber-400">
                    {formatCurrency(propTotal)}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(propTotal * 12)}/yr</p>
                </div>
              </button>
              {!collapsedProps.has(name) && (
                <div className="border-t border-border/50">
                  {items.map((pe, idx) => (
                    <div
                      key={`${name}-${pe.label}`}
                      className={`flex items-center justify-between px-4 py-2.5 pl-[4.5rem] ${idx !== items.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{pe.label}</p>
                        <p className="text-xs text-muted-foreground">{pe.type}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(pe.monthlyAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Category groups */}
      <div className="space-y-2">
        {EXPENSE_QUICK_PICKS.map(group => {
          const isExpanded = expandedGroup === group.label
          const groupTotal = expenseBudgets
            .filter((b: { category: ExpenseCategory }) => group.categories.includes(b.category))
            .reduce((s: number, b: { monthlyBudget: number }) => s + b.monthlyBudget, 0)
          const filledCount = group.categories.filter(c => existingCategories.has(c)).length

          return (
            <Card key={group.label} className="overflow-hidden">
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{group.label.split(' ')[0]}</span>
                  <div>
                    <p className="font-medium text-left">{group.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {filledCount}/{group.categories.length} entered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {groupTotal > 0 && (
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(groupTotal)}/mo</span>
                  )}
                  <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>{'\u25BE'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/50 px-4 py-3 space-y-2">
                  {group.categories.map(cat => {
                    const existing = expenseBudgets.find((b: { category: ExpenseCategory }) => b.category === cat)
                    const isAdding = addingCategory === cat

                    if (isAdding) {
                      return (
                        <div key={cat} className="flex items-center gap-2 py-1">
                          <span className="text-sm flex-1">{EXPENSE_LABELS[cat]}</span>
                          <CurrencyInput
                            value={amount}
                            onValueChange={setAmount}
                            placeholder="$/month"
                            className="w-32 h-8 text-sm"
                          />
                          <Button size="sm" className="h-8 px-3" onClick={() => handleAdd(cat)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingCategory(null); setEditingId(null); setAmount('') }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )
                    }

                    if (existing) {
                      return (
                        <div key={cat} className="flex items-center justify-between py-1.5">
                          <span className="text-sm">{EXPENSE_LABELS[cat]}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums">{formatCurrency(existing.monthlyBudget)}/mo</span>
                            <Button
                              variant="ghost" size="icon" className="w-7 h-7"
                              onClick={() => startEdit(existing)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="w-7 h-7 text-destructive"
                              onClick={() => removeExpenseBudget(existing.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={cat}
                        onClick={() => { setAddingCategory(cat); setEditingId(null); setAmount('') }}
                        className="flex items-center justify-between py-1.5 w-full text-left hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
                      >
                        <span className="text-sm text-muted-foreground">{EXPENSE_LABELS[cat]}</span>
                        <Plus className="w-4 h-4 text-muted-foreground/50" />
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
