import { LineChart, TrendingUp } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import { projectNetWealth } from '@/lib/calculations'

export function ProjectionsPage() {
  const {
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings, updateProjectionSettings,
  } = useFinanceStore()

  const allocations = projectionSettings.surplusAllocations

  // Use growth overrides, defaulting to 7% if somehow undefined
  const propertyGrowth = projectionSettings.propertyGrowthOverride ?? 0.07
  const stockGrowth = projectionSettings.stockGrowthOverride ?? 0.07

  const data = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    allocations,
    projectionSettings.projectionYears,
    propertyGrowth,
    stockGrowth
  )

  const finalPoint = data[data.length - 1]
  const startPoint = data[0]
  const growth = (finalPoint?.netWealth ?? 0) - (startPoint?.netWealth ?? 0)

  return (
    <div className="space-y-6">

      {data.length <= 1 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <LineChart className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Not enough data</h3>
          <p className="text-muted-foreground">Add assets, income, and expenses to generate projections.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Current Net Wealth</p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(startPoint?.netWealth ?? 0)}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected ({projectionSettings.projectionYears}yr)</p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-400">{formatCurrency(finalPoint?.netWealth ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected Growth</p>
                <p className={`text-2xl font-extrabold tabular-nums tracking-tight ${growth >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(growth)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <WealthChart data={data} />

          {/* Growth Assumptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Growth Assumptions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Adjust the assumed annual growth rates used in the projection above.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Property Growth (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={30}
                    value={(propertyGrowth * 100).toFixed(1)}
                    onChange={e => {
                      updateProjectionSettings({ propertyGrowthOverride: parseFloat(e.target.value) / 100 || 0 })
                    }}
                  />
                </div>
                <div>
                  <Label>Stock / Super Growth (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={30}
                    value={(stockGrowth * 100).toFixed(1)}
                    onChange={e => {
                      updateProjectionSettings({ stockGrowthOverride: parseFloat(e.target.value) / 100 || 0 })
                    }}
                  />
                </div>
                <div>
                  <Label>Projection Period (years)</Label>
                  <Input
                    type="number"
                    value={projectionSettings.projectionYears}
                    onChange={e => updateProjectionSettings({ projectionYears: parseInt(e.target.value) || 20 })}
                    min={1}
                    max={50}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
