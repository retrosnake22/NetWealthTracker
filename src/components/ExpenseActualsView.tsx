import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Check, RotateCcw, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory } from '@/types/models'

// Match the same labels used in LivingExpensesPage
const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  security: 'Security', home_improvements: 'Home Improvements / Renovations',
  repairs_maintenance: 'Repairs & Maintenance', gardening: 'Gardening', home_insurance: 'Home Insurance',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_pet: 'Pet Insurance', insurance_health: 'Health Insurance',
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

// Same super-categories as the budget editor (LivingExpensesPage)
const SUPER_CATEGORIES: { label: string; icon: string; categories: ExpenseCategory[] }[] = [
  { label: 'Housing', icon: '🏡', categories: ['rent', 'electricity', 'water', 'rates', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'home_insurance', 'insurance_pet', 'insurance_other'] },
  { label: 'Living', icon: '🛒', categories: ['groceries', 'household_goods', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
  { label: 'Lifestyle', icon: '✨', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', categories: ['hecs_repayment', 'tax', 'accounting_fees', 'other'] },
]

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1 + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function ExpenseActualsView() {
  const { expenseBudgets, expenseActuals, bulkUpsertExpenseActuals, userProfile, setHideEmptyActuals } = useFinanceStore()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editValuesRef = useRef(editValues)
  editValuesRef.current = editValues
  const hideEmpty = userProfile?.hideEmptyActuals ?? false

  // Only show manual living expenses (not property-linked auto expenses)
  const livingBudgets = useMemo(() =>
    expenseBudgets.filter(b => !b.linkedPropertyId),
    [expenseBudgets]
  )

  // Build lookup: category → budget entry
  const budgetByCategory = useMemo(() => {
    const map = new Map<string, { id: string; monthlyBudget: number; label: string }>()
    for (const b of livingBudgets) {
      if (b.linkedAssetId) continue
      if (b.label.endsWith('Car Loan Repayment') || b.label.endsWith('Lease Payment')) continue
      if (!map.has(b.category)) {
        map.set(b.category, { id: b.id, monthlyBudget: b.monthlyBudget, label: b.label })
      }
    }
    return map
  }, [livingBudgets])

  // Custom budgets: items whose label doesn't match standard CATEGORY_LABELS
  const customBudgets = useMemo(() => {
    const standardLabels = new Set(Object.values(CATEGORY_LABELS))
    return livingBudgets.filter(b =>
      !b.linkedPropertyId && !b.linkedAssetId &&
      !b.label.endsWith('Car Loan Repayment') && !b.label.endsWith('Lease Payment') &&
      !standardLabels.has(b.label)
    )
  }, [livingBudgets])

  // Group custom budgets by their parent super-category
  const customBySuperCategory = useMemo(() => {
    const map: Record<string, typeof customBudgets> = {}
    const catToSuper: Record<string, string> = {}
    for (const g of SUPER_CATEGORIES) {
      for (const c of g.categories) catToSuper[c] = g.label
    }
    for (const b of customBudgets) {
      const superCat = catToSuper[b.category] || 'Financial'
      if (!map[superCat]) map[superCat] = []
      map[superCat].push(b)
    }
    return map
  }, [customBudgets])

  // Get actuals for selected month
  const monthActuals = useMemo(() => {
    const map = new Map<string, { actualAmount: number; notes?: string; id: string }>()
    for (const a of expenseActuals) {
      if (a.month === selectedMonth) {
        map.set(a.budgetId, { actualAmount: a.actualAmount, notes: a.notes, id: a.id })
      }
    }
    return map
  }, [expenseActuals, selectedMonth])

  // Initialize edit values from saved actuals — use budgetId as key for standard, budget.id for custom
  useEffect(() => {
    const values: Record<string, string> = {}
    // Standard categories: key by category name
    for (const group of SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const budget = budgetByCategory.get(cat)
        if (budget) {
          const actual = monthActuals.get(budget.id)
          values[cat] = actual ? String(actual.actualAmount) : ''
        } else {
          values[cat] = ''
        }
      }
    }
    // Custom budgets: key by budget id
    for (const b of customBudgets) {
      const actual = monthActuals.get(b.id)
      values[`custom_${b.id}`] = actual ? String(actual.actualAmount) : ''
    }
    setEditValues(values)
    setHasChanges(false)
  }, [budgetByCategory, customBudgets, monthActuals, selectedMonth])

  // Perform the actual save using the latest editValues ref
  const doSave = useCallback(() => {
    const currentValues = editValuesRef.current
    const entries: { budgetId: string; category?: string; actualAmount: number }[] = []
    const store = useFinanceStore.getState()
    for (const group of SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        let budget = budgetByCategory.get(cat)
        const actualVal = parseFloat(currentValues[cat] || '0') || 0
        if (!budget && actualVal > 0) {
          const label = CATEGORY_LABELS[cat] || cat
          store.addExpenseBudget({ category: cat, label, monthlyBudget: 0 })
          const newBudgets = useFinanceStore.getState().expenseBudgets
          const newBudget = newBudgets.find(b => b.category === cat && !b.linkedPropertyId && !b.linkedAssetId)
          if (newBudget) budget = { id: newBudget.id, monthlyBudget: 0, label }
        }
        if (budget) {
          entries.push({ budgetId: budget.id, category: cat, actualAmount: actualVal })
        }
      }
    }
    for (const b of customBudgets) {
      entries.push({
        budgetId: b.id,
        category: b.category,
        actualAmount: parseFloat(currentValues[`custom_${b.id}`] || '0') || 0,
      })
    }
    bulkUpsertExpenseActuals(selectedMonth, entries)
    setHasChanges(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000)
  }, [budgetByCategory, customBudgets, selectedMonth, bulkUpsertExpenseActuals])

  const handleValueChange = useCallback((key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(), 1500)
  }, [doSave])

  // Save on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [])

  // Flush pending save when month changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      doSave()
    }
  }, [selectedMonth])

  const handleReset = useCallback(() => {
    // Cancel any pending auto-save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const values: Record<string, string> = {}
    for (const group of SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const budget = budgetByCategory.get(cat)
        if (budget) {
          const actual = monthActuals.get(budget.id)
          values[cat] = actual ? String(actual.actualAmount) : ''
        } else {
          values[cat] = ''
        }
      }
    }
    for (const b of customBudgets) {
      const actual = monthActuals.get(b.id)
      values[`custom_${b.id}`] = actual ? String(actual.actualAmount) : ''
    }
    setEditValues(values)
    setHasChanges(false)
    setSaveStatus('idle')
  }, [budgetByCategory, customBudgets, monthActuals])

  // Copy budget values to actuals (quick-fill)
  const handleCopyBudget = useCallback(() => {
    const values: Record<string, string> = {}
    for (const group of SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const budget = budgetByCategory.get(cat)
        values[cat] = budget ? String(budget.monthlyBudget) : ''
      }
    }
    for (const b of customBudgets) {
      values[`custom_${b.id}`] = String(b.monthlyBudget)
    }
    setEditValues(values)
    setHasChanges(true)
    setSaveStatus('pending')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(), 1500)
  }, [budgetByCategory, customBudgets, doSave])

  // Summary calculations
  const summary = useMemo(() => {
    let totalBudget = 0
    let totalActual = 0
    let filledCount = 0
    let totalCount = 0

    for (const group of SUPER_CATEGORIES) {
      for (const cat of group.categories) {
        const budget = budgetByCategory.get(cat)
        if (budget) {
          totalBudget += budget.monthlyBudget
          totalCount++
        }
        const val = parseFloat(editValues[cat] || '0') || 0
        totalActual += val
        if (editValues[cat] && editValues[cat] !== '') filledCount++
      }
    }

    // Custom budgets
    for (const b of customBudgets) {
      totalBudget += b.monthlyBudget
      totalCount++
      const val = parseFloat(editValues[`custom_${b.id}`] || '0') || 0
      totalActual += val
      if (editValues[`custom_${b.id}`] && editValues[`custom_${b.id}`] !== '') filledCount++
    }

    const variance = totalActual - totalBudget
    const variancePct = totalBudget > 0 ? (variance / totalBudget) * 100 : 0

    return { totalBudget, totalActual, variance, variancePct, filledCount, totalCount }
  }, [budgetByCategory, customBudgets, editValues])

  const isCurrentMonth = selectedMonth === getCurrentMonth()

  return (
    <div className="space-y-4">
      {/* Month selector + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setSelectedMonth(getCurrentMonth())}
            className="text-lg font-semibold min-w-[180px] text-center hover:text-primary transition-colors"
          >
            {getMonthLabel(selectedMonth)}
            {isCurrentMonth && <span className="text-xs text-muted-foreground ml-2">(current)</span>}
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyBudget} className="text-xs">
            Copy Budget Values
          </Button>
          <Button variant={hideEmpty ? 'default' : 'outline'} size="sm" onClick={() => setHideEmptyActuals(!hideEmpty)} className="text-xs">
            {hideEmpty ? 'Show All' : 'Hide Empty'}
          </Button>
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
            </Button>
          )}
          {saveStatus === 'pending' && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auto-saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card className={summary.totalActual > 0 ? '' : 'opacity-50'}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Actual</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.totalActual)}</p>
            <p className="text-xs text-muted-foreground">{summary.filledCount}/{summary.totalCount} entered</p>
          </CardContent>
        </Card>
        <Card className={summary.totalActual > 0 ? '' : 'opacity-50'}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Variance</p>
            <div className="flex items-center gap-2">
              {summary.variance > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-400" />
              ) : summary.variance < 0 ? (
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <p className={`text-xl font-bold tabular-nums ${
                summary.variance > 0 ? 'text-red-400' : summary.variance < 0 ? 'text-emerald-400' : ''
              }`}>
                {summary.variance > 0 ? '+' : ''}{formatCurrency(summary.variance)}
              </p>
            </div>
            {summary.totalBudget > 0 && summary.totalActual > 0 && (
              <p className={`text-xs ${summary.variance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {summary.variancePct > 0 ? '+' : ''}{summary.variancePct.toFixed(1)}% vs budget
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spreadsheet grouped by super-category — show ALL categories like budget tab */}
      <div className="space-y-3">
        {SUPER_CATEGORIES.map(group => {
          // Calculate group totals
          let groupBudgetTotal = 0
          let groupActualTotal = 0
          let groupFilledCount = 0
          for (const cat of group.categories) {
            const budget = budgetByCategory.get(cat)
            if (budget) groupBudgetTotal += budget.monthlyBudget
            const val = parseFloat(editValues[cat] || '0') || 0
            groupActualTotal += val
            if (editValues[cat] && editValues[cat] !== '') groupFilledCount++
          }

          // Include custom items in this group
          const groupCustoms = customBySuperCategory[group.label] || []
          for (const b of groupCustoms) {
            groupBudgetTotal += b.monthlyBudget
            const val = parseFloat(editValues[`custom_${b.id}`] || '0') || 0
            groupActualTotal += val
            if (editValues[`custom_${b.id}`] && editValues[`custom_${b.id}`] !== '') groupFilledCount++
          }

          const groupDiff = groupActualTotal - groupBudgetTotal

          // Compute which categories are visible when hideEmpty is on
          const visibleCategories = group.categories.filter(cat => {
            if (!hideEmpty) return true
            const budget = budgetByCategory.get(cat)
            const budgetAmt = budget?.monthlyBudget ?? 0
            const actualStr = editValues[cat] || ''
            return budgetAmt > 0 || actualStr !== ''
          })

          const visibleCustoms = groupCustoms.filter(b => {
            if (!hideEmpty) return true
            const actualStr = editValues[`custom_${b.id}`] || ''
            return b.monthlyBudget > 0 || actualStr !== ''
          })

          // Hide the entire group card if no categories are visible
          if (hideEmpty && visibleCategories.length === 0 && visibleCustoms.length === 0) return null

          return (
            <Card key={group.label}>
              <CardContent className="p-0">
                {/* Group header with totals aligned to columns */}
                <div className="grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] gap-2 items-center px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>{group.icon}</span>
                    <span className="font-bold text-sm">{group.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {groupFilledCount}/{group.categories.length + groupCustoms.length}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-right">
                    {formatCurrency(groupBudgetTotal)}
                  </span>
                  <span className={`text-sm font-bold tabular-nums text-right ${groupActualTotal > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                    {groupActualTotal > 0 ? formatCurrency(groupActualTotal) : '—'}
                  </span>
                  <span className={`text-sm font-bold tabular-nums text-right ${
                    groupActualTotal === 0 ? 'text-muted-foreground/40' :
                    groupDiff > 0 ? 'text-red-400' :
                    groupDiff < 0 ? 'text-emerald-400' : 'text-muted-foreground'
                  }`}>
                    {groupActualTotal === 0 ? '—' : `${groupDiff > 0 ? '+' : ''}${formatCurrency(groupDiff)}`}
                  </span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] px-4 py-2.5 border-b border-border/40 gap-2 bg-muted/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">Expense</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 text-right">Budget</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 text-right">Actual</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 text-right">Diff</span>
                </div>

                {/* Show filtered categories */}
                {visibleCategories.map((cat, idx) => {
                  const budget = budgetByCategory.get(cat)
                  const budgetAmount = budget?.monthlyBudget ?? 0
                  const actualStr = editValues[cat] || ''
                  const actualNum = parseFloat(actualStr) || 0
                  const diff = actualStr !== '' ? actualNum - budgetAmount : null
                  const hasSavedActual = budget ? monthActuals.has(budget.id) : false
                  const hasValue = budgetAmount > 0 || actualStr !== ''

                  return (
                    <div
                      key={cat}
                      className={`grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] items-center px-4 py-2.5 gap-2 hover:bg-muted/30 transition-colors ${
                        idx !== visibleCategories.length - 1 ? 'border-b border-border/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm truncate ${hasValue ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                        {hasSavedActual && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-400 border-emerald-400/30 shrink-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <span className={`text-sm tabular-nums text-right ${budgetAmount > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                        {budgetAmount > 0 ? formatCurrency(budgetAmount) : '—'}
                      </span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={actualStr}
                          onChange={(e) => handleValueChange(cat, e.target.value)}
                          placeholder="—"
                          className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 pl-5 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <span className={`text-sm tabular-nums text-right ${
                        diff === null ? 'text-muted-foreground/40' :
                        diff > 0 ? 'text-red-400' :
                        diff < 0 ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {diff === null ? '—' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                      </span>
                    </div>
                  )
                })}

                {/* Custom items in this group */}
                {(customBySuperCategory[group.label] || []).filter(b => {
                  if (!hideEmpty) return true
                  const actualStr = editValues[`custom_${b.id}`] || ''
                  return b.monthlyBudget > 0 || actualStr !== ''
                }).map((b, idx, arr) => {
                  const key = `custom_${b.id}`
                  const actualStr = editValues[key] || ''
                  const actualNum = parseFloat(actualStr) || 0
                  const diff = actualStr !== '' ? actualNum - b.monthlyBudget : null
                  const hasSavedActual = monthActuals.has(b.id)

                  return (
                    <div
                      key={b.id}
                      className={`grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] items-center px-4 py-2.5 gap-2 hover:bg-muted/30 transition-colors ${
                        idx !== arr.length - 1 ? 'border-b border-border/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-400 font-medium uppercase tracking-wider">Custom</span>
                        <span className="text-sm font-semibold truncate">{b.label}</span>
                        {hasSavedActual && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-400 border-emerald-400/30 shrink-0">✓</Badge>
                        )}
                      </div>
                      <span className="text-sm tabular-nums text-right">{formatCurrency(b.monthlyBudget)}</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={actualStr}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          placeholder="—"
                          className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 pl-5 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <span className={`text-sm tabular-nums text-right ${
                        diff === null ? 'text-muted-foreground/40' :
                        diff > 0 ? 'text-red-400' :
                        diff < 0 ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {diff === null ? '—' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Floating auto-save status indicator */}
      {saveStatus === 'pending' && (
        <div className="sticky bottom-4 flex justify-center pointer-events-none">
          <div className="bg-card/90 backdrop-blur border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Auto-saving…</span>
          </div>
        </div>
      )}
    </div>
  )
}
