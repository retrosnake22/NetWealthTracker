import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, LabelList } from 'recharts'
import { formatCompact, formatCurrency } from '@/lib/format'
import type { ProjectionPoint } from '@/lib/calculations'

interface WealthChartProps {
  data: ProjectionPoint[]
  selectedPropertyId?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any, name: any) => {
  const labels: Record<string, string> = {
    totalAssets: 'Assets',
    totalLiabilities: 'Liabilities',
    netWealth: 'Net Wealth',
  }
  return [formatCurrency(Number(value)), labels[String(name)] || String(name)]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const propertyTooltipFormatter = (value: any, name: any) => {
  const labels: Record<string, string> = {
    totalAssets: 'Property Value',
    totalLiabilities: 'Mortgage',
    netWealth: 'Equity',
  }
  return [formatCurrency(Number(value)), labels[String(name)] || String(name)]
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

export function WealthChart({ data, selectedPropertyId }: WealthChartProps) {
  const isDesktop = useIsDesktop()

  // Transform data for per-property view
  const chartData = selectedPropertyId
    ? data.map(point => {
        const detail = point.propertyDetails?.find(d => d.propertyId === selectedPropertyId)
        return {
          label: point.label,
          netWealth: detail?.equity ?? 0,
          totalAssets: detail?.assetValue ?? 0,
          totalLiabilities: detail?.liabilityBalance ?? 0,
        }
      })
    : data.map(point => ({
        label: point.label,
        netWealth: point.netWealth,
        totalAssets: point.totalAssets,
        totalLiabilities: point.totalLiabilities,
      }))

  const empty = chartData.length === 0

  const isPropertyView = !!selectedPropertyId

  // Custom label renderer — shows at every point on desktop, every 5 years on mobile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = useCallback((props: any) => {
    const { x, y, index, value } = props
    if (value == null || index == null) return null

    // On mobile, only show every 5th year (index 0, 5, 10, ...) and the last point
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
    <Card className="rounded-xl bg-card overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg font-semibold">
            {isPropertyView ? 'Property Projection' : 'Wealth Projection'}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-blue-400 inline-block" />
              <span className="font-medium text-foreground">
                {isPropertyView ? 'Equity' : 'Net Wealth'}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded bg-blue-800/60 inline-block" />
              {isPropertyView ? 'Value' : 'Assets'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded bg-red-400/60 inline-block border border-dashed border-red-400/40" />
              {isPropertyView ? 'Mortgage' : 'Liabilities'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {empty ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Add assets and income to see your wealth projection
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="netWealthGrad" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={isPropertyView ? propertyTooltipFormatter : tooltipFormatter}
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

                {/* Net Wealth / Equity — primary, filled area */}
                <Area
                  type="monotone"
                  dataKey="netWealth"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#netWealthGrad)"
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#60A5FA', strokeWidth: 0 }}
                >
                  <LabelList
                    dataKey="netWealth"
                    content={renderCustomLabel}
                  />
                </Area>

                {/* Assets / Property Value — subtle secondary line */}
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  stroke="#1e40af"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#1e40af', strokeWidth: 0 }}
                />

                {/* Liabilities / Mortgage — subtle dashed secondary line */}
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
      </CardContent>
    </Card>
  )
}
