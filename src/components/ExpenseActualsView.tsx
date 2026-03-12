import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory } from '@/types/models'

const SUPER_CATEGORIES: { label: string; icon: string; categories: ExpenseCategory[] }[] = [
  { label: 'Housing', icon: '🏡', categories: ['rent', 'electricity', 'water', 'rates', 'home_insurance', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'insurance_other'] },
  { label: 'Living', icon: '🛒', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
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
  const { expenseBudgets, expenseActuals, bulkUpsertExpenseActuals } = useFinanceStore()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Only show manual living expenses (not property-linked auto expenses)
  const livingBudgets = useMemo(() =>
    expenseBudgets.filter(b => !b.linkedPropertyId),
    [expenseBudgets]
  )

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

  // Initialize edit values from saved actuals
  useEffect(() => {
    const values: Record<string, string> = {}
    for (const budget of livingBudgets) {
      const actual = monthActuals.get(budget.id)
      values[budget.id] = actual ? String(actual.actualAmount) : ''
    }
    setEditValues(values)
    setHasChanges(false)
  }, [livingBudgets, monthActuals, selectedMonth])

  // Group budgets by super-category
  const groupedBudgets = useMemo(() => {
    return SUPER_CATEGORIES.map(group => {
      const items = livingBudgets.filter(b => group.categories.includes(b.category))
      return { ...group, items }
    }).filter(g => g.items.length > 0)
  }, [livingBudgets])

  const handleValueChange = useCallback((budgetId: string, value: string) => {
    setEditValues(prev => ({ ...prev, [budgetId]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    const entries = livingBudgets.map(b => ({
      budgetId: b.id,
      actualAmount: parseFloat(editValues[b.id] || '0') || 0,
    }))
    bulkUpsertExpenseActuals(selectedMonth, entries)
    setHasChanges(false)
  }, [livingBudgets, editValues, selectedMonth, bulkUpsertExpenseActuals])

  const handleReset = useCallback(() => {
    const values: Record<string, string> = {}
    for (const budget of livingBudgets) {
      const actual = monthActuals.get(budget.id)
      values[budget.id] = actual ? String(actual.actualAmount) : ''
    }
    setEditValues(values)
    setHasChanges(false)
  }, [livingBudgets, monthActuals])

  // Copy budget values to actuals (quick-fill)
  const handleCopyBudget = useCallback(() => {
    const values: Record<string, string> = {}
    for (const budget of livingBudgets) {
      values[budget.id] = String(budget.monthlyBudget)
    }
    setEditValues(values)
    setHasChanges(true)
  }, [livingBudgets])

  // Summary calculations
  const summary = useMemo(() => {
    let totalBudget = 0
    let totalActual = 0
    let filledCount = 0

    for (const b of livingBudgets) {
      totalBudget += b.monthlyBudget
      const val = parseFloat(editValues[b.id] || '0') || 0
      totalActual += val
      if (editValues[b.id] && editValues[b.id] !== '') filledCount++
    }

    const variance = totalActual - totalBudget
    const variancePct = totalBudget > 0 ? (variance / totalBudget) * 100 : 0

    return { totalBudget, totalActual, variance, variancePct, filledCount, totalCount: livingBudgets.length }
  }, [livingBudgets, editValues])

  const isCurrentMonth = selectedMonth === getCurrentMonth()

  if (livingBudgets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">Add budget expenses first, then track actuals against them.</p>
      </div>
    )
  }

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
          {hasChanges && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo
              </Button>
              <Button size="sm" onClick={handleSave} className="text-xs">
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </>
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

      {/* Quick-entry spreadsheet grouped by category */}
      <div className="space-y-3">
        {groupedBudgets.map(group => (
          <Card key={group.label}>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span className="font-semibold text-sm">{group.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] px-4 py-2 text-xs text-muted-foreground border-b border-border/30 gap-2">
                <span>Expense</span>
                <span className="text-right">Budget</span>
                <span className="text-right">Actual</span>
                <span className="text-right">Diff</span>
              </div>

              {/* Rows */}
              {group.items.map((item, idx) => {
                const actualStr = editValues[item.id] || ''
                const actualNum = parseFloat(actualStr) || 0
                const diff = actualStr !== '' ? actualNum - item.monthlyBudget : null
                const hasSavedActual = monthActuals.has(item.id)

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_120px_100px] items-center px-4 py-2.5 gap-2 hover:bg-muted/30 transition-colors ${
                      idx !== group.items.length - 1 ? 'border-b border-border/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{item.label}</span>
                      {hasSavedActual && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-400 border-emerald-400/30 shrink-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground tabular-nums text-right">
                      {formatCurrency(item.monthlyBudget)}
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={actualStr}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
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
        ))}
      </div>

      {/* Sticky save bar when changes exist */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="bg-card border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" /> Save Actuals
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
