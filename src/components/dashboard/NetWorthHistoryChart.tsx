import { useState } from 'react'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { TrendingUp, Camera, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCompact, formatCurrency } from '@/lib/format'
import type { MonthlySnapshot } from '@/types/models'

interface NetWorthHistoryChartProps {
  snapshots: MonthlySnapshot[]
  onTakeSnapshot: () => void
  onDeleteSnapshot: (month: string) => void
}

function formatMonth(month: string): string {
  const [year, mo] = month.split('-')
  const date = new Date(parseInt(year), parseInt(mo) - 1)
  return date.toLocaleString('default', { month: 'short', year: '2-digit' })
}

export function NetWorthHistoryChart({ snapshots, onTakeSnapshot, onDeleteSnapshot }: NetWorthHistoryChartProps) {
  const [showTable, setShowTable] = useState(false)
  const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month))

  const chartData = sorted.map(s => ({
    label: formatMonth(s.month),
    month: s.month,
    netWealth: s.netWealth,
    totalAssets: s.totalAssets,
    totalLiabilities: s.totalLiabilities,
  }))

  // Calculate change from first to last snapshot
  const change = sorted.length >= 2
    ? sorted[sorted.length - 1].netWealth - sorted[0].netWealth
    : null

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="p-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Net Worth History</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {sorted.length} snapshot{sorted.length !== 1 ? 's' : ''} recorded
                {change !== null && (
                  <span className={change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {' · '}{change >= 0 ? '+' : ''}{formatCurrency(change)} overall
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onTakeSnapshot}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            Snapshot Now
          </button>
        </div>
      </div>

      <div className="px-5 pb-3">
        {sorted.length < 2 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-sm text-slate-400 dark:text-slate-500 text-center gap-2">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <p>Take monthly snapshots to track your net worth trend over time.</p>
            {sorted.length === 1 && <p className="text-xs">1 snapshot recorded — need at least 2 for a chart.</p>}
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="historyNetWealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      netWealth: 'Net Wealth',
                      totalAssets: 'Assets',
                      totalLiabilities: 'Liabilities',
                    }
                    return [formatCurrency(value), labels[name] || name]
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: 'var(--popover-foreground)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(8px)',
                  }}
                  cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Area
                  type="monotone"
                  dataKey="netWealth"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#historyNetWealthGrad)"
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#60A5FA', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  stroke="#1e40af"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#1e40af', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalLiabilities"
                  stroke="#F87171"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#F87171', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      {sorted.length >= 2 && (
        <div className="px-5 pb-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded bg-blue-400 inline-block" />
            <span className="font-medium text-foreground">Net Wealth</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded bg-blue-800/60 inline-block" />
            Assets
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded bg-red-400/60 inline-block border border-dashed border-red-400/40" />
            Liabilities
          </span>
        </div>
      )}

      {/* Snapshot Table Toggle */}
      {sorted.length > 0 && (
        <div className="border-t border-slate-100 dark:border-white/10">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <span>Snapshot History</span>
            {showTable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showTable && (
            <div className="px-5 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10">
                      <th className="pb-2 font-medium">Month</th>
                      <th className="pb-2 font-medium text-right">Assets</th>
                      <th className="pb-2 font-medium text-right">Liabilities</th>
                      <th className="pb-2 font-medium text-right">Net Wealth</th>
                      <th className="pb-2 font-medium text-right">Cashflow</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sorted].reverse().map((s, i) => {
                      const prev = sorted.length > 1 && i < sorted.length - 1 ? [...sorted].reverse()[i + 1] : null
                      const delta = prev ? s.netWealth - prev.netWealth : null
                      return (
                        <tr key={s.month} className="border-b border-slate-50 dark:border-white/5 last:border-0">
                          <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{formatMonth(s.month)}</td>
                          <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatCurrency(s.totalAssets)}</td>
                          <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatCurrency(s.totalLiabilities)}</td>
                          <td className="py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                            {formatCurrency(s.netWealth)}
                            {delta !== null && (
                              <span className={`ml-1 text-[10px] font-normal ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {delta >= 0 ? '↑' : '↓'}{formatCurrency(Math.abs(delta))}
                              </span>
                            )}
                          </td>
                          <td className={`py-2 text-right tabular-nums ${s.cashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(s.cashflow)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => onDeleteSnapshot(s.month)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom accent */}
      <div className="h-1 w-full bg-blue-500" style={{ opacity: 0.8 }} />
    </div>
  )
}
