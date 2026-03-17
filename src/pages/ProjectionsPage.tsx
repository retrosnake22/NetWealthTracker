import { useState, useEffect } from 'react'
import { LineChart, TrendingUp, Building2, ChevronDown } from 'lucide-react'
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
    projectionSettings, updateProjectionSettings, userProfile,
  } = useFinanceStore()

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

  const allocations = projectionSettings.surplusAllocations

  // Use growth overrides, defaulting to 7% if somehow undefined
  const propertyGrowth = projectionSettings.propertyGrowthOverride ?? 0.07
  const stockGrowth = projectionSettings.stockGrowthOverride ?? 0.07

  // Local input state so typing isn't interrupted by .toFixed() re-renders
  const [propGrowthInput, setPropGrowthInput] = useState((propertyGrowth * 100).toFixed(1))
  const [stockGrowthInput, setStockGrowthInput] = useState((stockGrowth * 100).toFixed(1))

  // Sync local state when store changes externally
  useEffect(() => {
    setPropGrowthInput((propertyGrowth * 100).toFixed(1))
  }, [propertyGrowth])
  useEffect(() => {
    setStockGrowthInput((stockGrowth * 100).toFixed(1))
  }, [stockGrowth])

  const data = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    allocations,
    projectionSettings.projectionYears,
    propertyGrowth,
    stockGrowth,
    userProfile?.budgetMode,
    userProfile?.estimatedMonthlyExpenses
  )

  // Compute summary cards based on selection
  const isPropertyView = !!selectedPropertyId
  let startValue = 0
  let endValue = 0

  if (isPropertyView && data.length > 0) {
    const startDetail = data[0].propertyDetails?.find(d => d.propertyId === selectedPropertyId)
    const endDetail = data[data.length - 1].propertyDetails?.find(d => d.propertyId === selectedPropertyId)
    startValue = startDetail?.equity ?? 0
    endValue = endDetail?.equity ?? 0
  } else if (data.length > 0) {
    startValue = data[0].netWealth
    endValue = data[data.length - 1].netWealth
  }

  const growth = endValue - startValue

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
          {/* Property selector dropdown */}
          {properties.length > 0 && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="relative">
                <select
                  value={selectedPropertyId ?? '__all__'}
                  onChange={e => setSelectedPropertyId(e.target.value === '__all__' ? null : e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg px-4 py-2 pr-9 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="__all__">All Assets</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {isPropertyView ? 'Current Equity' : 'Current Net Wealth'}
                </p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(startValue)}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Projected ({projectionSettings.projectionYears}yr)
                </p>
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-400">{formatCurrency(endValue)}</p>
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
          <WealthChart data={data} selectedPropertyId={selectedPropertyId} />

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
                    value={propGrowthInput}
                    onChange={e => setPropGrowthInput(e.target.value)}
                    onBlur={e => {
                      const v = Math.min(30, Math.max(0, parseFloat(e.target.value) || 0))
                      setPropGrowthInput(v.toFixed(1))
                      updateProjectionSettings({ propertyGrowthOverride: v / 100 })
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
                    value={stockGrowthInput}
                    onChange={e => setStockGrowthInput(e.target.value)}
                    onBlur={e => {
                      const v = Math.min(30, Math.max(0, parseFloat(e.target.value) || 0))
                      setStockGrowthInput(v.toFixed(1))
                      updateProjectionSettings({ stockGrowthOverride: v / 100 })
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
