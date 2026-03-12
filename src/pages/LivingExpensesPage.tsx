import { useState, useMemo, useCallback, useEffect } from 'react'
import { Check, RotateCcw, Plus, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import { ExpenseActualsView } from '@/components/ExpenseActualsView'
import type { ExpenseCategory } from '@/types/models'

// ─── Category definitions ───

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  security: 'Security', home_improvements: 'Home Improvements / Renovations',
  repairs_maintenance: 'Repairs & Maintenance', gardening: 'Gardening',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  insurance_other: 'Other Insurance',
  utilities: 'Utilities', groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  medical: 'Medical', pharmacy: 'Pharmacy', pet_expenses: 'Pet Costs', school_costs: 'School Costs',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', accounting_fees: 'Accounting Fees',
  other: 'Other',
}

// Living expense categories grouped (excludes property-linked ones)
const LIVING_SUPER_CATEGORIES: { label: string; icon: string; color: string; categories: ExpenseCategory[] }[] = [
  { label: 'Housing', icon: '🏡', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', categories: ['rent', 'utilities', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'insurance_other'] },
  { label: 'Living', icon: '🛒', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
  { label: 'Lifestyle', icon: '✨', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', categories: ['hecs_repayment', 'tax', 'accounting_fees', 'other'] },
]

export function LivingExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget } = useFinanceStore()

  // Custom expense dialog state
  const [showCustomExpense, setShowCustomExpense] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<string>('other')
  const [customAmount, setCustomAmount] = useState('')

  // Build a map from category → existing budget entry (excluding auto-generated vehicle expenses)
  const budgetByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, { id: string; monthlyBudget: number; label: string }>()
    for (const b of expenseBudgets) {
      // Skip property-linked budgets
      if (b.linkedPropertyId) continue
      // Skip asset-linked budgets and auto-generated vehicle expenses
      if (b.linkedAssetId) continue
      if (b.label.endsWith('Car Loan Repayment') || b.label.endsWith('Lease Payment')) continue
      // If multiple entries for same category, keep the first (shouldn't happen but be safe)
      if (!map.has(b.category)) {
        map.set(b.category, { id: b.id, monthlyBudget: b.monthlyBudget, label: b.label })
      }
    }
    return map
  }, [expenseBudgets])

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

    // Include custom budgets in totals
    const customTotal = customBudgets.reduce((s, b) => s + b.monthlyBudget, 0)
    total += customTotal
    filledCount += customBudgets.length
    totalCategories += customBudgets.length

    return { total, filledCount, totalCategories }
  }, [editValues, customBudgets])

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

  // Custom budgets: items whose label doesn't match any standard CATEGORY_LABELS value
  const customBudgets = useMemo(() => {
    const standardLabels = new Set(Object.values(CATEGORY_LABELS))
    return expenseBudgets.filter(b =>
      !b.linkedPropertyId && !b.linkedAssetId &&
      !b.label.endsWith('Car Loan Repayment') && !b.label.endsWith('Lease Payment') &&
      !standardLabels.has(b.label)
    )
  }, [expenseBudgets])

  const handleAddCustomExpense = useCallback(() => {
    if (!customName || !customAmount) return
    addExpenseBudget({
      category: customCategory as ExpenseCategory,
      label: customName,
      monthlyBudget: parseFloat(customAmount) || 0,
    })
    setCustomName('')
    setCustomCategory('other')
    setCustomAmount('')
    setShowCustomExpense(false)
    setHasChanges(true)
  }, [customName, customAmount, customCategory, addExpenseBudget])

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
          {/* Add Custom Expense button */}
          <div className="flex items-center justify-end gap-2">
            {!showCustomExpense ? (
              <Button size="sm" variant="outline" onClick={() => setShowCustomExpense(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Custom Expense
              </Button>
            ) : (
              <Card className="w-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Add Custom Expense</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCustomExpense(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expense Name</Label>
                      <Input
                        placeholder="e.g. Dog Walker"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select value={customCategory} onValueChange={setCustomCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LIVING_SUPER_CATEGORIES.map(group => (
                            <SelectItem key={group.label} value={group.categories[0]}>
                              {group.icon} {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Monthly Amount</Label>
                      <CurrencyInput
                        value={customAmount}
                        onChange={v => setCustomAmount(v)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAddCustomExpense} disabled={!customName || !customAmount}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Expense
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

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
            {groupSummaries.map(group => (
              <Card key={group.label}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
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
                  </div>

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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Expenses */}
          {customBudgets.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📌</span>
                        <span className="font-semibold">Custom Expenses</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {customBudgets.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrency(customBudgets.reduce((s, b) => s + b.monthlyBudget, 0))}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/50">
                  {customBudgets.map((b, idx) => (
                    <div
                      key={b.id}
                      className={`grid grid-cols-[1fr_160px_40px] sm:grid-cols-[1fr_180px_40px] items-center px-5 py-2.5 gap-2 pl-12 hover:bg-muted/30 transition-colors ${
                        idx !== customBudgets.length - 1 ? 'border-b border-border/20' : ''
                      }`}
                    >
                      <span className="text-sm font-medium truncate">{b.label}</span>
                      <span className="text-sm tabular-nums text-right">{formatCurrency(b.monthlyBudget)}/mo</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeExpenseBudget(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
