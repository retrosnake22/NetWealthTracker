// NWT Dashboard
import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { AssetBreakdown } from '@/components/dashboard/AssetBreakdown'
import { KpiBreakdownDialog, type BreakdownType } from '@/components/dashboard/KpiBreakdownDialog'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateDebtToAssetRatio, projectNetWealth,
  calculateDashboardMetrics,
} from '@/lib/calculations'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STORAGE_KEY = 'nwt-dashboard-order'
const DEFAULT_ORDER = ['hero', 'cashflow-kpis', 'charts']

function loadOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const missing = DEFAULT_ORDER.filter(id => !parsed.includes(id))
      return [...parsed.filter((id: string) => DEFAULT_ORDER.includes(id)), ...missing]
    }
  } catch { /* ignore */ }
  return [...DEFAULT_ORDER]
}

function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-80 scale-[1.01]' : ''}>
      <div className="relative group">
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md
                     text-muted-foreground/0 group-hover:text-muted-foreground/60
                     hover:!text-muted-foreground hover:bg-muted/50
                     transition-all cursor-grab active:cursor-grabbing
                     touch-none md:opacity-0 md:group-hover:opacity-100
                     opacity-40"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="pl-4 md:pl-0 md:group-hover:pl-4 transition-all">
          {children}
        </div>
      </div>
    </div>
  )
}

