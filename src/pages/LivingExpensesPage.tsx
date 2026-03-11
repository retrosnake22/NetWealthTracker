import { useState, useMemo, useCallback, useEffect } from 'react'
import { Check, RotateCcw, ChevronDown, ChevronRight, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import { ExpenseActualsView } from '@/components/ExpenseActualsView'
import type { ExpenseCategory } from '@/types/models'

// ─── Category definitions ───

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  utilities: 'Utilities', groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', pet_expenses: 'Pet Expenses', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', other: 'Other',
}

// Living expense categories grouped (excludes property-linked ones)
const LIVING_SUPER_CATEGORIES: { label: string; icon: string; color: string; categories: ExpenseCategory[] }[] = [
  { label: 'Housing', icon: '🏡', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', categories: ['rent', 'utilities'] },
  { label: 'Insurance', icon: '🛡️', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', categories: ['insurance_health', 'insurance_car', 'insurance_life'] },
  { label: 'Living', icon: '🛒', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing'] },
  { label: 'Lifestyle', icon: '✨', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'pet_expenses', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', categories: ['hecs_repayment', 'tax', 'other'] },
]

export function LivingExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget } = useFinanceStore()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Separate auto-generated vehicle expenses from manual budget entries
  const autoVehicleExpenses = useMemo(() => {
    return expenseBudgets.filter(b =>
      b.linkedAssetId ||
      b.label.endsWith('Car Loan Repayment') ||
      b.label.endsWith('Lease Payment')
    )
  }, [expenseBudgets])

  const autoVehicleTotal = useMemo(() =>
    autoVehicleExpenses.reduce((s, b) => s + b.monthlyBudget, 0),
    [autoVehicleExpenses]
  )

  // IDs of auto-generated expenses to exclude from manual budget editor
  const autoExpenseIds = useMemo(() =>
    new Set(autoVehicleExpenses.map(b => b.id)),
    [autoVehicleExpenses]
  )

  // Build a map from category → existing budget entry (excluding auto-generated ones)
  const budgetByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, { id: string; monthlyBudget: number; label: string }>()
    for (const b of expenseBudgets) {
      // Skip property-linked budgets and auto-generated vehicle expenses
      if (b.linkedPropertyId) continue
      if (autoExpenseIds.has(b.id)) continue
      // If multiple entries for same category, keep the first (shouldn't happen but be safe)
      if (!map.has(b.category)) {
        map.set(b.category, { id: b.id, monthlyBudget: b.monthlyBudget, label: b.label })
      }
    }
    return map
  }, [expenseBudgets, autoExpenseIds])

  // Track inline edit values: category → string amount
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize edit values from existing budgets
  useEffect(() => {
    const values: Record<string, string> = {}
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const existing = budgetByCategory.get(cat)
        values[cat] = existing && existing.monthlyBudget > 0 ? String(existing.monthlyBudget) : ''
      }
    }
    setEditValues(values)
    setHasChanges(false)
  }, [budgetByCategory])

  const handleValueChange = useCallback((category: string, value: string) => {
    setEditValues(prev => ({ ...prev, [category]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const rawValue = editValues[cat] || ''
        const numValue = parseFloat(rawValue) || 0
        const existing = budgetByCategory.get(cat)

        if (existing) {
          if (numValue > 0) {
            // Update existing
            if (existing.monthlyBudget !== numValue) {
              updateExpenseBudget(existing.id, { monthlyBudget: numValue })
            }
          } else {
            // Remove if zeroed out
            removeExpenseBudget(existing.id)
          }
        } else if (numValue > 0) {
          // Create new budget entry
          addExpenseBudget({
            category: cat,
            label: CATEGORY_LABELS[cat],
            monthlyBudget: numValue,
          })
        }
      }
    }
    setHasChanges(false)
  }, [editValues, budgetByCategory, addExpenseBudget, updateExpenseBudget, removeExpenseBudget])

  const handleReset = useCallback(() => {
    const values: Record<string, string> = {}
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const existing = budgetByCategory.get(cat)
        values[cat] = existing && existing.monthlyBudget > 0 ? String(existing.monthlyBudget) : ''
      }
    }
    setEditValues(values)
    setHasChanges(false)
  }, [budgetByCategory])

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // Summary
  const summary = useMemo(() => {
    let total = 0
    let filledCount = 0
    let totalCategories = 0

    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        totalCategories++
        const val = parseFloat(editValues[cat] || '0') || 0
        total += val
        if (val > 0) filledCount++
      }
    }

    // Include auto-generated vehicle expenses in the total
    total += autoVehicleTotal

    return { total, filledCount, totalCategories }
  }, [editValues, autoVehicleTotal])

  // Group-level totals
  const groupSummaries = useMemo(() => {
    return LIVING_SUPER_CATEGORIES.map(group => {
      let groupTotal = 0
      let filledCount = 0
      for (const cat of group.categories) {
        const val = parseFloat(editValues[cat] || '0') || 0
        groupTotal += val
        if (val > 0) filledCount++
      }
      return { ...group, groupTotal, filledCount }
    })
  }, [editValues])

  return (
    <Tabs defaultValue="budget" className="space-y-6">
      <TabsList className="h-10">
        <TabsTrigger value="budget" className="px-4">Budget</TabsTrigger>
        <TabsTrigger value="actuals" className="px-4">Actuals</TabsTrigger>
      </TabsList>

      <TabsContent value="actuals">
        <ExpenseActualsView />
      </TabsContent>

      <TabsContent value="budget">
        <div className="space-y-6">
          {/* Summary strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Monthly</p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-red-400">{formatCurrency(summary.total)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(summary.total * 12)}/year</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Categories Used</p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{summary.filledCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">of {summary.totalCategories} available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Daily Equivalent</p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(summary.total / 30.44)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">per day average</p>
              </CardContent>
            </Card>
          </div>

          {/* Auto-generated vehicle expenses */}
          {autoVehicleExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Vehicle Expenses</h2>
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted-foreground/30">
                  🔗 Auto-generated
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">
                These expenses are auto-generated from your vehicle financing setup. Edit them in Assets → Vehicles.
              </p>
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-0">
                  {autoVehicleExpenses.map((expense, idx) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between px-5 py-3.5 ${
                        idx !== autoVehicleExpenses.length - 1 ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{expense.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.label.includes('Lease') ? 'Lease' : 'Car Loan'} · Transport
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(expense.monthlyBudget)}</span>
                        <span className="text-xs text-muted-foreground ml-1">/mo</span>
                      </div>
                    </div>
                  ))}
                  {autoVehicleExpenses.length > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
                      <span className="text-sm font-medium text-muted-foreground">Total Vehicle Expenses</span>
                      <div>
                        <span className="text-sm font-bold tabular-nums">{formatCurrency(autoVehicleTotal)}</span>
                        <span className="text-xs text-muted-foreground ml-1">/mo</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save/Reset actions */}
          {hasChanges && (
            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Undo Changes
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Save Budget
              </Button>
            </div>
          )}

          {/* Inline budget editor grouped by super-category */}
          <div className="space-y-3">
            {groupSummaries.map(group => {
              const collapsed = collapsedGroups.has(group.label)
              return (
                <Card key={group.label}>
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {collapsed
                          ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{group.icon}</span>
                            <span className="font-semibold">{group.label}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              {group.filledCount}/{group.categories.length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">
                          {formatCurrency(group.groupTotal)}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(group.groupTotal * 12)}/yr</p>
                      </div>
                    </button>

                    {!collapsed && (
                      <div className="border-t border-border/50">
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_180px] px-5 py-2 text-xs text-muted-foreground border-b border-border/30 gap-2 pl-12">
                          <span>Category</span>
                          <span className="text-right">Monthly Budget</span>
                        </div>

                        {group.categories.map((cat, idx) => {
                          const value = editValues[cat] || ''
                          const hasValue = parseFloat(value) > 0

                          return (
                            <div
                              key={cat}
                              className={`grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_180px] items-center px-5 py-2.5 gap-2 pl-12 hover:bg-muted/30 transition-colors ${
                                idx !== group.categories.length - 1 ? 'border-b border-border/20' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm truncate ${hasValue ? 'font-medium' : 'text-muted-foreground'}`}>
                                  {CATEGORY_LABELS[cat]}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                <div className="w-[140px] sm:w-[160px]">
                                  <CurrencyInput
                                    value={value}
                                    onChange={(v) => handleValueChange(cat, v)}
                                    placeholder="—"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Sticky save bar */}
          {hasChanges && (
            <div className="sticky bottom-4 flex justify-center">
              <div className="bg-card border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Unsaved changes</span>
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" /> Save Budget
                </Button>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
