import { useMemo } from 'react'
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Pencil,
  Trophy,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { FinancialGoal } from '@/types/models'
import {
  calculateGoalProgress,
  type GoalProgress,
  calculateDashboardMetrics,
  GOAL_TYPE_LABELS,
} from '@/lib/calculations'
import { formatCurrency, formatCompact } from '@/lib/format'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GoalsWidgetProps {
  onAddGoal: () => void
  onEditGoal: (goal: FinancialGoal) => void
}

// ---------------------------------------------------------------------------
// Goal-type icon map
// ---------------------------------------------------------------------------

const GOAL_TYPE_ICONS: Record<FinancialGoal['type'], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  net_worth: TrendingUp,
  debt_reduction: TrendingDown,
  savings_target: PiggyBank,
  positive_cashflow: DollarSign,
  custom: Target,
}

// ---------------------------------------------------------------------------
// Helper: format an estimated achievement date
// ---------------------------------------------------------------------------

function formatEstimatedDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Helper: format a currency value compactly (uses formatCompact for large numbers)
// ---------------------------------------------------------------------------

function formatGoalValue(value: number): string {
  return Math.abs(value) >= 10_000 ? formatCompact(value) : formatCurrency(value)
}

// ---------------------------------------------------------------------------
// Sub-component: individual goal row
// ---------------------------------------------------------------------------

function GoalRow({
  progress,
  onEdit,
}: {
  progress: GoalProgress
  onEdit: () => void
}) {
  const { goal, currentValue, targetValue, progressPercent, isAchieved, estimatedDate, monthsRemaining } = progress

  const TypeIcon = GOAL_TYPE_ICONS[goal.type]
  const typeLabel = GOAL_TYPE_LABELS[goal.type]

  // Progress bar color — use goal.color if set, otherwise default to blue
  const barColor = goal.color ?? '#3b82f6'

  // Percentage string (0–100)
  const pctDisplay = `${Math.round(progressPercent * 100)}%`

  return (
    <div className="group relative py-4 first:pt-0 last:pb-0">
      {/* Goal header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon bubble */}
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
            style={{ backgroundColor: `${barColor}20` }}
          >
            <TypeIcon className="h-3.5 w-3.5" style={{ color: barColor }} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                {goal.name}
              </span>
              {isAchieved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Achieved!
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="shrink-0 p-1.5 rounded-md text-slate-400 sm:opacity-0 sm:group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
          aria-label={`Edit ${goal.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(Math.max(progressPercent * 100, 0), 100)}%`,
            backgroundColor: isAchieved ? '#10b981' : barColor,
          }}
        />
      </div>

      {/* Values row */}
      <div className="flex items-center justify-between gap-2">
        {/* Current / Target */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatGoalValue(currentValue)}
          </span>
          <span>/</span>
          <span className="tabular-nums">{formatGoalValue(targetValue)}</span>
        </div>

        {/* Percentage + date estimate */}
        <div className="flex items-center gap-2 shrink-0">
          {estimatedDate && !isAchieved && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {monthsRemaining !== null
                  ? `~${monthsRemaining}mo · ${formatEstimatedDate(estimatedDate)}`
                  : formatEstimatedDate(estimatedDate)}
              </span>
            </div>
          )}
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: isAchieved ? '#10b981' : barColor }}
          >
            {pctDisplay}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function GoalsWidget({ onAddGoal, onEditGoal }: GoalsWidgetProps) {
  // ----- Store data -----
  const {
    assets,
    properties,
    liabilities,
    incomes,
    expenseBudgets,
    expenseActuals,
    financialGoals,
    userProfile,
  } = useFinanceStore()

  // ----- Compute metrics (single source of truth) -----
  const metrics = useMemo(
    () =>
      calculateDashboardMetrics(
        incomes,
        expenseBudgets,
        properties,
        liabilities,
        assets,
        expenseActuals,
        userProfile?.budgetMode,
        userProfile?.estimatedMonthlyExpenses,
        userProfile?.expenseCalcSource,
      ),
    [incomes, expenseBudgets, properties, liabilities, assets, expenseActuals, userProfile],
  )

  const { monthlyCashflow } = metrics

  // Monthly surplus ≈ cashflow (the amount available to advance goals each month)
  const monthlySurplus = monthlyCashflow

  // ----- Compute progress for every goal -----
  const goalProgresses: GoalProgress[] = useMemo(
    () =>
      financialGoals.map(goal =>
        calculateGoalProgress(goal, assets, properties, liabilities, monthlyCashflow, monthlySurplus),
      ),
    [financialGoals, assets, properties, liabilities, monthlyCashflow, monthlySurplus],
  )

  // ----- Bottom accent bar: use the color of the first (highest-priority) goal -----
  const accentColor =
    financialGoals.length > 0
      ? (financialGoals[0].color ?? '#3b82f6')
      : '#3b82f6'

  // ----- Render -----
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="p-5 sm:p-6">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Financial Goals
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {financialGoals.length === 0
                  ? 'Track your milestones'
                  : `${goalProgresses.filter(p => p.isAchieved).length} of ${financialGoals.length} achieved`}
              </p>
            </div>
          </div>

          {/* Add Goal button */}
          <button
            onClick={onAddGoal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Goal
          </button>
        </div>

        {/* ---- Content ---- */}
        {financialGoals.length === 0 ? (
          /* Empty state */
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06]">
              <Trophy className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No goals yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px]">
                Add your first financial goal to start tracking progress toward your milestones.
              </p>
            </div>
            <button
              onClick={onAddGoal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first goal
            </button>
          </div>
        ) : (
          /* Goal list */
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {goalProgresses.map(progress => (
              <GoalRow
                key={progress.goal.id}
                progress={progress}
                onEdit={() => onEditGoal(progress.goal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Bottom accent bar ---- */}
      {financialGoals.length === 0 ? (
        <div className="h-1 w-full bg-slate-200 dark:bg-white/10" />
      ) : (
        <div
          className="h-1 w-full transition-colors duration-500"
          style={{ backgroundColor: accentColor, opacity: 0.8 }}
        />
      )}
    </div>
  )
}
