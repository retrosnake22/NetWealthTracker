import { useState, useEffect } from 'react'
import { Target, Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { FinancialGoal, GoalType } from '@/types/models'
import { GOAL_TYPE_LABELS, GOAL_TYPE_DESCRIPTIONS } from '@/lib/calculations'
import { formatCurrency } from '@/lib/format'

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_TYPES: GoalType[] = [
  'net_worth',
  'debt_reduction',
  'savings_target',
  'positive_cashflow',
  'custom',
]

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalDialogProps {
  open: boolean
  onClose: () => void
  editGoal?: FinancialGoal | null
}

interface FormState {
  name: string
  type: GoalType
  targetValue: string
  targetDate: string
  customCurrentValue: string
  color: string
  linkedLiabilityIds: string[]
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'net_worth',
  targetValue: '',
  targetDate: '',
  customCurrentValue: '',
  color: COLOR_PRESETS[0],
  linkedLiabilityIds: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a stored ISO date string or YYYY-MM-DD to a <input type="date"> value (YYYY-MM-DD). */
function isoToDateInput(iso?: string): string {
  if (!iso) return ''
  // Already YYYY-MM-DD — slice ensures no time component
  return iso.slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoalDialog({ open, onClose, editGoal }: GoalDialogProps) {
  const { addGoal, updateGoal, removeGoal, liabilities } = useFinanceStore()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditing = Boolean(editGoal)

  // Sync form when dialog opens or editGoal changes
  useEffect(() => {
    if (open) {
      if (editGoal) {
        setForm({
          name: editGoal.name,
          type: editGoal.type,
          targetValue:
            editGoal.type === 'positive_cashflow'
              ? String(editGoal.targetValue)
              : editGoal.targetValue === 0
              ? ''
              : String(editGoal.targetValue),
          targetDate: isoToDateInput(editGoal.targetDate),
          customCurrentValue:
            editGoal.customCurrentValue !== undefined
              ? String(editGoal.customCurrentValue)
              : '',
          color: editGoal.color ?? COLOR_PRESETS[0],
          linkedLiabilityIds: editGoal.linkedLiabilityIds ?? [],
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setShowDeleteConfirm(false)
    }
  }, [open, editGoal])

  // ── Derived state ────────────────────────────────────────────────────────────

  const isPositiveCashflow = form.type === 'positive_cashflow'
  const isCustom = form.type === 'custom'

  // For positive_cashflow the target is always 0 (break-even or above)
  const effectiveTargetValue = isPositiveCashflow
    ? 0
    : parseFloat(form.targetValue) || 0

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleTypeChange(type: GoalType) {
    setForm(prev => ({
      ...prev,
      type,
      // Clear current-value when switching away from custom
      customCurrentValue: type === 'custom' ? prev.customCurrentValue : '',
      // For positive cashflow, clear any user-entered target value
      targetValue: type === 'positive_cashflow' ? '0' : prev.targetValue,
      // Clear linked liabilities when switching away from debt_reduction
      linkedLiabilityIds: type === 'debt_reduction' ? prev.linkedLiabilityIds : [],
    }))
  }

  function handleSave() {
    if (!form.name.trim()) return

    const goalData: Partial<FinancialGoal> = {
      name: form.name.trim(),
      type: form.type,
      targetValue: effectiveTargetValue,
      targetDate: form.targetDate ? form.targetDate : undefined,
      color: form.color,
      customCurrentValue:
        isCustom && form.customCurrentValue !== ''
          ? parseFloat(form.customCurrentValue) || 0
          : undefined,
      linkedLiabilityIds:
        form.type === 'debt_reduction' && form.linkedLiabilityIds.length > 0
          ? form.linkedLiabilityIds
          : undefined,
    }

    if (isEditing && editGoal) {
      updateGoal(editGoal.id, goalData)
    } else {
      addGoal(goalData)
    }

    onClose()
  }

  function handleDelete() {
    if (!editGoal) return
    removeGoal(editGoal.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            {isEditing ? 'Edit Goal' : 'Add Financial Goal'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your financial goal details below.'
              : 'Set a financial goal and track your progress toward it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Goal Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Goal Name
            </Label>
            <Input
              id="goal-name"
              placeholder="e.g. Reach $1M net worth"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="rounded-lg"
            />
          </div>

          {/* Goal Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Goal Type
            </Label>
            <Select value={form.type} onValueChange={v => handleTypeChange(v as GoalType)}>
              <SelectTrigger id="goal-type" className="rounded-lg">
                <SelectValue placeholder="Select a goal type" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {GOAL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Goal type description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {GOAL_TYPE_DESCRIPTIONS[form.type]}
            </p>
          </div>

          {/* Target Value — hidden for positive_cashflow (auto-set to 0) */}
          {isPositiveCashflow ? (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Target automatically set to <span className="font-semibold">$0/mo (break-even)</span>
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
                This goal tracks whether your monthly income exceeds your monthly expenses. No target value entry is required.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-target" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {form.type === 'debt_reduction' ? 'Target Debt Amount' : 'Target Amount'}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 text-sm">
                  $
                </span>
                <Input
                  id="goal-target"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder={form.type === 'debt_reduction' ? '0' : '100000'}
                  value={form.targetValue}
                  onChange={e => setForm(prev => ({ ...prev, targetValue: e.target.value }))}
                  className="rounded-lg pl-7"
                />
              </div>
              {form.type === 'debt_reduction' && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the total debt balance you want to reach (e.g. $0 to eliminate all debt).
                </p>
              )}
            </div>
          )}

          {/* Liability Picker — only for 'debt_reduction' type */}
          {form.type === 'debt_reduction' && liabilities.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Track Specific Debts{' '}
                <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </Label>
              <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                {liabilities.map((liability) => {
                  const isSelected = form.linkedLiabilityIds.includes(liability.id)
                  return (
                    <button
                      key={liability.id}
                      type="button"
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          linkedLiabilityIds: isSelected
                            ? prev.linkedLiabilityIds.filter(id => id !== liability.id)
                            : [...prev.linkedLiabilityIds, liability.id],
                        }))
                      }
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors border-b last:border-b-0 border-slate-100 dark:border-white/5 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`truncate ${isSelected ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                          {liability.name}
                        </span>
                      </div>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {formatCurrency(liability.currentBalance)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.linkedLiabilityIds.length === 0
                  ? 'No debts selected — goal will track all liabilities combined.'
                  : `Tracking ${form.linkedLiabilityIds.length} of ${liabilities.length} debts.`}
              </p>
            </div>
          )}

          {/* Custom Current Value — only for 'custom' type */}
          {isCustom && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-current" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Current Value <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500 text-sm">
                  $
                </span>
                <Input
                  id="goal-current"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.customCurrentValue}
                  onChange={e => setForm(prev => ({ ...prev, customCurrentValue: e.target.value }))}
                  className="rounded-lg pl-7"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manually set where you are today. You can update this over time to track progress.
              </p>
            </div>
          )}

          {/* Target Date (optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Target Date <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="goal-date"
              type="date"
              value={form.targetDate}
              onChange={e => setForm(prev => ({ ...prev, targetDate: e.target.value }))}
              className="rounded-lg"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set a deadline to display a target date on your goal card.
            </p>
          </div>

          {/* Color Picker */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Colour
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select colour ${color}`}
                  onClick={() => setForm(prev => ({ ...prev, color }))}
                  className="h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{
                    backgroundColor: color,
                    boxShadow:
                      form.color === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : undefined,
                    transform: form.color === color ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Delete confirmation inline banner */}
          {showDeleteConfirm && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Delete this goal?
                </p>
              </div>
              <p className="text-xs text-red-600/80 dark:text-red-400/70">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-0.5">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="h-8 text-xs"
                >
                  Yes, Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-2">
          {/* Delete button — only when editing */}
          {isEditing && !showDeleteConfirm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="mr-auto text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false)
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.name.trim() || (!isPositiveCashflow && form.targetValue === '')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isEditing ? 'Save Changes' : 'Add Goal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
