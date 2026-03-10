import { useState } from 'react'
import { Plus, Trash2, LineChart, PiggyBank, TrendingUp } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { WealthChart } from '@/components/dashboard/WealthChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatPercent } from '@/lib/format'
import { projectNetWealth, calculateMonthlyCashflow } from '@/lib/calculations'
import type { SurplusAllocation } from '@/types/models'

export function ProjectionsPage() {
  const {
    assets, properties, liabilities, incomes, expenseBudgets,
    projectionSettings, updateProjectionSettings, setSurplusAllocations
  } = useFinanceStore()

  const [newAlloc, setNewAlloc] = useState({ targetId: '', percentage: '20' })

  const monthlySurplus = calculateMonthlyCashflow(incomes, expenseBudgets, properties, liabilities)
  const allocations = projectionSettings.surplusAllocations

  // Build target options from assets + liabilities
  const targetOptions: { id: string; name: string; type: 'asset' | 'liability'; label: string }[] = [
    ...assets.map(a => ({ id: a.id, name: a.name, type: 'asset' as const, label: `📈 ${a.name}` })),
    ...properties.map(p => ({ id: p.id, name: p.name, type: 'asset' as const, label: `🏠 ${p.name}` })),
    ...liabilities.map(l => ({ id: l.id, name: l.name, type: 'liability' as const, label: `💳 ${l.name}` })),
  ]

  // Filter out already-allocated targets
  const allocatedIds = new Set(allocations.map(a => a.targetId))
  const availableTargets = targetOptions.filter(t => !allocatedIds.has(t.id))

  const totalAllocated = allocations.reduce((s, a) => s + a.percentage, 0)

  const handleAddAllocation = () => {
    const target = targetOptions.find(t => t.id === newAlloc.targetId)
    if (!target) return
    const pct = Math.min(parseFloat(newAlloc.percentage) || 0, (1 - totalAllocated) * 100) / 100
    if (pct <= 0) return

    const updated: SurplusAllocation[] = [
      ...allocations,
      { targetId: target.id, targetType: target.type, targetName: target.name, percentage: pct }
    ]
    setSurplusAllocations(updated)
    setNewAlloc({ targetId: '', percentage: '20' })
  }

  const handleRemoveAllocation = (targetId: string) => {
    setSurplusAllocations(allocations.filter(a => a.targetId !== targetId))
  }

  const handlePercentageChange = (targetId: string, newPct: number) => {
    const otherTotal = allocations.filter(a => a.targetId !== targetId).reduce((s, a) => s + a.percentage, 0)
    const clamped = Math.min(Math.max(0, newPct / 100), 1 - otherTotal)
    setSurplusAllocations(allocations.map(a =>
      a.targetId === targetId ? { ...a, percentage: clamped } : a
    ))
  }

  const data = projectNetWealth(
    assets, properties, liabilities, incomes, expenseBudgets,
    allocations,
    projectionSettings.projectionYears,
    projectionSettings.propertyGrowthOverride,
    projectionSettings.stockGrowthOverride
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
                <p className={`text-2xl font-bold ${growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
                    value={projectionSettings.propertyGrowthOverride !== undefined ? (projectionSettings.propertyGrowthOverride * 100).toFixed(1) : ''}
                    placeholder="Per-asset default"
                    onChange={e => {
                      const val = e.target.value
                      if (val === '') {
                        updateProjectionSettings({ propertyGrowthOverride: undefined })
                      } else {
                        updateProjectionSettings({ propertyGrowthOverride: parseFloat(val) / 100 })
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank to use each property's own rate</p>
                </div>
                <div>
                  <Label>Stock / Super Growth (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={30}
                    value={projectionSettings.stockGrowthOverride !== undefined ? (projectionSettings.stockGrowthOverride * 100).toFixed(1) : ''}
                    placeholder="Per-asset default"
                    onChange={e => {
                      const val = e.target.value
                      if (val === '') {
                        updateProjectionSettings({ stockGrowthOverride: undefined })
                      } else {
                        updateProjectionSettings({ stockGrowthOverride: parseFloat(val) / 100 })
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank to use each asset's own rate</p>
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

          {/* Surplus Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Surplus Allocation
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your monthly surplus is{' '}
                <span className={monthlySurplus >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                  {formatCurrency(monthlySurplus)}
                </span>
                . Decide where extra cash goes each month.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Current allocations */}
              {allocations.length > 0 ? (
                <div className="space-y-3">
                  {allocations.map(alloc => {
                    const isLiability = alloc.targetType === 'liability'
                    return (
                      <div key={alloc.targetId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{alloc.targetName}</p>
                            <Badge className={isLiability
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }>
                              {isLiability ? 'Pay Down' : 'Invest'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(monthlySurplus * alloc.percentage)}/mo
                          </p>
                        </div>

                        {/* Percentage slider + input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(alloc.percentage * 100)}
                            onChange={e => handlePercentageChange(alloc.targetId, parseInt(e.target.value))}
                            className="w-24 accent-emerald-500"
                          />
                          <div className="w-16">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={Math.round(alloc.percentage * 100)}
                              onChange={e => handlePercentageChange(alloc.targetId, parseInt(e.target.value) || 0)}
                              className="h-8 text-center text-sm"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>

                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleRemoveAllocation(alloc.targetId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )
                  })}

                  {/* Total bar */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total Allocated</span>
                    <span className={`text-sm font-bold ${totalAllocated > 1 ? 'text-red-500' : totalAllocated === 1 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {formatPercent(totalAllocated)}
                    </span>
                  </div>
                  {totalAllocated < 1 && (
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(1 - totalAllocated)} of surplus ({formatCurrency(monthlySurplus * (1 - totalAllocated))}/mo) is unallocated and won't be invested.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No allocations yet. Your surplus isn't being invested in the projection.
                </div>
              )}

              {/* Add new allocation */}
              {availableTargets.length > 0 && totalAllocated < 1 && (
                <div className="flex items-end gap-3 pt-2">
                  <div className="flex-1">
                    <Label className="text-xs">Target</Label>
                    <Select value={newAlloc.targetId} onValueChange={v => setNewAlloc({ ...newAlloc, targetId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset or liability..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargets.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">%</Label>
                    <Input
                      type="number"
                      min={1}
                      max={Math.round((1 - totalAllocated) * 100)}
                      value={newAlloc.percentage}
                      onChange={e => setNewAlloc({ ...newAlloc, percentage: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddAllocation} disabled={!newAlloc.targetId}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
