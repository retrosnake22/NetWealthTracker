import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCompact } from '@/lib/format'

interface WealthChartProps {
  data: Array<{ label: string; netWealth: number; totalAssets: number; totalLiabilities: number }>
}

const EMERALD = 'oklch(0.70 0.18 160)'

export function WealthChart({ data }: WealthChartProps) {
  const empty = data.length === 0

  return (
    <Card className="rounded-xl bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Net Wealth Projection</CardTitle>
      </CardHeader>

      <CardContent>
        {empty ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Add assets and income to see your wealth projection
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="netWealthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={EMERALD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

                <XAxis
                  dataKey="label"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />

                <Tooltip
                  formatter={(value) => [formatCompact(Number(value)), 'Net Wealth']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)',
                  }}
                  cursor={{ stroke: EMERALD, strokeWidth: 1, strokeDasharray: '4 2' }}
                />

                <Area
                  type="monotone"
                  dataKey="netWealth"
                  stroke={EMERALD}
                  strokeWidth={2.5}
                  fill="url(#netWealthGrad)"
                  name="Net Wealth"
                  dot={false}
                  activeDot={{ r: 5, fill: EMERALD, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
