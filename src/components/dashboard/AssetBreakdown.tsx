import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'

interface AssetBreakdownProps {
  data: Array<{ name: string; value: number; color: string }>
}

export function AssetBreakdown({ data }: AssetBreakdownProps) {
  const empty = data.length === 0
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="rounded-xl bg-card overflow-hidden card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Asset Breakdown</CardTitle>
      </CardHeader>

      <CardContent>
        {empty ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            Add assets to see your breakdown
          </div>
        ) : (
          <>
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: 'var(--popover-foreground)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2.5">
              {data.map((item) => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                return (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground/60">{pct}%</span>
                      <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
