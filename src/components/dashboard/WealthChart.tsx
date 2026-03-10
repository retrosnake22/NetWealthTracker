import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCompact, formatCurrency } from '@/lib/format'

interface WealthChartProps {
  data: Array<{ label: string; netWealth: number; totalAssets: number; totalLiabilities: number }>
}

const EMERALD_HEX = '#34d399'
const EMERALD_DARK = '#10b981'

export function WealthChart({ data }: WealthChartProps) {
  const empty = data.length === 0

  return (
    <Card className="rounded-xl bg-card overflow-hidden card-hover">
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
                    <stop offset="5%"  stopColor={EMERALD_DARK} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={EMERALD_DARK} stopOpacity={0} />
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
                  formatter={(value) => [formatCurrency(Number(value)), 'Net Wealth']}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: 'var(--popover-foreground)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  }}
                  cursor={{ stroke: EMERALD_HEX, strokeWidth: 1, strokeDasharray: '4 2' }}
                />

                <Area
                  type="monotone"
                  dataKey="netWealth"
                  stroke={EMERALD_HEX}
                  strokeWidth={2.5}
                  fill="url(#netWealthGrad)"
                  name="Net Wealth"
                  dot={false}
                  activeDot={{ r: 5, fill: EMERALD_HEX, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
