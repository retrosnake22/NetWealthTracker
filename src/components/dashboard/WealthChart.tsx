import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, LabelList } from 'recharts'
import { formatCompact, formatCurrency } from '@/lib/format'

interface WealthChartProps {
  data: Array<{ label: string; netWealth: number; totalAssets: number; totalLiabilities: number }>
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

export function WealthChart({ data }: WealthChartProps) {
  const empty = data.length === 0

  return (
    <Card className="rounded-xl bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Wealth Projection</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
      </CardHeader>

      <CardContent>
        {empty ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Add assets and income to see your wealth projection
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 24, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="netWealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

                <XAxis
                  dataKey="label"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
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

                {/* Net Wealth — primary, filled area with value labels */}
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
                    position="top"
                    offset={10}
                    formatter={formatCompact}
                    style={{ fill: '#93C5FD', fontSize: 11, fontWeight: 600 }}
                  />
                </Area>

                {/* Assets — subtle secondary line */}
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  stroke="#1e40af"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#1e40af', strokeWidth: 0 }}
                />

                {/* Liabilities — subtle dashed secondary line */}
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
