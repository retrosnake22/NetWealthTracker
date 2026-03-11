import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseCategory, Property } from '@/types/models'

const CATEGORY_LABELS: Record<string, string> = {
  mortgage_repayment: 'Mortgage Repayment',
  council_rates: 'Council Rates',
  water_rates: 'Water Rates',
  strata: 'Strata',
  property_management: 'Property Management',
  land_tax: 'Land Tax',
  maintenance: 'Maintenance',
  building_insurance: 'Building / Landlord Insurance',
}

interface AutoExpenseItem {
  key: string
  propertyName: string
  label: string
  category: ExpenseCategory
  monthlyAmount: number
}

export function FixedExpensesPage() {
  const { properties, liabilities } = useFinanceStore()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

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

  const totalMonthly = autoPropertyExpenses.reduce((s, e) => s + e.monthlyAmount, 0)

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

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {autoPropertyExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No fixed expenses yet</h3>
          <p className="text-muted-foreground mb-4">
            Fixed expenses are automatically generated from your property data — mortgages, council rates, insurance, strata, and more.
          </p>
          <Link
            to="/assets?category=property"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to Properties <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
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
                <button
                  onClick={() => toggleGroup(name)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {collapsedGroups.has(name)
                      ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                    <div className="text-left">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{items.length} expense{items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(propTotal)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(propTotal * 12)}/yr</p>
                  </div>
                </button>
                {!collapsedGroups.has(name) && (
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
