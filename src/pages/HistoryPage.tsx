import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import { History, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Home, Wallet, CreditCard, DollarSign, ShoppingCart, Camera } from 'lucide-react'
import type { MonthlySnapshot, Asset, CashAsset, StockAsset, VehicleAsset, SuperAsset } from '@/types/models'
import { createNetWorthSnapshot } from '@/lib/calculations'

function formatMonth(month: string): string {
  const [year, mo] = month.split('-')
  const date = new Date(parseInt(year), parseInt(mo) - 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function formatMonthShort(month: string): string {
  const [year, mo] = month.split('-')
  const date = new Date(parseInt(year), parseInt(mo) - 1)
  return date.toLocaleString('default', { month: 'short', year: '2-digit' })
}

function DeltaBadge({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const delta = current - previous
  if (Math.abs(delta) < 1) return <Minus className="h-3 w-3 text-slate-400 inline ml-1" />
  const isPositive = delta > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ml-1.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isPositive ? '+' : ''}{formatCurrency(delta)}
    </span>
  )
}

function SectionCard({ title, icon: Icon, children, accentClass }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  accentClass: string
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-sm">
      <div className="p-4 pb-3 flex items-center gap-2.5">
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${accentClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
      </div>
      <div className="px-4 pb-4">
        {children}
      </div>
    </div>
  )
}

function ItemRow({ label, value, sublabel, previousValue }: {
  label: string
  value: number
  sublabel?: string
  previousValue?: number
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
      <div>
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {sublabel && <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">{sublabel}</span>}
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">{formatCurrency(value)}</span>
        <DeltaBadge current={value} previous={previousValue} />
      </div>
    </div>
  )
}

function SnapshotDetail({ snapshot, prevSnapshot }: { snapshot: MonthlySnapshot; prevSnapshot?: MonthlySnapshot }) {
  const data = snapshot.data
  const prevData = prevSnapshot?.data

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No detailed data for this snapshot</p>
        <p className="text-xs mt-1">Older snapshots only contain summary figures. New snapshots will include full data.</p>
        <div className="mt-6 space-y-2">
          <ItemRow label="Total Assets" value={snapshot.totalAssets} previousValue={prevSnapshot?.totalAssets} />
          <ItemRow label="Total Liabilities" value={snapshot.totalLiabilities} previousValue={prevSnapshot?.totalLiabilities} />
          <ItemRow label="Net Wealth" value={snapshot.netWealth} previousValue={prevSnapshot?.netWealth} />
          <ItemRow label="Monthly Income" value={snapshot.totalIncome} previousValue={prevSnapshot?.totalIncome} />
          <ItemRow label="Monthly Expenses" value={snapshot.totalExpenses} previousValue={prevSnapshot?.totalExpenses} />
          <ItemRow label="Monthly Cashflow" value={snapshot.cashflow} previousValue={prevSnapshot?.cashflow} />
        </div>
      </div>
    )
  }

  // Build lookup for previous values
  const prevAssetMap = new Map((prevData?.assets ?? []).map(a => [a.id, a]))
  const prevPropertyMap = new Map((prevData?.properties ?? []).map(p => [p.id, p]))
  const prevLiabilityMap = new Map((prevData?.liabilities ?? []).map(l => [l.id, l]))
  const prevIncomeMap = new Map((prevData?.incomes ?? []).map(i => [i.id, i]))
  const prevBudgetMap = new Map((prevData?.expenseBudgets ?? []).map(b => [b.id, b]))

  // Group assets by category
  const assetGroups: Record<string, Asset[]> = {}
  for (const asset of data.assets) {
    const cat = asset.category
    if (!assetGroups[cat]) assetGroups[cat] = []
    assetGroups[cat].push(asset)
  }

  const categoryLabels: Record<string, string> = {
    cash: '💰 Cash & Savings',
    stocks: '📈 Shares / Stocks',
    super: '🎯 Superannuation',
    vehicles: '🚗 Vehicles',
    property: '🏠 Property Assets',
    other: '📦 Other Assets',
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Net Wealth', value: snapshot.netWealth, prev: prevSnapshot?.netWealth, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Assets', value: snapshot.totalAssets, prev: prevSnapshot?.totalAssets, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Total Liabilities', value: snapshot.totalLiabilities, prev: prevSnapshot?.totalLiabilities, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Monthly Income', value: snapshot.totalIncome, prev: prevSnapshot?.totalIncome, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Monthly Expenses', value: snapshot.totalExpenses, prev: prevSnapshot?.totalExpenses, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Monthly Cashflow', value: snapshot.cashflow, prev: prevSnapshot?.cashflow, color: snapshot.cashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{kpi.label}</span>
            <p className={`text-lg font-extrabold tabular-nums mt-0.5 ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
            <DeltaBadge current={kpi.value} previous={kpi.prev} />
          </div>
        ))}
      </div>

      {/* Properties */}
      {data.properties.length > 0 && (
        <SectionCard title="Properties" icon={Home} accentClass="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
          {data.properties.map(p => (
            <ItemRow
              key={p.id}
              label={p.name}
              sublabel={p.type === 'investment' ? 'Investment' : 'PPOR'}
              value={p.currentValue}
              previousValue={prevPropertyMap.get(p.id)?.currentValue}
            />
          ))}
        </SectionCard>
      )}

      {/* Assets by category */}
      {Object.entries(assetGroups).map(([cat, assets]) => (
        <SectionCard
          key={cat}
          title={categoryLabels[cat] ?? cat}
          icon={Wallet}
          accentClass="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        >
          {assets.map(a => {
            const prev = prevAssetMap.get(a.id)
            const sublabel = cat === 'cash'
              ? ((a as CashAsset).isOffset ? 'Offset' : (a as CashAsset).cashType === 'bank' ? 'Bank' : undefined)
              : cat === 'stocks'
                ? (a as StockAsset).ticker
                : cat === 'super'
                  ? (a as SuperAsset).fund
                  : cat === 'vehicles'
                    ? [(a as VehicleAsset).year, (a as VehicleAsset).make].filter(Boolean).join(' ')
                    : undefined
            return (
              <ItemRow
                key={a.id}
                label={a.name}
                sublabel={sublabel}
                value={a.currentValue}
                previousValue={prev?.currentValue}
              />
            )
          })}
        </SectionCard>
      ))}

      {/* Liabilities */}
      {data.liabilities.length > 0 && (
        <SectionCard title="Liabilities" icon={CreditCard} accentClass="bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
          {data.liabilities.map(l => (
            <ItemRow
              key={l.id}
              label={l.name}
              sublabel={`${(l.interestRatePA * 100).toFixed(2)}%`}
              value={l.currentBalance}
              previousValue={prevLiabilityMap.get(l.id)?.currentBalance}
            />
          ))}
        </SectionCard>
      )}

      {/* Income */}
      {data.incomes.length > 0 && (
        <SectionCard title="Income" icon={DollarSign} accentClass="bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
          {data.incomes.map(i => (
            <ItemRow
              key={i.id}
              label={i.name}
              sublabel={i.category}
              value={i.monthlyAmount}
              previousValue={prevIncomeMap.get(i.id)?.monthlyAmount}
            />
          ))}
        </SectionCard>
      )}

      {/* Expense Budgets */}
      {data.expenseBudgets.length > 0 && (
        <SectionCard title="Expense Budgets" icon={ShoppingCart} accentClass="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
          {data.expenseBudgets.map(b => (
            <ItemRow
              key={b.id}
              label={b.label}
              sublabel={b.category}
              value={b.monthlyBudget}
              previousValue={prevBudgetMap.get(b.id)?.monthlyBudget}
            />
          ))}
        </SectionCard>
      )}
    </div>
  )
}

export function HistoryPage() {
  const snapshots = useFinanceStore(s => s.netWorthSnapshots)
  const { assets, properties, liabilities, incomes, expenseBudgets, expenseActuals, userProfile, addNetWorthSnapshot } = useFinanceStore()
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => b.month.localeCompare(a.month)),
    [snapshots]
  )

  // Only show if 2+ snapshots (or show a prompt to take one)
  const hasEnough = sorted.length >= 1
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selected = sorted[selectedIndex]
  const prev = sorted[selectedIndex + 1] // previous month (sorted desc, so +1 = older)

  const [snapshotTaken, setSnapshotTaken] = useState(false)

  const handleTakeSnapshot = () => {
    const snapshot = createNetWorthSnapshot(
      assets, properties, liabilities, incomes, expenseBudgets, expenseActuals,
      userProfile?.budgetMode, userProfile?.estimatedMonthlyExpenses, userProfile?.expenseCalcSource
    )
    addNetWorthSnapshot(snapshot)
    setSnapshotTaken(true)
    setTimeout(() => setSnapshotTaken(false), 2000)
  }

  if (!hasEnough) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <History className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-6" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No History Yet</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Snapshots are taken automatically on the 1st of each month when you visit the dashboard.
          You can also take one manually to get started.
        </p>
        <button
          onClick={handleTakeSnapshot}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            snapshotTaken
              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Camera className="h-4 w-4" />
          {snapshotTaken ? 'Snapshot Taken!' : 'Take First Snapshot'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15">
            <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Financial History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{sorted.length} snapshot{sorted.length !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>
        <button
          onClick={handleTakeSnapshot}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
            snapshotTaken
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
              : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          {snapshotTaken ? 'Saved!' : 'Snapshot Now'}
        </button>
      </div>

      {/* Tab bar - scrollable month tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedIndex(Math.min(selectedIndex + 1, sorted.length - 1))}
          disabled={selectedIndex >= sorted.length - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 pb-0.5">
            {sorted.map((s, i) => (
              <button
                key={s.month}
                onClick={() => setSelectedIndex(i)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i === selectedIndex
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                {formatMonthShort(s.month)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setSelectedIndex(Math.max(selectedIndex - 1, 0))}
          disabled={selectedIndex <= 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Selected month title */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-white">
          {formatMonth(selected.month)}
        </h3>
        {prev && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Compared to {formatMonthShort(prev.month)}
          </span>
        )}
      </div>

      {/* Snapshot detail */}
      <SnapshotDetail snapshot={selected} prevSnapshot={prev} />
    </div>
  )
}