function CashflowBar({ label, amount, max, color, icon: Icon }: {
  label: string
  amount: number
  max: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color.includes('blue') ? 'text-blue-400' : 'text-red-400'}`} />
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{formatCurrency(amount)}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} progress-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function KpiCard({
  label, value, tag, tagColor, ratio, icon: Icon, accentColor, onClick,
}: {
  label: string
  value: string
  tag: string
  tagColor: 'blue' | 'amber' | 'red'
  ratio: number
  icon: React.ComponentType<{ className?: string }>
  accentColor: string
  onClick?: () => void
}) {
  const barColor = { blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tagColor]
  const tagBg = {
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  }[tagColor]

  return (
    <Card
      className={`rounded-xl bg-card card-hover card-accent-left h-full ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all' : ''}`}
      style={{ '--accent-color': accentColor } as React.CSSProperties}
      onClick={onClick}
    >
      <CardContent className="p-5 pl-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${tagBg}`}>
            {tag}
          </span>
        </div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight mb-3 animate-count">{value}</p>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full progress-fill ${barColor}`}
            style={{ width: `${Math.min(Math.max(ratio * 100, 0), 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings } = useFinanceStore()
  const [widgetOrder, setWidgetOrder] = useState(loadOrder)
  const [breakdownOpen, setBreakdownOpen] = useState<BreakdownType>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetOrder))
  }, [widgetOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgetOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const netWealthIncSuper = calculateNetWealth(assets, properties, liabilities)
  const totalAssets       = calculateTotalAssets(assets, properties)
  const totalLiabilities  = calculateTotalLiabilities(liabilities)
  const superTotal        = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
  const netWealth         = netWealthIncSuper - superTotal

  // Use shared metrics so dashboard and breakdown dialogs always match
  const { monthlyIncome, monthlyExpenses, monthlyCashflow, savingsRate } =
    calculateDashboardMetrics(incomes, expenseBudgets, properties, liabilities, assets)
  const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)

  const projectionData = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears,
    projectionSettings.propertyGrowthOverride,
    projectionSettings.stockGrowthOverride
  )

  // Asset breakdown for pie chart
  const PIE_COLORS: Record<string, string> = {
    cash: '#f59e0b', property: '#3b82f6', stocks: '#6366f1',
    super: '#8b5cf6', vehicles: '#f97316', other: '#6b7280',
  }
  const categoryTotals = new Map<string, { value: number; color: string }>()
  assets.forEach(a => {
    const label = ({ cash: 'Cash & Savings', stocks: 'Shares / Stocks', super: 'Super', vehicles: 'Vehicles', other: 'Other' } as Record<string, string>)[a.category] ?? a.category.charAt(0).toUpperCase() + a.category.slice(1)
    const existing = categoryTotals.get(label)
    categoryTotals.set(label, {
      value: (existing?.value ?? 0) + a.currentValue,
      color: PIE_COLORS[a.category] ?? '#6b7280',
    })
  })
  if (properties.length > 0) {
    categoryTotals.set('Property', {
      value: properties.reduce((s, p) => s + p.currentValue, 0),
      color: PIE_COLORS.property,
    })
  }
  const breakdownData = Array.from(categoryTotals.entries()).map(([name, data]) => ({
    name, value: data.value, color: data.color,
  }))

  const isEmpty = assets.length === 0 && properties.length === 0 && liabilities.length === 0

  // KPI tags
  const savingsTag = savingsRate > 20 ? 'Excellent' : savingsRate > 10 ? 'Good' : savingsRate > 0 ? 'Low' : 'None'
  const savingsColor = savingsRate > 20 ? 'blue' as const : savingsRate > 10 ? 'blue' as const : savingsRate > 0 ? 'amber' as const : 'red' as const
  const debtTag = debtRatio < 0.3 ? 'Healthy' : debtRatio < 0.5 ? 'Moderate' : 'High'
  const debtColor = debtRatio < 0.3 ? 'blue' as const : debtRatio < 0.5 ? 'amber' as const : 'red' as const
  const surplusTag = monthlyCashflow > 500 ? 'Strong' : monthlyCashflow > 0 ? 'Positive' : 'Deficit'
  const surplusColor = monthlyCashflow > 500 ? 'blue' as const : monthlyCashflow > 0 ? 'amber' as const : 'red' as const

  const cashflowMax = Math.max(monthlyIncome, monthlyExpenses)

  // Projection assumption labels
  const propGrowth = ((projectionSettings.propertyGrowthOverride ?? 0.07) * 100).toFixed(0)
  const stockGrowth = ((projectionSettings.stockGrowthOverride ?? 0.07) * 100).toFixed(0)

  const widgets: Record<string, React.ReactNode> = {
    hero: (
      <>
        {isEmpty && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center animate-fade-up">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to Net Wealth Tracker</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your properties, assets, income, and expenses to see your financial picture.
            </p>
          </div>
        )}
        <div className="animate-fade-up cursor-pointer" onClick={() => setBreakdownOpen('net-wealth')}>
          <MetricCard
            variant="hero"
            title="Net Wealth (excl. Super)"
            value={formatCurrency(netWealth)}
            subtitle={`Incl. Super: ${formatCurrency(netWealthIncSuper)}`}
            icon={DollarSign}
            trend={netWealth >= 0 ? 'up' : 'down'}
            breakdownItems={[
              { label: 'Total Assets',     value: formatCurrency(totalAssets),      color: '#60A5FA' },
              { label: 'Total Liabilities', value: formatCurrency(totalLiabilities), color: '#f87171' },
              { label: 'Monthly Surplus',  value: formatCurrency(monthlyCashflow),  color: monthlyCashflow >= 0 ? '#3b82f6' : '#f59e0b' },
            ]}
          />
        </div>
      </>
    ),

    'cashflow-kpis': (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        <Card
          className="rounded-xl bg-card lg:col-span-1 animate-fade-up animate-delay-1 h-full flex flex-col cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
          onClick={() => setBreakdownOpen('cashflow')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Cashflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CashflowBar label="Income" amount={monthlyIncome} max={cashflowMax} color="bg-blue-500" icon={ArrowUpRight} />
            <CashflowBar label="Expenses" amount={monthlyExpenses} max={cashflowMax} color="bg-red-400" icon={ArrowDownRight} />
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Surplus</span>
                <span className={`text-lg font-bold tabular-nums ${monthlyCashflow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(monthlyCashflow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="animate-fade-up animate-delay-2 h-full">
            <KpiCard label="Savings Rate" value={formatPercent(savingsRate / 100)} tag={savingsTag} tagColor={savingsColor} ratio={savingsRate / 100} icon={PiggyBank} accentColor="#3B82F6" onClick={() => setBreakdownOpen('savings-rate')} />
          </div>
          <div className="animate-fade-up animate-delay-3 h-full">
            <KpiCard label="Debt Ratio" value={formatPercent(debtRatio)} tag={debtTag} tagColor={debtColor} ratio={debtRatio} icon={BarChart3} accentColor="#f87171" onClick={() => setBreakdownOpen('debt-ratio')} />
          </div>
          <div className="animate-fade-up animate-delay-4 h-full">
            <KpiCard label="Monthly Surplus" value={formatCurrency(monthlyCashflow)} tag={surplusTag} tagColor={surplusColor} ratio={monthlyIncome > 0 ? monthlyCashflow / monthlyIncome : 0} icon={TrendingUp} accentColor="#3b82f6" onClick={() => setBreakdownOpen('surplus')} />
          </div>
        </div>
      </div>
    ),

    charts: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full animate-fade-up animate-delay-5">
          <WealthChart data={projectionData} />
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Projection assumes {propGrowth}% p.a. property growth, {stockGrowth}% p.a. shares/super growth, and current monthly surplus reinvested.
            {' '}Adjust in <a href="/projections" className="underline hover:text-foreground">Projections</a>.
          </p>
        </div>
        <div className="h-full animate-fade-up animate-delay-6">
          <AssetBreakdown data={breakdownData} />
        </div>
      </div>
    ),
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id}>
                {widgets[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <KpiBreakdownDialog open={breakdownOpen} onClose={() => setBreakdownOpen(null)} />
    </>
  )
}
