import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Check, RotateCcw, Plus, X, Trash2, Calculator, ClipboardList, Loader2 } from 'lucide-react'
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
  repairs_maintenance: 'Repairs & Maintenance', gardening: 'Gardening', home_insurance: 'Home Insurance', insurance_pet: 'Pet Insurance',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  insurance_other: 'Other Insurance',
  electricity: 'Electricity', water: 'Water', rates: 'Rates',
  groceries: 'Groceries', household_goods: 'Household Goods', transport: 'Transport', fuel: 'Fuel',
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
  { label: 'Housing', icon: '🏡', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', categories: ['rent', 'electricity', 'water', 'rates', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'home_insurance', 'insurance_pet', 'insurance_other'] },
  { label: 'Living', icon: '🛒', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', categories: ['groceries', 'household_goods', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
  { label: 'Lifestyle', icon: '✨', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', categories: ['hecs_repayment', 'tax', 'accounting_fees', 'other'] },
]

// ─── Section color maps ───

const SECTION_BORDER_COLORS: Record<string, string> = {
  'Housing': 'border-l-cyan-500',
  'Insurance': 'border-l-violet-500',
  'Living': 'border-l-teal-500',
  'Lifestyle': 'border-l-pink-500',
  'Financial': 'border-l-amber-500',
}

const SECTION_TOTAL_COLORS: Record<string, string> = {
  'Housing': 'text-cyan-600 dark:text-cyan-400',
  'Insurance': 'text-violet-600 dark:text-violet-400',
  'Living': 'text-teal-600 dark:text-teal-400',
  'Lifestyle': 'text-pink-600 dark:text-pink-400',
  'Financial': 'text-amber-600 dark:text-amber-400',
}

const SECTION_BADGE_COLORS: Record<string, string> = {
  'Housing': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-400',
  'Insurance': 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-400',
  'Living': 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-400',
  'Lifestyle': 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-400',
  'Financial': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
}

export function LivingExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget, userProfile, setBudgetMode, setEstimatedMonthlyExpenses, setExpenseCalcSource } = useFinanceStore()
  const budgetMode = userProfile?.budgetMode ?? 'estimate'
  const estimatedMonthlyExpenses = userProfile?.estimatedMonthlyExpenses ?? 0
  const expenseCalcSource = userProfile?.expenseCalcSource ?? 'budget'

  // Custom expense dialog state
  const [showCustomExpense, setShowCustomExpense] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<string>('Financial')
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
  const [initialized, setInitialized] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editValuesRef = useRef(editValues)
  editValuesRef.current = editValues

  // Track custom expense edit values
  const [customEditValues, setCustomEditValues] = useState<Record<string, string>>({})

  // Initialize edit values from existing budgets — only on first load or after save/reset
  useEffect(() => {
    if (initialized && hasChanges) return // Don't overwrite user's unsaved typing
    const values: Record<string, string> = {}
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const existing = budgetByCategory.get(cat)
        values[cat] = existing && existing.monthlyBudget > 0 ? String(existing.monthlyBudget) : ''
      }
    }
    setEditValues(values)
    setHasChanges(false)
    setInitialized(true)
  }, [budgetByCategory])

  // Persist current edit values to the store
  // IMPORTANT: We never delete budget entries — we set them to $0 instead.
  // Actuals are linked via budgetId, so deleting a budget would orphan its actuals.
  const persistToStore = useCallback(() => {
    const currentValues = editValuesRef.current
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const rawValue = currentValues[cat] || ''
        const numValue = parseFloat(rawValue) || 0
        const existing = budgetByCategory.get(cat)

        if (existing) {
          if (existing.monthlyBudget !== numValue) {
            updateExpenseBudget(existing.id, { monthlyBudget: numValue })
          }
        } else if (numValue > 0) {
          addExpenseBudget({
            category: cat,
            label: CATEGORY_LABELS[cat],
            monthlyBudget: numValue,
          })
        }
      }
    }
    setHasChanges(false)
    setSaveStatus('saved')
    // Clear "saved" indicator after 2 seconds
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [budgetByCategory, addExpenseBudget, updateExpenseBudget, removeExpenseBudget])

  const handleValueChange = useCallback((category: string, value: string) => {
    setEditValues(prev => ({ ...prev, [category]: value }))
    setHasChanges(true)
    setSaveStatus('saving')

    // Debounce: auto-save 1.5s after last keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persistToStore()
    }, 1500)
  }, [persistToStore])

  // Save immediately on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        // Persist any unsaved changes before leaving
        persistToStore()
      }
    }
  }, [persistToStore])

  // Custom budgets: items whose label doesn't match any standard CATEGORY_LABELS value
  const customBudgets = useMemo(() => {
    const standardLabels = new Set(Object.values(CATEGORY_LABELS))
    return expenseBudgets.filter(b =>
      !b.linkedPropertyId && !b.linkedAssetId &&
      !b.label.endsWith('Car Loan Repayment') && !b.label.endsWith('Lease Payment') &&
      !standardLabels.has(b.label)
    )
  }, [expenseBudgets])

  const handleReset = useCallback(() => {
    // Cancel any pending auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const values: Record<string, string> = {}
    for (const group of LIVING_SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const existing = budgetByCategory.get(cat)
        values[cat] = existing && existing.monthlyBudget > 0 ? String(existing.monthlyBudget) : ''
      }
    }
    setEditValues(values)
    // Also reset custom edit values from store
    const customVals: Record<string, string> = {}
    for (const b of customBudgets) {
      customVals[b.id] = b.monthlyBudget > 0 ? String(b.monthlyBudget) : ''
    }
    setCustomEditValues(customVals)
    setHasChanges(false)
    setSaveStatus('idle')
  }, [budgetByCategory, customBudgets])

  // Group custom budgets by their parent super-category
  const customBySuperCategory = useMemo(() => {
    const map: Record<string, typeof customBudgets> = {}
    // Build reverse lookup: subcategory -> super-category label
    const catToSuper: Record<string, string> = {}
    for (const g of LIVING_SUPER_CATEGORIES) {
      for (const c of g.categories) catToSuper[c] = g.label
    }
    for (const b of customBudgets) {
      const superCat = catToSuper[b.category] || 'Financial'
      if (!map[superCat]) map[superCat] = []
      map[superCat].push(b)
    }
    return map
  }, [customBudgets])

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

    // Include custom budgets in totals (use live edit values where available)
    const customTotal = customBudgets.reduce((s, b) => {
      const editVal = customEditValues[b.id]
      return s + (editVal !== undefined ? (parseFloat(editVal) || 0) : b.monthlyBudget)
    }, 0)
    total += customTotal
    filledCount += customBudgets.length
    totalCategories += customBudgets.length

    return { total, filledCount, totalCategories }
  }, [editValues, customBudgets, customEditValues])

  // Group-level totals (including custom items in each group)
  const groupSummaries = useMemo(() => {
    return LIVING_SUPER_CATEGORIES.map(group => {
      let groupTotal = 0
      let filledCount = 0
      let customCount = 0
      for (const cat of group.categories) {
        const val = parseFloat(editValues[cat] || '0') || 0
        groupTotal += val
        if (val > 0) filledCount++
      }
      // Add custom items that belong to this super-category
      const customs = customBySuperCategory[group.label] || []
      for (const c of customs) {
        const editVal = customEditValues[c.id]
        groupTotal += editVal !== undefined ? (parseFloat(editVal) || 0) : c.monthlyBudget
        customCount++
      }
      return { ...group, groupTotal, filledCount, customCount }
    })
  }, [editValues, customBySuperCategory, customEditValues])

  const handleAddCustomExpense = useCallback(() => {
    if (!customName || !customAmount) return
    // Resolve super-category label to a representative subcategory
    const group = LIVING_SUPER_CATEGORIES.find(g => g.label === customCategory)
    const resolvedCategory = group ? group.categories[0] : 'other'
    addExpenseBudget({
      category: resolvedCategory as ExpenseCategory,
      label: customName,
      monthlyBudget: parseFloat(customAmount) || 0,
    })
    setCustomName('')
    setCustomCategory('Financial')
    setCustomAmount('')
    setShowCustomExpense(false)
    setHasChanges(true)
  }, [customName, customAmount, customCategory, addExpenseBudget])

  // Initialize customEditValues whenever customBudgets changes
  useEffect(() => {
    const vals: Record<string, string> = {}
    for (const b of customBudgets) {
      vals[b.id] = b.monthlyBudget > 0 ? String(b.monthlyBudget) : ''
    }
    setCustomEditValues(vals)
  }, [customBudgets])

  const handleCustomValueChange = useCallback((budgetId: string, value: string) => {
    setCustomEditValues(prev => ({ ...prev, [budgetId]: value }))
    setHasChanges(true)
    setSaveStatus('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const numValue = parseFloat(value) || 0
      updateExpenseBudget(budgetId, { monthlyBudget: numValue })
      // Also persist other standard values
      persistToStore()
    }, 1500)
  }, [updateExpenseBudget, persistToStore])

  const handleSetBudgetMode = useCallback((mode: 'estimate' | 'detailed') => {
    setBudgetMode(mode)
  }, [setBudgetMode])

  return (
    <div className="space-y-6">
      {/* Page hero title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Living Expenses</h1>
        <p className="text-muted-foreground mt-1.5 text-sm sm:text-base max-w-2xl">
          {budgetMode === 'detailed'
            ? 'Your detailed budget is active. Update your spending categories below and use the Actuals tab each month to track real spending against your budget.'
            : 'You\'re currently using a monthly estimate for your expenses. Switch to a detailed budget to break down spending by category and track actuals each month.'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="rounded-xl border-2 border-primary/20 dark:border-white/10 bg-gradient-to-r from-primary/5 to-transparent dark:from-white/[0.04] dark:to-transparent shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Tracking mode:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={budgetMode === 'estimate' ? 'default' : 'outline'}
              onClick={() => handleSetBudgetMode('estimate')}
              className="gap-1.5"
            >
              <Calculator className="h-3.5 w-3.5" />
              Monthly Estimate
              {budgetMode === 'estimate' && estimatedMonthlyExpenses > 0 && (
                <span className="ml-1 opacity-80">({formatCurrency(estimatedMonthlyExpenses)})</span>
              )}
            </Button>
            <Button
              size="sm"
              variant={budgetMode === 'detailed' ? 'default' : 'outline'}
              onClick={() => handleSetBudgetMode('detailed')}
              className="gap-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Detailed Budget
              {budgetMode === 'detailed' && summary.total > 0 && (
                <span className="ml-1 opacity-80">({formatCurrency(summary.total)})</span>
              )}
            </Button>
          </div>
        </div>
        {budgetMode === 'estimate' && (
          <div className="mt-3 pl-0 sm:pl-[108px] flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-muted-foreground">Monthly estimate used in calculations:</span>
            <div className="w-48">
              <CurrencyInput
                value={String(estimatedMonthlyExpenses || '')}
                onValueChange={(v) => { const n = parseFloat(v); setEstimatedMonthlyExpenses(isNaN(n) ? 0 : n) }}
                placeholder="Enter estimate"
              />
            </div>
            <span className="text-xs text-muted-foreground">({formatCurrency((estimatedMonthlyExpenses || 0) * 12)}/year)</span>
          </div>
        )}
        {budgetMode === 'detailed' && (
          <div className="mt-3 pl-0 sm:pl-[108px] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Use in calculations:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={expenseCalcSource === 'budget' ? 'default' : 'outline'}
                  onClick={() => setExpenseCalcSource('budget')}
                  className="gap-1.5 h-7 text-xs"
                >
                  Budget Amount
                </Button>
                <Button
                  size="sm"
                  variant={expenseCalcSource === 'actuals' ? 'default' : 'outline'}
                  onClick={() => setExpenseCalcSource('actuals')}
                  className="gap-1.5 h-7 text-xs"
                >
                  Actuals
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseCalcSource === 'budget'
                ? <>Using your itemised budget total of <span className="font-semibold text-foreground">{formatCurrency(summary.total)}/mo</span> in all cashflow and projection calculations.</>
                : <>Using your actual spending for the current month in all cashflow and projection calculations. Falls back to budget if no actuals are entered.</>
              }
            </p>
          </div>
        )}
      </div>

      {/* Only show detailed budget & actuals tabs when in detailed mode */}
      {budgetMode === 'detailed' && (
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
                  <Card className="w-full dark:bg-white/[0.04]">
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
                                <SelectItem key={group.label} value={group.label}>
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

              {/* Summary strip — gradient KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Monthly */}
                <div className="rounded-xl p-5 text-white bg-gradient-to-br from-rose-700 to-orange-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
                  <p className="text-sm font-medium text-white/80 dark:text-muted-foreground">Total Monthly</p>
                  <p className="text-3xl font-extrabold tabular-nums tracking-tight mt-1 dark:text-rose-400">{formatCurrency(summary.total)}</p>
                  <p className="text-xs text-white/70 dark:text-muted-foreground mt-0.5">{formatCurrency(summary.total * 12)}/year</p>
                </div>

                {/* Categories Used */}
                <div className="rounded-xl p-5 text-white bg-gradient-to-br from-amber-700 to-amber-500 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
                  <p className="text-sm font-medium text-white/80 dark:text-muted-foreground">Categories Used</p>
                  <p className="text-3xl font-extrabold tabular-nums tracking-tight mt-1 dark:text-white">{summary.filledCount}</p>
                  <p className="text-xs text-white/70 dark:text-muted-foreground mt-0.5">of {summary.totalCategories} available</p>
                </div>

                {/* Daily Equivalent */}
                <div className="rounded-xl p-5 text-white bg-gradient-to-br from-orange-700 to-orange-400 dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
                  <p className="text-sm font-medium text-white/80 dark:text-muted-foreground">Daily Equivalent</p>
                  <p className="text-3xl font-extrabold tabular-nums tracking-tight mt-1 dark:text-white">{formatCurrency(summary.total / 30.44)}</p>
                  <p className="text-xs text-white/70 dark:text-muted-foreground mt-0.5">per day average</p>
                </div>
              </div>

              {/* Auto-save status & undo */}
              <div className="flex items-center gap-3 justify-end min-h-[32px]">
                {hasChanges && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Undo Changes
                  </Button>
                )}
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Auto-saving…
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>

              {/* Inline budget editor grouped by super-category */}
              <div className="space-y-3">
                {groupSummaries.map(group => {
                  return (
                    <div
                      key={group.label}
                      className={`rounded-xl border border-border/60 dark:border-white/10 border-l-4 ${SECTION_BORDER_COLORS[group.label]} bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden`}
                    >
                      <div className="flex items-center justify-between px-3 sm:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{group.icon}</span>
                              <span className="font-semibold">{group.label}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SECTION_BADGE_COLORS[group.label]}`}>
                                {group.filledCount + group.customCount}/{group.categories.length + group.customCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-extrabold tabular-nums ${SECTION_TOTAL_COLORS[group.label]}`}>
                            {formatCurrency(group.groupTotal)}
                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(group.groupTotal * 12)}/yr</p>
                        </div>
                      </div>

                      <div className="border-t border-border/50">
                        {/* Column headers — bold and prominent */}
                        <div className="grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_180px] px-3 sm:px-5 py-2.5 border-b border-border/40 gap-2 pl-4 sm:pl-12 bg-muted/40">
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">Expense</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 text-right">Monthly Budget</span>
                        </div>

                        {group.categories.map((cat, idx) => {
                          const value = editValues[cat] || ''
                          const hasValue = parseFloat(value) > 0
                          const isLastCategory = idx === group.categories.length - 1
                          const groupCustoms = customBySuperCategory[group.label] || []
                          const showBorder = !isLastCategory || groupCustoms.length > 0

                          return (
                            <div
                              key={cat}
                              className={`grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_180px] items-center px-3 sm:px-5 py-2.5 gap-2 pl-4 sm:pl-12 transition-colors ${
                                hasValue
                                  ? 'bg-emerald-50 dark:bg-emerald-500/[0.08] hover:bg-emerald-100/80 dark:hover:bg-emerald-500/[0.12] border-l-2 border-l-emerald-500 dark:border-l-emerald-400'
                                  : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                              } ${showBorder ? 'border-b border-border/20' : ''}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-sm truncate ${hasValue ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                  {CATEGORY_LABELS[cat]}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                <div className="w-[100px] sm:w-[160px]">
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

                        {/* Custom items for this super-category — editable, at group level */}
                        {(customBySuperCategory[group.label] || []).map((b, cIdx, arr) => {
                          const customVal = customEditValues[b.id] || ''
                          const hasCustomValue = parseFloat(customVal) > 0
                          const isLast = cIdx === arr.length - 1
                          return (
                            <div
                              key={b.id}
                              className={`grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_180px] items-center px-3 sm:px-5 py-2.5 gap-2 pl-4 sm:pl-12 transition-colors ${
                                hasCustomValue
                                  ? 'bg-emerald-50 dark:bg-emerald-500/[0.08] hover:bg-emerald-100/80 dark:hover:bg-emerald-500/[0.12] border-l-2 border-l-emerald-500 dark:border-l-emerald-400'
                                  : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                              } ${!isLast ? 'border-b border-border/20' : ''}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 font-medium uppercase tracking-wider">Custom</span>
                                <span className="text-sm font-semibold truncate">{b.label}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive hover:text-destructive" onClick={() => removeExpenseBudget(b.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex justify-end">
                                <div className="w-[100px] sm:w-[160px]">
                                  <CurrencyInput
                                    value={customVal}
                                    onChange={(v) => handleCustomValueChange(b.id, v)}
                                    placeholder="—"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Auto-save status indicator (sticky) */}
              {saveStatus === 'saving' && (
                <div className="sticky bottom-4 flex justify-center pointer-events-none">
                  <div className="bg-card dark:bg-slate-800 border border-border dark:border-white/10 shadow-lg rounded-full px-5 py-2.5 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Auto-saving…</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
