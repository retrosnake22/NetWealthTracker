import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'

interface AssetBreakdownProps {
  data: Array<{ name: string; value: number; color: string }>
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#3b82f6', '#8b5cf6', '#f59e0b']

export function AssetBreakdown({ data }: AssetBreakdownProps) {
  const empty = data.length === 0

  return (
    <Card className="rounded-xl bg-card overflow-hidden">
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
            <div className="h-[220px]">
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
                    {data.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '13px',
                      color: 'hsl(var(--popover-foreground))',
                      boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-3">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
