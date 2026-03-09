import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { PropertyType } from '@/types/models'

export function PropertiesPage() {
  const { properties, liabilities, addProperty, addLiability, updateProperty, removeProperty, removeLiability } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'primary_residence' as PropertyType, address: '',
    currentValue: '', growthRatePA: '7',
    // Mortgage
    hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
    repaymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
    // Investment
    weeklyRent: '', vacancyRate: '3.8',
    councilRatesPA: '', waterRatesPA: '', insurancePA: '',
    strataPA: '', propertyManagementPct: '8', landTaxPA: '', maintenanceBudgetPA: '',
  })

  const resetForm = () => {
    setForm({
      name: '', type: 'primary_residence', address: '', currentValue: '', growthRatePA: '7',
      hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
      repaymentFrequency: 'monthly',
      weeklyRent: '', vacancyRate: '3.8', councilRatesPA: '', waterRatesPA: '',
      insurancePA: '', strataPA: '', propertyManagementPct: '8', landTaxPA: '', maintenanceBudgetPA: '',
    })
  }

  const handleSave = () => {
    let mortgageId: string | undefined
    if (form.hasMortgage) {
      const tempId = crypto.randomUUID()
      addLiability({
        name: `${form.name} Mortgage`,
        category: 'mortgage',
        currentBalance: parseFloat(form.mortgageBalance) || 0,
        interestRatePA: (parseFloat(form.interestRate) || 0) / 100,
        minimumRepayment: parseFloat(form.repayment) || 0,
        repaymentFrequency: form.repaymentFrequency,
        linkedPropertyId: tempId,
        offsetAccountIds: [],
      })
      // Get the just-added mortgage
      const store = useFinanceStore.getState()
      mortgageId = store.liabilities[store.liabilities.length - 1]?.id
    }

    addProperty({
      name: form.name,
      type: form.type,
      address: form.address || undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 7) / 100,
      mortgageId,
      ...(form.type === 'investment' ? {
        weeklyRent: parseFloat(form.weeklyRent) || 0,
        vacancyRatePA: (parseFloat(form.vacancyRate) || 0) / 100,
        councilRatesPA: parseFloat(form.councilRatesPA) || 0,
        waterRatesPA: parseFloat(form.waterRatesPA) || 0,
        insurancePA: parseFloat(form.insurancePA) || 0,
        strataPA: parseFloat(form.strataPA) || 0,
        propertyManagementPct: (parseFloat(form.propertyManagementPct) || 0) / 100,
        landTaxPA: parseFloat(form.landTaxPA) || 0,
        maintenanceBudgetPA: parseFloat(form.maintenanceBudgetPA) || 0,
      } : {}),
    })

    resetForm()
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    const prop = properties.find(p => p.id === id)
    if (prop?.mortgageId) removeLiability(prop.mortgageId)
    removeProperty(id)
  }

  const getMortgage = (mortgageId?: string) => liabilities.find(l => l.id === mortgageId)

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0)
  const totalDebt = properties.reduce((s, p) => {
    const m = getMortgage(p.mortgageId)
    return s + (m?.currentBalance ?? 0)
  }, 0)

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your property portfolio</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Property</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Value (AUD)</Label>
                    <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} />
                  </div>
                  <div>
                    <Label>Growth Rate (% p.a.)</Label>
                    <Input type="number" step="0.1" value={form.growthRatePA} onChange={e => setForm({...form, growthRatePA: e.target.value})} />
                  </div>
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
                      <Input type="number" value={form.mortgageBalance} onChange={e => setForm({...form, mortgageBalance: e.target.value})} />
                    </div>
                    <div>
                      <Label>Interest Rate (% p.a.)</Label>
                      <Input type="number" step="0.01" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Repayment Amount</Label>
                        <Input type="number" value={form.repayment} onChange={e => setForm({...form, repayment: e.target.value})} />
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Select value={form.repaymentFrequency} onValueChange={(v: any) => setForm({...form, repaymentFrequency: v})}>
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

                {form.type === 'investment' && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold">Investment Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Weekly Rent (AUD)</Label>
                        <Input type="number" value={form.weeklyRent} onChange={e => setForm({...form, weeklyRent: e.target.value})} />
                      </div>
                      <div>
                        <Label>Vacancy Rate (% p.a.)</Label>
                        <Input type="number" step="0.1" value={form.vacancyRate} onChange={e => setForm({...form, vacancyRate: e.target.value})} />
                      </div>
                      <div>
                        <Label>Council Rates (p.a.)</Label>
                        <Input type="number" value={form.councilRatesPA} onChange={e => setForm({...form, councilRatesPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Water Rates (p.a.)</Label>
                        <Input type="number" value={form.waterRatesPA} onChange={e => setForm({...form, waterRatesPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Insurance (p.a.)</Label>
                        <Input type="number" value={form.insurancePA} onChange={e => setForm({...form, insurancePA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Strata (p.a.)</Label>
                        <Input type="number" value={form.strataPA} onChange={e => setForm({...form, strataPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Management Fee (%)</Label>
                        <Input type="number" step="0.1" value={form.propertyManagementPct} onChange={e => setForm({...form, propertyManagementPct: e.target.value})} />
                      </div>
                      <div>
                        <Label>Land Tax (p.a.)</Label>
                        <Input type="number" value={form.landTaxPA} onChange={e => setForm({...form, landTaxPA: e.target.value})} />
                      </div>
                      <div>
                        <Label>Maintenance (p.a.)</Label>
                        <Input type="number" value={form.maintenanceBudgetPA} onChange={e => setForm({...form, maintenanceBudgetPA: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.currentValue}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Debt</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue - totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
          <p className="text-muted-foreground">Add your home, investment properties, and more.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(prop => {
            const mortgage = getMortgage(prop.mortgageId)
            const equity = prop.currentValue - (mortgage?.currentBalance ?? 0)
            return (
              <Card key={prop.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {prop.type === 'investment' ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                        <h3 className="text-lg font-semibold">{prop.name}</h3>
                        <Badge variant={prop.type === 'investment' ? 'default' : 'secondary'}>
                          {prop.type === 'investment' ? 'Investment' : 'Primary'}
                        </Badge>
                      </div>
                      {prop.address && <p className="text-sm text-muted-foreground">{prop.address}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Value</p>
                          <p className="font-semibold">{formatCurrency(prop.currentValue)}</p>
                        </div>
                        {mortgage && (
                          <div>
                            <p className="text-xs text-muted-foreground">Mortgage</p>
                            <p className="font-semibold text-red-500">{formatCurrency(mortgage.currentBalance)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Equity</p>
                          <p className="font-semibold text-emerald-500">{formatCurrency(equity)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Growth</p>
                          <p className="font-semibold">{formatPercent(prop.growthRatePA)} p.a.</p>
                        </div>
                        {prop.type === 'investment' && prop.weeklyRent && (
                          <div>
                            <p className="text-xs text-muted-foreground">Rent</p>
                            <p className="font-semibold">{formatCurrency(prop.weeklyRent)}/wk</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(prop.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
