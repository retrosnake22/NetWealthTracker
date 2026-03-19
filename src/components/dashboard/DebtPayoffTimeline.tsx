import { useMemo } from 'react'
import { Landmark, Clock, AlertTriangle, TrendingDown, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { Liability, Property, CashAsset } from '@/types/models'

/* ── helpers ─────────────────────────────────────────────────── */

function annualiseRepayment(amount: number, freq: 'weekly' | 'fortnightly' | 'monthly'): number {
  if (freq === 'weekly') return amount * 52
  if (freq === 'fortnightly') return amount * 26
  return amount * 12
}

function monthlyRepayment(amount: number, freq: 'weekly' | 'fortnightly' | 'monthly'): number {
  return annualiseRepayment(amount, freq) / 12
}

interface PayoffInfo {
  id: string
  name: string
  linkedProperty?: string
  balance: number
  rate: number
  monthlyPmt: number
  mortgageType: string
  isIO: boolean
  payoffMonths: number | null   // null = never (IO) or can't pay off
  payoffDate: Date | null
  totalInterest: number | null
  category: string
}

function calculatePayoff(l: Liability, properties: Property[], offsets: CashAsset[]): PayoffInfo {
  const monthly = monthlyRepayment(l.minimumRepayment, l.repaymentFrequency)
  const monthlyRate = l.interestRatePA / 12
  const isIO = l.mortgageType === 'interest_only'
  const linkedProp = l.linkedPropertyId
    ? properties.find(p => p.id === l.linkedPropertyId)?.name
    : undefined

  // Calculate effective balance after offset
  const offsetBal = (l.offsetAccountIds ?? []).reduce((sum, id) => {
    const oa = offsets.find(a => a.id === id)
    return sum + (oa?.currentValue ?? 0)
  }, 0)
  const effectiveBalance = Math.max(l.currentBalance - offsetBal, 0)

  if (isIO || monthly <= 0) {
    // Interest-only: never pays off, interest = rate × balance per year × assumed remaining term
    const annualInterest = effectiveBalance * l.interestRatePA
    const yearsLeft = l.loanTermYears ?? 30
    return {
      id: l.id,
      name: l.name,
      linkedProperty: linkedProp,
      balance: l.currentBalance,
      rate: l.interestRatePA,
      monthlyPmt: monthly,
      mortgageType: isIO ? 'Interest Only' : 'N/A',
      isIO: true,
      payoffMonths: null,
      payoffDate: null,
      totalInterest: annualInterest * yearsLeft,
      category: l.category,
    }
  }

  // Amortisation schedule to calculate months to payoff and total interest
  let balance = effectiveBalance
  let months = 0
  let totalInterest = 0
  const maxMonths = 600 // 50 years cap

  if (monthlyRate > 0) {
    while (balance > 0.01 && months < maxMonths) {
      const interest = balance * monthlyRate
      totalInterest += interest
      const principal = monthly - interest
      if (principal <= 0) {
        // Payment doesn't cover interest — will never pay off
        return {
          id: l.id,
          name: l.name,
          linkedProperty: linkedProp,
          balance: l.currentBalance,
          rate: l.interestRatePA,
          monthlyPmt: monthly,
          mortgageType: 'P&I',
          isIO: false,
          payoffMonths: null,
          payoffDate: null,
          totalInterest: null,
          category: l.category,
        }
      }
      balance -= principal
      months++
    }
  } else {
    // 0% interest
    months = Math.ceil(effectiveBalance / monthly)
    totalInterest = 0
  }

  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + months)

  return {
    id: l.id,
    name: l.name,
    linkedProperty: linkedProp,
    balance: l.currentBalance,
    rate: l.interestRatePA,
    monthlyPmt: monthly,
    mortgageType: 'P&I',
    isIO: false,
    payoffMonths: months,
    payoffDate,
    totalInterest,
    category: l.category,
  }
}

