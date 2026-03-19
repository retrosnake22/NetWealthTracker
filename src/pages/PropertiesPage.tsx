import { useState } from 'react'
import { Plus, Trash2, Pencil, Building2, Home, ChevronDown, ChevronUp, BarChart3, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import { PropertyPnL, calculatePropertyPnL } from '@/components/properties/PropertyPnL'
import { PropertyEquityChart } from '@/components/properties/PropertyEquityChart'
import type { Property, PropertyType } from '@/types/models'

interface PropertyForm {
  name: string
  type: PropertyType
  address: string
  currentValue: string
  hasMortgage: boolean
  mortgageBalance: string
  interestRate: string
  repayment: string
  repaymentFrequency: 'weekly' | 'fortnightly' | 'monthly'
  weeklyRent: string
  vacancyRate: string
  councilRatesPA: string
  waterRatesPA: string
  insurancePA: string
  strataPA: string
  propertyManagementPct: string
  landTaxPA: string
  maintenanceBudgetPA: string
}

const emptyForm: PropertyForm = {
  name: '', type: 'primary_residence', address: '', currentValue: '',
  hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
  repaymentFrequency: 'monthly',
  weeklyRent: '', vacancyRate: '3.8', councilRatesPA: '', waterRatesPA: '',
  insurancePA: '', strataPA: '', propertyManagementPct: '8', landTaxPA: '', maintenanceBudgetPA: '',
}

/** Format a cashflow value with parentheses for negatives */
const fmtCost = (v: number) => v < 0 ? `(${formatCurrency(Math.abs(v))})` : formatCurrency(v)

export function PropertiesPage() {
  const {
    properties, liabilities,
    addProperty, updateProperty, removeProperty,
    addLiability, updateLiability, removeLiability,
  } = useFinanceStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null)
  const [form, setForm] = useState<PropertyForm>({ ...emptyForm })
  const [expandedPnL, setExpandedPnL] = useState<Record<string, boolean>>({})
  const [expandedEquity, setExpandedEquity] = useState<Record<string, boolean>>({})

  const resetAndClose = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setDialogOpen(false)
  }

  const openCreate = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (prop: Property) => {
    const mortgage = liabilities.find(l => l.id === prop.mortgageId)
    setEditingId(prop.id)
    setForm({
      name: prop.name,
      type: prop.type,
      address: prop.address ?? '',
      currentValue: String(prop.currentValue),
      hasMortgage: !!mortgage,
      mortgageBalance: mortgage ? String(mortgage.currentBalance) : '',
      interestRate: mortgage ? String((mortgage.interestRatePA * 100).toFixed(2)) : '',
      repayment: mortgage ? String(mortgage.minimumRepayment) : '',
      repaymentFrequency: mortgage?.repaymentFrequency ?? 'monthly',
      weeklyRent: prop.weeklyRent ? String(prop.weeklyRent) : '',
      vacancyRate: prop.vacancyRatePA ? String((prop.vacancyRatePA * 100).toFixed(1)) : '3.8',
      councilRatesPA: prop.councilRatesPA ? String(prop.councilRatesPA) : '',
      waterRatesPA: prop.waterRatesPA ? String(prop.waterRatesPA) : '',
      insurancePA: prop.insurancePA ? String(prop.insurancePA) : '',
      strataPA: prop.strataPA ? String(prop.strataPA) : '',
      propertyManagementPct: prop.propertyManagementPct ? String((prop.propertyManagementPct * 100).toFixed(1)) : '8',
      landTaxPA: prop.landTaxPA ? String(prop.landTaxPA) : '',
      maintenanceBudgetPA: prop.maintenanceBudgetPA ? String(prop.maintenanceBudgetPA) : '',
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    const existingProp = editingId ? properties.find(p => p.id === editingId) : null
    // Expense fields apply to ALL property types
    const expenseFields = {
      councilRatesPA: parseFloat(form.councilRatesPA) || 0,
      waterRatesPA: parseFloat(form.waterRatesPA) || 0,
      insurancePA: parseFloat(form.insurancePA) || 0,
      strataPA: parseFloat(form.strataPA) || 0,
      landTaxPA: parseFloat(form.landTaxPA) || 0,
      maintenanceBudgetPA: parseFloat(form.maintenanceBudgetPA) || 0,
    }

    const propertyData = {
      name: form.name,
      type: form.type,
      address: form.address || undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: existingProp?.growthRatePA ?? 0.07,
      ...expenseFields,
      ...(form.type === 'investment' ? {
        weeklyRent: parseFloat(form.weeklyRent) || 0,
        vacancyRatePA: (parseFloat(form.vacancyRate) || 0) / 100,
        propertyManagementPct: (parseFloat(form.propertyManagementPct) || 0) / 100,
      } : {
        weeklyRent: undefined,
        vacancyRatePA: undefined,
        propertyManagementPct: undefined,
      }),
    }

    const mortgageData = form.hasMortgage ? {
      name: `${form.name} Mortgage`,
      category: 'mortgage' as const,
      currentBalance: parseFloat(form.mortgageBalance) || 0,
      interestRatePA: (parseFloat(form.interestRate) || 0) / 100,
      minimumRepayment: parseFloat(form.repayment) || 0,
      repaymentFrequency: form.repaymentFrequency,
      offsetAccountIds: [] as string[],
    } : null

    if (editingId) {
      // ── UPDATE ──
      const existing = properties.find(p => p.id === editingId)
      const existingMortgage = existing?.mortgageId
        ? liabilities.find(l => l.id === existing.mortgageId)
        : null

      if (mortgageData && existingMortgage) {
        updateLiability(existingMortgage.id, {
          ...mortgageData,
          linkedPropertyId: editingId,
        })
        updateProperty(editingId, { ...propertyData, mortgageId: existingMortgage.id })
      } else if (mortgageData && !existingMortgage) {
        addLiability({ ...mortgageData, linkedPropertyId: editingId })
        const store = useFinanceStore.getState()
        const newMortgageId = store.liabilities[store.liabilities.length - 1]?.id
        updateProperty(editingId, { ...propertyData, mortgageId: newMortgageId })
      } else if (!mortgageData && existingMortgage) {
        removeLiability(existingMortgage.id)
        updateProperty(editingId, { ...propertyData, mortgageId: undefined })
      } else {
        updateProperty(editingId, propertyData)
      }
    } else {
      // ── CREATE ──
      if (mortgageData) {
        addLiability({ ...mortgageData, linkedPropertyId: '' })
        const store = useFinanceStore.getState()
        const mortgageId = store.liabilities[store.liabilities.length - 1]?.id
        addProperty({ ...propertyData, mortgageId })
        const propStore = useFinanceStore.getState()
        const newPropId = propStore.properties[propStore.properties.length - 1]?.id
        if (mortgageId && newPropId) {
          updateLiability(mortgageId, { linkedPropertyId: newPropId })
        }
      } else {
        addProperty(propertyData)
      }
    }

    resetAndClose()
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.mortgageId) removeLiability(deleteTarget.mortgageId)
    removeProperty(deleteTarget.id)
    setDeleteTarget(null)
  }

  const getMortgage = (mortgageId?: string) => liabilities.find(l => l.id === mortgageId)

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0)
  const totalDebt = properties.reduce((s, p) => {
    const m = getMortgage(p.mortgageId)
    return s + (m?.currentBalance ?? 0)
  }, 0)

  const investmentProperties = properties.filter(p => p.type === 'investment')
  const portfolioPnL = investmentProperties.length > 0
    ? investmentProperties.reduce(
        (acc, prop) => {
          const pnl = calculatePropertyPnL(prop, getMortgage(prop.mortgageId))
          return {
            grossRentPA: acc.grossRentPA + pnl.grossRentPA,
            totalExpensesPA: acc.totalExpensesPA + pnl.totalExpensesPA,
            interestPA: acc.interestPA + pnl.interestPA,
            netCashflowPA: acc.netCashflowPA + pnl.netCashflowPA,
            totalValue: acc.totalValue + prop.currentValue,
          }
        },
        { grossRentPA: 0, totalExpensesPA: 0, interestPA: 0, netCashflowPA: 0, totalValue: 0 }
      )
    : null

  const togglePnL = (id: string) =>
    setExpandedPnL(prev => ({ ...prev, [id]: !prev[id] }))

  const toggleEquity = (id: string) =>
    setExpandedEquity(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Property
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-400">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Debt</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-red-400">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-400">{formatCurrency(totalValue - totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Portfolio P&L Summary */}
      {portfolioPnL && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Investment Portfolio Summary</h3>
              <Badge variant="outline" className="ml-auto">{investmentProperties.length} {investmentProperties.length === 1 ? 'property' : 'properties'}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gross Rent</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(portfolioPnL.grossRentPA)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold tabular-nums text-red-400">{formatCurrency(portfolioPnL.totalExpensesPA)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest</p>
                <p className="text-lg font-bold tabular-nums text-red-400">{formatCurrency(portfolioPnL.interestPA)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Cashflow</p>
                <p className={`text-lg font-bold tabular-nums ${portfolioPnL.netCashflowPA >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolioPnL.netCashflowPA < 0 ? `(${formatCurrency(Math.abs(portfolioPnL.netCashflowPA))})` : formatCurrency(portfolioPnL.netCashflowPA)}
                  <span className="text-xs font-normal text-muted-foreground">/yr</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Yield</p>
                <p className={`text-lg font-bold tabular-nums ${portfolioPnL.netCashflowPA >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(portfolioPnL.totalValue > 0 ? portfolioPnL.netCashflowPA / portfolioPnL.totalValue : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property list */}
      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
          <p className="text-muted-foreground mb-4">Add your home, investment properties, and more.</p>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Your First Property</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(prop => {
            const mortgage = getMortgage(prop.mortgageId)
            const equity = prop.currentValue - (mortgage?.currentBalance ?? 0)
            const equityPct = prop.currentValue > 0 ? (equity / prop.currentValue) * 100 : 100
            const lvr = prop.currentValue > 0 && mortgage ? (mortgage.currentBalance / prop.currentValue) * 100 : 0
            const isInvestment = prop.type === 'investment'
            const isPnLExpanded = expandedPnL[prop.id] ?? false
            const isEquityExpanded = expandedEquity[prop.id] ?? false
            const pnl = calculatePropertyPnL(prop, mortgage)
            const cashflowPA = isInvestment ? pnl.netCashflowPA : -(pnl.totalExpensesPA + (pnl.mortgageRepaymentPA > 0 ? pnl.mortgageRepaymentPA : pnl.interestWithoutOffsetPA))
              const monthlyCost = cashflowPA / 12
            const yearlyCost = cashflowPA
            // Only show cashflow badge if there are actual costs (expenses or interest)
            const hasCosts = pnl.totalExpensesPA > 0 || pnl.interestPA > 0 || pnl.mortgageRepaymentPA > 0 || pnl.grossRentPA > 0
            return (
              <div key={prop.id} className="space-y-2">
                <Card className="card-hover group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isInvestment ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                          <h3 className="text-lg font-semibold">{prop.name}</h3>
                          <Badge className={isInvestment
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-400/20'
                          }>
                            {isInvestment ? 'Investment' : 'Primary'}
                          </Badge>
                          {hasCosts && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className={`text-sm font-semibold tabular-nums ${monthlyCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fmtCost(monthlyCost)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                              </span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className={`text-sm font-semibold tabular-nums ${yearlyCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fmtCost(yearlyCost)}<span className="text-xs font-normal text-muted-foreground">/yr</span>
                              </span>
                            </>
                          )}
                        </div>
                        {prop.address && <p className="text-sm text-muted-foreground">{prop.address}</p>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Value</p>
                            <p className="text-xl font-bold tabular-nums">{formatCurrency(prop.currentValue)}</p>
                          </div>
                          {mortgage && (
                            <div>
                              <p className="text-xs text-muted-foreground">Mortgage</p>
                              <p className="text-xl font-bold tabular-nums text-red-400">{formatCurrency(mortgage.currentBalance)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Equity</p>
                            <p className="text-xl font-bold tabular-nums text-blue-400">{formatCurrency(equity)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Equity %</p>
                            <p className="text-lg font-semibold tabular-nums">{equityPct.toFixed(1)}%</p>
                          </div>
                          {isInvestment && prop.weeklyRent && (
                            <div>
                              <p className="text-xs text-muted-foreground">Rent</p>
                              <p className="text-lg font-semibold tabular-nums">{formatCurrency(prop.weeklyRent)}/wk</p>
                            </div>
                          )}
                          {mortgage && (
                            <div>
                              <p className="text-xs text-muted-foreground">Interest Rate</p>
                              <p className="text-lg font-semibold tabular-nums">{((mortgage.interestRatePA ?? 0) * 100).toFixed(2)}% p.a.</p>
                            </div>
                          )}
                          {mortgage && (
                            <div>
                              <p className="text-xs text-muted-foreground">Repayment</p>
                              <p className="text-lg font-semibold tabular-nums">{formatCurrency(mortgage.minimumRepayment)}/{mortgage.repaymentFrequency === 'monthly' ? 'mo' : mortgage.repaymentFrequency === 'fortnightly' ? 'fn' : 'wk'}</p>
                            </div>
                          )}
                        </div>

                        {/* LVR / Equity bar */}
                        {mortgage && prop.currentValue > 0 && (
                          <div className="mt-4 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>LVR: {lvr.toFixed(1)}%</span>
                              <span className={lvr > 80 ? 'text-red-400' : lvr > 60 ? 'text-amber-400' : 'text-emerald-400'}>
                                {lvr > 80 ? 'High LVR' : lvr > 60 ? 'Moderate' : 'Healthy'}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                              <div
                                className={`h-full rounded-l-full transition-all ${lvr > 80 ? 'bg-red-400' : lvr > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(lvr, 100)}%` }}
                              />
                              <div
                                className="h-full bg-blue-500/40 rounded-r-full transition-all"
                                style={{ width: `${Math.max(100 - lvr, 0)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground/60">
                              <span>Debt {lvr.toFixed(0)}%</span>
                              <span>Equity {equityPct.toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(prop)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(prop)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => togglePnL(prop.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {isPnLExpanded ? 'Hide' : 'Show'} {isInvestment ? 'P&L Breakdown' : 'Holding Costs'}
                        {isPnLExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => toggleEquity(prop.id)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        {isEquityExpanded ? 'Hide' : 'Show'} Equity Growth
                        {isEquityExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {isPnLExpanded && (
                  <PropertyPnL property={prop} mortgage={mortgage} />
                )}
                {isEquityExpanded && (
                  <PropertyEquityChart property={prop} mortgage={mortgage} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetAndClose() }}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Property Name</Label>
                <Input placeholder="e.g. Family Home" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v as PropertyType})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary_residence">Primary Residence</SelectItem>
                    <SelectItem value="investment">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="Optional" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div>
                <Label>Current Value (AUD)</Label>
                <CurrencyInput value={form.currentValue} onChange={v => setForm({...form, currentValue: v})} />
              </div>

              <Separator />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasMortgage" checked={form.hasMortgage} onChange={e => setForm({...form, hasMortgage: e.target.checked})} className="rounded" />
                <Label htmlFor="hasMortgage">Has Mortgage</Label>
              </div>

              {form.hasMortgage && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  <div>
                    <Label>Mortgage Balance (AUD)</Label>
                    <CurrencyInput value={form.mortgageBalance} onChange={v => setForm({...form, mortgageBalance: v})} />
                  </div>
                  <div>
                    <Label>Interest Rate (% p.a.)</Label>
                    <Input type="number" step="0.01" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Repayment Amount</Label>
                      <CurrencyInput value={form.repayment} onChange={v => setForm({...form, repayment: v})} />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Select value={form.repaymentFrequency} onValueChange={(v) => setForm({...form, repaymentFrequency: v as 'weekly' | 'fortnightly' | 'monthly'})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense fields — shown for ALL property types */}
              <Separator />
              <p className="text-sm font-semibold">
                {form.type === 'investment' ? 'Investment Details' : 'Property Expenses'}
              </p>

              {form.type === 'investment' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Weekly Rent (AUD)</Label>
                    <CurrencyInput value={form.weeklyRent} onChange={v => setForm({...form, weeklyRent: v})} />
                  </div>
                  <div>
                    <Label>Vacancy Rate (% p.a.)</Label>
                    <Input type="number" step="0.1" value={form.vacancyRate} onChange={e => setForm({...form, vacancyRate: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Council Rates (p.a.)</Label>
                  <CurrencyInput value={form.councilRatesPA} onChange={v => setForm({...form, councilRatesPA: v})} />
                </div>
                <div>
                  <Label>Water Rates (p.a.)</Label>
                  <CurrencyInput value={form.waterRatesPA} onChange={v => setForm({...form, waterRatesPA: v})} />
                </div>
                <div>
                  <Label>Insurance (p.a.)</Label>
                  <CurrencyInput value={form.insurancePA} onChange={v => setForm({...form, insurancePA: v})} />
                </div>
                <div>
                  <Label>Strata (p.a.)</Label>
                  <CurrencyInput value={form.strataPA} onChange={v => setForm({...form, strataPA: v})} />
                </div>
                {form.type === 'investment' && (
                  <div>
                    <Label>Management Fee (%)</Label>
                    <Input type="number" step="0.1" value={form.propertyManagementPct} onChange={e => setForm({...form, propertyManagementPct: e.target.value})} />
                  </div>
                )}
                <div>
                  <Label>Land Tax (p.a.)</Label>
                  <CurrencyInput value={form.landTaxPA} onChange={v => setForm({...form, landTaxPA: v})} />
                </div>
                <div>
                  <Label>Maintenance (p.a.)</Label>
                  <CurrencyInput value={form.maintenanceBudgetPA} onChange={v => setForm({...form, maintenanceBudgetPA: v})} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={!form.name || !form.currentValue}>
              {editingId ? 'Save Changes' : 'Add Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this property{deleteTarget?.mortgageId ? ' and its linked mortgage' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
