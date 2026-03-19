import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, LabelList } from 'recharts'
import { formatCompact, formatCurrency } from '@/lib/format'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { Property, Liability, CashAsset } from '@/types/models'

interface PropertyEquityChartProps {
  property: Property
  mortgage?: Liability
}

interface EquityPoint {
  label: string
  equity: number
  propertyValue: number
  mortgageBalance: number
}

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isDesktop
}

/**
 * Project equity growth for a single property over time.
 * Uses the property's growth rate for appreciation and the mortgage's
 * interest rate + repayments for amortisation. Accounts for offset accounts.
 */
function projectPropertyEquity(
  property: Property,
  mortgage: Liability | undefined,
  offsetAccounts: CashAsset[],
  years: number,
  propertyGrowthOverride?: number,
): EquityPoint[] {
  const points: EquityPoint[] = []
  const months = years * 12
  const growthRate = propertyGrowthOverride ?? property.growthRatePA
  const currentYear = new Date().getFullYear()

  let propertyValue = property.currentValue
  let mortgageBalance = mortgage?.currentBalance ?? 0

  // Offset account balances (tracked for interest calc)
  let totalOffset = offsetAccounts.reduce((sum, a) => sum + a.currentValue, 0)
  // Offset accounts may have their own growth (interest)
  const offsetGrowthRates = offsetAccounts.map(a => a.growthRatePA || (a.interestRatePA ?? 0))

  // Monthly mortgage repayment
  let monthlyRepayment = 0
  if (mortgage && mortgage.minimumRepayment > 0) {
    const freq = mortgage.repaymentFrequency === 'weekly' ? 52
      : mortgage.repaymentFrequency === 'fortnightly' ? 26
      : 12
    monthlyRepayment = (mortgage.minimumRepayment * freq) / 12
  }

  for (let m = 0; m <= months; m++) {
    // Record yearly snapshots
    if (m % 12 === 0) {
      const yearIndex = m / 12
      points.push({
        label: m === 0 ? 'Now' : `${currentYear + yearIndex}`,
        equity: propertyValue - mortgageBalance,
        propertyValue,
        mortgageBalance,
      })
    }

    if (m === months) break

    // Appreciate property value
    const monthlyGrowth = Math.pow(1 + growthRate, 1 / 12) - 1
    propertyValue *= (1 + monthlyGrowth)

    // Amortise mortgage
    if (mortgage && mortgageBalance > 0) {
      const effectiveBalance = Math.max(0, mortgageBalance - totalOffset)
      const monthlyInterest = effectiveBalance * (mortgage.interestRatePA / 12)
      mortgageBalance = Math.max(0, mortgageBalance + monthlyInterest - monthlyRepayment)
    }

    // Grow offset accounts
    if (offsetAccounts.length > 0) {
      let newOffset = 0
      let idx = 0
      for (const acct of offsetAccounts) {
        const rate = offsetGrowthRates[idx] || 0
        const monthlyOffsetGrowth = Math.pow(1 + rate, 1 / 12) - 1
        const val = (idx === 0 ? totalOffset : acct.currentValue) // simplified: track aggregate
        newOffset += val * (1 + monthlyOffsetGrowth)
        idx++
      }
      // Simplified: just grow total offset at average rate
      if (offsetAccounts.length > 0) {
        const avgRate = offsetGrowthRates.reduce((s, r) => s + r, 0) / offsetGrowthRates.length
        const monthlyOffsetGrowth = Math.pow(1 + avgRate, 1 / 12) - 1
        totalOffset *= (1 + monthlyOffsetGrowth)
      }
    }
  }

  return points
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any, name: any) => {
  const labels: Record<string, string> = {
    propertyValue: 'Property Value',
    mortgageBalance: 'Mortgage',
    equity: 'Equity',
  }
  return [formatCurrency(Number(value)), labels[String(name)] || String(name)]
}

export function PropertyEquityChart({ property, mortgage }: PropertyEquityChartProps) {
  const isDesktop = useIsDesktop()
  const { assets, projectionSettings } = useFinanceStore()

  const propertyGrowth = projectionSettings.propertyGrowthOverride ?? property.growthRatePA
  const years = projectionSettings.projectionYears || 20

  // Find offset accounts linked to this mortgage
  const offsetAccounts = useMemo(() => {
    if (!mortgage) return []
    return (assets.filter(a =>
      a.category === 'cash' && (a as CashAsset).isOffset && (a as CashAsset).linkedMortgageId === mortgage.id
    ) as CashAsset[])
  }, [assets, mortgage])

  const chartData = useMemo(() =>
    projectPropertyEquity(property, mortgage, offsetAccounts, years, propertyGrowth),
    [property, mortgage, offsetAccounts, years, propertyGrowth]
  )

  const empty = chartData.length === 0

  // Summary values
  const startEquity = chartData[0]?.equity ?? 0
  const endEquity = chartData[chartData.length - 1]?.equity ?? 0
  const equityGrowth = endEquity - startEquity

  // Custom label renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = useCallback((props: any) => {
    const { x, y, index, value } = props
    if (value == null || index == null) return null

    if (!isDesktop) {
      const isLastPoint = index === chartData.length - 1
      if (index % 5 !== 0 && !isLastPoint) return null
    }

    return (
      <text
        x={x}
        y={y - 12}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={isDesktop ? 11 : 10}
        fontWeight={500}
      >
        {formatCompact(value)}
      </text>
    )
  }, [isDesktop, chartData.length])

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Equity Growth Projection
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-blue-400 inline-block" />
              <span className="font-medium text-foreground">Equity</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded bg-blue-800/60 inline-block" />
              Value
            </span>
            {mortgage && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 rounded bg-red-400/60 inline-block border border-dashed border-red-400/40" />
                Mortgage
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Equity</p>
            <p className="text-lg font-bold tabular-nums text-blue-400">{formatCurrency(startEquity)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected Equity ({years}yr)</p>
            <p className="text-lg font-bold tabular-nums text-blue-400">{formatCurrency(endEquity)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Equity Growth</p>
            <p className={`text-lg font-bold tabular-nums ${equityGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              +{formatCurrency(equityGrowth)}
            </p>
          </div>
        </div>

        {empty ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            Not enough data to project equity growth
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id={`equityGrad-${property.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

                <XAxis
                  dataKey="label"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />

                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: 'var(--popover-foreground)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(8px)',
                  }}
                  cursor={{ stroke: '#60A5FA', strokeWidth: 1, strokeDasharray: '4 2' }}
                />

                {/* Equity — primary filled area */}
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill={`url(#equityGrad-${property.id})`}
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#60A5FA', strokeWidth: 0 }}
                >
                  <LabelList
                    dataKey="equity"
                    content={renderCustomLabel}
                  />
                </Area>

                {/* Property Value — subtle secondary line */}
                <Line
                  type="monotone"
                  dataKey="propertyValue"
                  stroke="#1e40af"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#1e40af', strokeWidth: 0 }}
                />

                {/* Mortgage Balance — dashed red line */}
                {mortgage && (
                  <Line
                    type="monotone"
                    dataKey="mortgageBalance"
                    stroke="#F87171"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    strokeOpacity={0.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#F87171', strokeWidth: 0 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Based on {((propertyGrowth) * 100).toFixed(1)}% p.a. growth
          {mortgage ? ` · ${((mortgage.interestRatePA) * 100).toFixed(2)}% interest` : ''}
          {offsetAccounts.length > 0 ? ' · offset applied' : ''}
        </p>
      </CardContent>
    </Card>
  )
}