function formatMonthsAsYears(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}mo`
  if (m === 0) return `${y}yr`
  return `${y}yr ${m}mo`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

/* ── component ───────────────────────────────────────────────── */

interface DebtPayoffTimelineProps {
  liabilities: Liability[]
  properties: Property[]
  cashAssets: CashAsset[]
}

export function DebtPayoffTimeline({ liabilities, properties, cashAssets }: DebtPayoffTimelineProps) {
  const payoffData = useMemo(() => {
    if (liabilities.length === 0) return []
    const offsets = cashAssets.filter(a => a.isOffset)
    return liabilities
      .map(l => calculatePayoff(l, properties, offsets))
      .sort((a, b) => {
        // IO/never last, then by payoff months descending
        if (a.payoffMonths === null && b.payoffMonths === null) return b.balance - a.balance
        if (a.payoffMonths === null) return 1
        if (b.payoffMonths === null) return -1
        return b.payoffMonths - a.payoffMonths
      })
  }, [liabilities, properties, cashAssets])

  const totalBalance = payoffData.reduce((s, d) => s + d.balance, 0)
  const totalMonthlyPmt = payoffData.reduce((s, d) => s + d.monthlyPmt, 0)
  const totalInterest = payoffData.reduce((s, d) => s + (d.totalInterest ?? 0), 0)

  // Find max payoff months for the timeline bar scale
  const maxMonths = Math.max(...payoffData.map(d => d.payoffMonths ?? 0), 1)
  const maxYears = Math.ceil(maxMonths / 12)

  // Insights
  const pniDebts = payoffData.filter(d => d.payoffMonths !== null)
  const firstCleared = pniDebts.length > 0
    ? pniDebts.reduce((min, d) => (d.payoffMonths! < min.payoffMonths! ? d : min), pniDebts[0])
    : null
  const lastCleared = pniDebts.length > 0
    ? pniDebts.reduce((max, d) => (d.payoffMonths! > max.payoffMonths! ? d : max), pniDebts[0])
    : null
  const costliest = payoffData.reduce((max, d) =>
    (d.totalInterest ?? 0) > (max.totalInterest ?? 0) ? d : max, payoffData[0])

  if (payoffData.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
      {/* Header */}
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/15">
              <Landmark className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Debt Payoff Timeline</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {liabilities.length} debt{liabilities.length !== 1 ? 's' : ''} · {formatCurrency(totalBalance)} total
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Repayments</p>
            <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(totalMonthlyPmt)}</p>
          </div>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="px-5 sm:px-6 pb-4">
        {/* Year scale */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Now</span>
          {[...Array(Math.min(maxYears, 6))].map((_, i) => {
            const year = Math.ceil((maxYears / Math.min(maxYears, 6)) * (i + 1))
            return (
              <span key={i} className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                {year}yr
              </span>
            )
          })}
        </div>

        <div className="space-y-2">
          {payoffData.map(debt => {
            const pct = debt.payoffMonths !== null
              ? Math.max((debt.payoffMonths / maxMonths) * 100, 4)
              : 100
            const barColor = debt.isIO
              ? 'bg-amber-500/60 dark:bg-amber-500/40'
              : debt.payoffMonths !== null && debt.payoffMonths <= 60
                ? 'bg-emerald-500/70 dark:bg-emerald-500/50'
                : 'bg-rose-500/60 dark:bg-rose-500/40'

            return (
              <div key={debt.id} className="group">
                <div className="flex items-center gap-3">
                  <div className="w-28 sm:w-36 shrink-0 truncate">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
                      {debt.name}
                    </span>
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-slate-100 dark:bg-white/[0.06] overflow-hidden relative">
                    <div
                      className={`h-full rounded-md ${barColor} transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px] font-bold text-white/90 whitespace-nowrap">
                        {debt.isIO ? '∞ IO' : debt.payoffMonths !== null ? formatMonthsAsYears(debt.payoffMonths) : '∞'}
                      </span>
                    </div>
                  </div>
                  <div className="w-20 sm:w-24 text-right shrink-0">
                    <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(debt.balance)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Table */}
      <div className="px-5 sm:px-6 pb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className="text-left py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Debt</th>
              <th className="text-right py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Balance</th>
              <th className="text-right py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Rate</th>
              <th className="text-right py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly</th>
              <th className="text-right py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Total Interest</th>
              <th className="text-right py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Payoff</th>
            </tr>
          </thead>
          <tbody>
            {payoffData.map(debt => (
              <tr key={debt.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-slate-700 dark:text-slate-200">{debt.name}</div>
                  {debt.linkedProperty && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{debt.linkedProperty}</div>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {formatCurrency(debt.balance)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                  {(debt.rate * 100).toFixed(2)}%
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {formatCurrency(debt.monthlyPmt)}
                </td>
                <td className="py-2.5 text-right tabular-nums hidden sm:table-cell">
                  {debt.totalInterest !== null ? (
                    <span className="text-rose-600 dark:text-rose-400">{formatCurrency(debt.totalInterest)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {debt.isIO ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                      IO · Never
                    </span>
                  ) : debt.payoffDate ? (
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(debt.payoffDate)}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatMonthsAsYears(debt.payoffMonths!)}</div>
                    </div>
                  ) : (
                    <span className="text-rose-500 text-[10px] font-bold">Can't payoff</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-white/10">
              <td className="py-2.5 font-bold text-slate-800 dark:text-white">Total</td>
              <td className="py-2.5 text-right tabular-nums font-bold text-slate-800 dark:text-white">{formatCurrency(totalBalance)}</td>
              <td className="hidden sm:table-cell" />
              <td className="py-2.5 text-right tabular-nums font-bold text-slate-800 dark:text-white">{formatCurrency(totalMonthlyPmt)}</td>
              <td className="py-2.5 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400 hidden sm:table-cell">{formatCurrency(totalInterest)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Key Insights */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lastCleared && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <Calendar className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Debt Free</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatDate(lastCleared.payoffDate!)}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatMonthsAsYears(lastCleared.payoffMonths!)} from now</p>
              </div>
            </div>
          )}
          {firstCleared && firstCleared.id !== lastCleared?.id && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <Clock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">First Cleared</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{firstCleared.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {formatDate(firstCleared.payoffDate!)} · frees {formatCurrency(firstCleared.monthlyPmt)}/mo
                </p>
              </div>
            </div>
          )}
          {costliest && costliest.totalInterest !== null && costliest.totalInterest > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
              <TrendingDown className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Costliest Debt</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{costliest.name}</p>
                <p className="text-[10px] text-rose-500 dark:text-rose-400">
                  {formatCurrency(costliest.totalInterest!)} total interest
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warning for IO loans */}
        {payoffData.some(d => d.isIO) && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Interest-only loans</span> never reduce the principal. Consider switching to P&I to build equity and reduce total interest paid.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
