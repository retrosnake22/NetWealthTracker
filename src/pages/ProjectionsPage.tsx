import { useFinanceStore } from '@/stores/useFinanceStore'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import { projectNetWealth } from '@/lib/calculations'
import { LineChart } from 'lucide-react'

export function ProjectionsPage() {
  const { assets, properties, liabilities, incomes, expenseBudgets, projectionSettings, updateProjectionSettings } = useFinanceStore()

  const data = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings.surplusAllocations,
    projectionSettings.projectionYears
  )

  const finalPoint = data[data.length - 1]
  const startPoint = data[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projections</h1>
        <p className="text-muted-foreground mt-1">See where your wealth is heading</p>
      </div>

      {data.length <= 1 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Not enough data</h3>
          <p className="text-muted-foreground">Add assets, income, and expenses to generate projections.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Current Net Wealth</p>
                <p className="text-2xl font-bold">{formatCurrency(startPoint?.netWealth ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected ({projectionSettings.projectionYears}yr)</p>
                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(finalPoint?.netWealth ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Projected Growth</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {formatCurrency((finalPoint?.netWealth ?? 0) - (startPoint?.netWealth ?? 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label>Projection Period (years)</Label>
                <Input
                  type="number"
                  value={projectionSettings.projectionYears}
                  onChange={e => updateProjectionSettings({ projectionYears: parseInt(e.target.value) || 20 })}
                  min={1}
                  max={50}
                />
              </div>
            </CardContent>
          </Card>

          <WealthChart data={data} />
        </>
      )}
    </div>
  )
}
