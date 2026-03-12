import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ExternalLink, Car } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory, Property } from '@/types/models'

interface AutoExpenseItem {
  key: string
  propertyName: string
  label: string
  category: ExpenseCategory
  monthlyAmount: number
}

export function FixedExpensesPage() {
  const { properties, liabilities, expenseBudgets } = useFinanceStore()

  // Clean up orphaned vehicle expenses on mount
  useEffect(() => {
    const state = useFinanceStore.getState()
    const assetIds = new Set(state.assets.map(a => a.id))
    const liabilityNames = new Set(state.liabilities.map(l => l.name))

    for (const b of state.expenseBudgets) {
      // Remove if linked asset no longer exists
      if (b.linkedAssetId && !assetIds.has(b.linkedAssetId)) {
        state.removeExpenseBudget(b.id)
        continue
      }
      // Remove vehicle loan/lease expenses whose liability no longer exists
      if (b.label.endsWith('Car Loan Repayment')) {
        const loanName = b.label.replace(' Repayment', '')
        if (!liabilityNames.has(loanName)) {
          state.removeExpenseBudget(b.id)
          continue
        }
      }
      if (b.label.endsWith('Lease Payment')) {
        const leaseName = b.label.replace(' Payment', '')
        if (!liabilityNames.has(leaseName)) {
          state.removeExpenseBudget(b.id)
          continue
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generated property expenses
  const autoPropertyExpenses = useMemo<AutoExpenseItem[]>(() => {
    const items: AutoExpenseItem[] = []
    for (const prop of properties as Property[]) {
      if (prop.mortgageId) {
        const lia = liabilities.find(l => l.id === prop.mortgageId)
        if (lia && lia.minimumRepayment > 0) {
          items.push({ key: `${prop.id}-mortgage`, propertyName: prop.name, label: 'Mortgage', category: 'mortgage_repayment', monthlyAmount: lia.minimumRepayment })
        }
      }
      if (prop.councilRatesPA && prop.councilRatesPA > 0)
        items.push({ key: `${prop.id}-council`, propertyName: prop.name, label: 'Council Rates', category: 'council_rates', monthlyAmount: prop.councilRatesPA / 12 })
      if (prop.waterRatesPA && prop.waterRatesPA > 0)
        items.push({ key: `${prop.id}-water`, propertyName: prop.name, label: 'Water Rates', category: 'water_rates', monthlyAmount: prop.waterRatesPA / 12 })
      if (prop.insurancePA && prop.insurancePA > 0)
        items.push({ key: `${prop.id}-insurance`, propertyName: prop.name, label: 'Insurance', category: 'building_insurance', monthlyAmount: prop.insurancePA / 12 })
      if (prop.strataPA && prop.strataPA > 0)
        items.push({ key: `${prop.id}-strata`, propertyName: prop.name, label: 'Strata', category: 'strata', monthlyAmount: prop.strataPA / 12 })
      if (prop.weeklyRent && prop.weeklyRent > 0 && prop.propertyManagementPct && prop.propertyManagementPct > 0) {
        const monthly = (prop.weeklyRent * 52 * prop.propertyManagementPct) / 100 / 12
        if (monthly > 0) items.push({ key: `${prop.id}-mgmt`, propertyName: prop.name, label: 'Property Management', category: 'property_management', monthlyAmount: monthly })
      }
      if (prop.landTaxPA && prop.landTaxPA > 0)
        items.push({ key: `${prop.id}-landtax`, propertyName: prop.name, label: 'Land Tax', category: 'land_tax', monthlyAmount: prop.landTaxPA / 12 })
      if (prop.maintenanceBudgetPA && prop.maintenanceBudgetPA > 0)
        items.push({ key: `${prop.id}-maintenance`, propertyName: prop.name, label: 'Maintenance', category: 'maintenance', monthlyAmount: prop.maintenanceBudgetPA / 12 })
    }
    return items
  }, [properties, liabilities])

  // Auto-generated vehicle expenses
  const autoVehicleExpenses = useMemo(() => {
    return expenseBudgets.filter(b =>
      b.linkedAssetId ||
      b.label.endsWith('Car Loan Repayment') ||
      b.label.endsWith('Lease Payment')
    )
  }, [expenseBudgets])

  const vehicleExpenseTotal = useMemo(() =>
    autoVehicleExpenses.reduce((s, b) => s + b.monthlyBudget, 0),
    [autoVehicleExpenses]
  )

  const propertyTotal = autoPropertyExpenses.reduce((s, e) => s + e.monthlyAmount, 0)
  const totalMonthly = propertyTotal + vehicleExpenseTotal

  // Group by property
  const autoByProperty = useMemo(() => {
    const map = new Map<string, AutoExpenseItem[]>()
    for (const item of autoPropertyExpenses) {
      const arr = map.get(item.propertyName) ?? []
      arr.push(item)
      map.set(item.propertyName, arr)
    }
    return Array.from(map.entries()).map(([name, items]) => ({
      name, items, total: items.reduce((s, i) => s + i.monthlyAmount, 0),
    }))
  }, [autoPropertyExpenses])

  const hasAnyExpenses = autoPropertyExpenses.length > 0 || autoVehicleExpenses.length > 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Fixed Monthly</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-red-400">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalMonthly * 12)}/year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Properties</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{autoByProperty.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{autoPropertyExpenses.length} expense line{autoPropertyExpenses.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vehicles</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{autoVehicleExpenses.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(vehicleExpenseTotal)}/mo</p>
          </CardContent>
        </Card>
      </div>

      {!hasAnyExpenses ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No fixed expenses yet</h3>
          <p className="text-muted-foreground mb-4">
            Fixed expenses are automatically generated from your property and vehicle data.
          </p>
          <Link
            to="/assets?category=property"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to Properties <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Property Expenses */}
          {autoPropertyExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Property Expenses</h2>
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted-foreground/30">
                  🔗 Auto-generated
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">
                These expenses flow automatically from your property and liability data. To edit them, update the source property.
              </p>

              {autoByProperty.map(({ name, items, total: propTotal }) => (
                <Card key={name} className="bg-muted/30 border-dashed">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{name}</p>
                          <p className="text-xs text-muted-foreground">{items.length} expense{items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">{formatCurrency(propTotal)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(propTotal * 12)}/yr</p>
                      </div>
                    </div>
                    <div className="border-t border-border/50">
                      {items.map((item, idx) => (
                        <div
                          key={item.key}
                          className={`flex items-center gap-4 px-5 py-3 pl-12 ${idx !== items.length - 1 ? 'border-b border-border/30' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {item.label}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(item.monthlyAmount)}</span>
                            <span className="text-xs text-muted-foreground ml-1">/mo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vehicle Expenses */}
          {autoVehicleExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Vehicle Expenses</h2>
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted-foreground/30">
                  🔗 Auto-generated
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">
                These expenses are auto-generated from your vehicle financing setup. Edit them in Assets → Vehicles.
              </p>
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-0">
                  {autoVehicleExpenses.map((expense, idx) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between px-5 py-3.5 ${
                        idx !== autoVehicleExpenses.length - 1 ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{expense.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.label.includes('Lease') ? 'Lease' : 'Car Loan'} · Transport
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(expense.monthlyBudget)}</span>
                        <span className="text-xs text-muted-foreground ml-1">/mo</span>
                      </div>
                    </div>
                  ))}
                  {autoVehicleExpenses.length > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
                      <span className="text-sm font-medium text-muted-foreground">Total Vehicle Expenses</span>
                      <div>
                        <span className="text-sm font-bold tabular-nums">{formatCurrency(vehicleExpenseTotal)}</span>
                        <span className="text-xs text-muted-foreground ml-1">/mo</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
