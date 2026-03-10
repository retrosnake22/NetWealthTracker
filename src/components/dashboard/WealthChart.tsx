import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
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
            <span className="w-3 h-1 rounded bg-emerald-400 inline-block" />
            <span className="font-medium text-foreground">Net Wealth</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded bg-emerald-700/60 inline-block" />
            Assets
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded bg-amber-400/60 inline-block border border-dashed border-amber-400/40" />
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
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="netWealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
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
                  cursor={{ stroke: '#34d399', strokeWidth: 1, strokeDasharray: '4 2' }}
                />

                {/* Net Wealth — primary, filled area */}
                <Area
                  type="monotone"
                  dataKey="netWealth"
                  stroke="#34d399"
                  strokeWidth={3}
                  fill="url(#netWealthGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }}
                />

                {/* Assets — subtle secondary line */}
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  stroke="#065f46"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#065f46', strokeWidth: 0 }}
                />

                {/* Liabilities — subtle dashed secondary line */}
                <Line
                  type="monotone"
                  dataKey="totalLiabilities"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
