import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import { ExpenseActualsView } from '@/components/ExpenseActualsView'
import type { ExpenseBudget, ExpenseCategory, Property } from '@/types/models'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  security: 'Security', home_improvements: 'Home Improvements / Renovations',
  repairs_maintenance: 'Repairs & Maintenance', gardening: 'Gardening', home_insurance: 'Home Insurance',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  insurance_other: 'Other Insurance',
  electricity: 'Electricity', water: 'Water', rates: 'Rates',
  groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  medical: 'Medical', pharmacy: 'Pharmacy', pet_expenses: 'Pet Costs', school_costs: 'School Costs',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', accounting_fees: 'Accounting Fees', other: 'Other',
}

const SUPER_CATEGORIES: { label: string; icon: string; color: string; categories: ExpenseCategory[] }[] = [
  { label: 'Property', icon: '🏠', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', categories: ['mortgage_repayment', 'council_rates', 'water_rates', 'strata', 'property_management', 'land_tax', 'maintenance', 'building_insurance'] },
  { label: 'Housing', icon: '🏡', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', categories: ['rent', 'electricity', 'water', 'rates', 'security', 'home_improvements', 'repairs_maintenance', 'gardening'] },
  { label: 'Insurance', icon: '🛡️', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', categories: ['insurance_health', 'insurance_car', 'insurance_life', 'home_insurance', 'insurance_other'] },
  { label: 'Living', icon: '🛒', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing', 'medical', 'pharmacy', 'pet_expenses', 'school_costs'] },
  { label: 'Lifestyle', icon: '✨', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', categories: ['hecs_repayment', 'tax', 'accounting_fees', 'other'] },
]

interface AutoExpenseItem {
  key: string
  propertyName: string
  label: string
  category: ExpenseCategory
  monthlyAmount: number
}

export function ExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget, properties, liabilities } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseBudget | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    label: '', category: 'groceries' as ExpenseCategory, monthlyBudget: '',
  })

  const resetForm = () => { setForm({ label: '', category: 'groceries', monthlyBudget: '' }); setEditId(null) }

  const handleSave = () => {
    const data = {
      label: form.label || CATEGORY_LABELS[form.category],
      category: form.category,
      monthlyBudget: parseFloat(form.monthlyBudget) || 0,
    }
    if (editId) updateExpenseBudget(editId, data)
    else addExpenseBudget(data)
    resetForm(); setOpen(false)
  }

  const handleEdit = (id: string) => {
    const item = expenseBudgets.find(b => b.id === id)
    if (!item) return
    setForm({ label: item.label, category: item.category, monthlyBudget: String(item.monthlyBudget) })
    setEditId(id); setOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeExpenseBudget(deleteTarget.id)
    setDeleteTarget(null)
  }

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

  const autoPropertyTotal = autoPropertyExpenses.reduce((s, e) => s + e.monthlyAmount, 0)
  const manualTotal = expenseBudgets.reduce((s, b) => s + b.monthlyBudget, 0)
  const total = manualTotal + autoPropertyTotal

  // Group manual expenses by super-category
  const groupedExpenses = SUPER_CATEGORIES.map(group => {
    const items = expenseBudgets.filter(b => group.categories.includes(b.category))
    const groupTotal = items.reduce((s, b) => s + b.monthlyBudget, 0)
    return { ...group, items, groupTotal }
  }).filter(g => g.items.length > 0)

  // Group auto expenses by property
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

  // Find the color for a category
  const getCategoryColor = (category: ExpenseCategory) => {
    const group = SUPER_CATEGORIES.find(g => g.categories.includes(category))
    return group?.color ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <Tabs defaultValue="budget" className="space-y-6">
      <TabsList className="h-10">
        <TabsTrigger value="budget" className="px-4">Budget</TabsTrigger>
        <TabsTrigger value="actuals" className="px-4">Actuals</TabsTrigger>
      </TabsList>

      <TabsContent value="actuals">
        <ExpenseActualsView />
      </TabsContent>

      <TabsContent value="budget">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as ExpenseCategory, label: form.label || CATEGORY_LABELS[v as ExpenseCategory]})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPER_CATEGORIES.map(group => (
                      <div key={group.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.icon} {group.label}</div>
                        {group.categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Label</Label><Input placeholder={CATEGORY_LABELS[form.category]} value={form.label} onChange={e => setForm({...form, label: e.target.value})} /></div>
              <div><Label>Monthly Amount ($)</Label><CurrencyInput value={form.monthlyBudget} onChange={v => setForm({...form, monthlyBudget: v})} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.monthlyBudget}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Monthly</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-red-400">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(total * 12)}/year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Daily Living</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(manualTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(manualTotal * 12)}/year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Property Expenses</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(autoPropertyTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(autoPropertyTotal * 12)}/year</p>
          </CardContent>
        </Card>
      </div>

      {expenseBudgets.length === 0 && autoPropertyExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4">Add your monthly expenses to track your spending.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Expense</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Auto property expenses */}
          {autoByProperty.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">Property Expenses</h2>
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted-foreground/30">
                  🔗 Auto
                </Badge>
              </div>
              {autoByProperty.map(({ name, items, total: propTotal }) => (
                <Card key={name} className="bg-muted/30 border-dashed">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleGroup(`__auto_${name}__`)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {collapsedGroups.has(`__auto_${name}__`)
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
                    {!collapsedGroups.has(`__auto_${name}__`) && (
                      <div className="border-t border-border/50">
                        {items.map((item, idx) => (
                          <div
                            key={item.key}
                            className={`flex items-center gap-4 px-5 py-3 pl-12 ${idx !== items.length - 1 ? 'border-b border-border/30' : ''}`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                                {item.label}
                              </Badge>
                            </div>
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(item.monthlyAmount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Manual expense groups */}
          {groupedExpenses.length > 0 && (
            <div className="space-y-3">
              {autoByProperty.length > 0 && (
                <h2 className="text-base font-semibold">Daily Living Expenses</h2>
              )}
              {groupedExpenses.map(group => {
                const collapsed = collapsedGroups.has(group.label)
                return (
                  <Card key={group.label}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleGroup(group.label)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {collapsed
                            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          }
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{group.icon}</span>
                              <span className="font-semibold">{group.label}</span>
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{group.items.length}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums">{formatCurrency(group.groupTotal)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                          <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(group.groupTotal * 12)}/yr</p>
                        </div>
                      </button>
                      {!collapsed && (
                        <div className="border-t border-border/50">
                          {group.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-4 px-5 py-3.5 pl-12 hover:bg-muted/30 transition-colors group ${idx !== group.items.length - 1 ? 'border-b border-border/30' : ''}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="text-sm font-medium truncate">{item.label}</span>
                                {item.label !== CATEGORY_LABELS[item.category] && (
                                  <span className="text-xs text-muted-foreground hidden sm:inline">({CATEGORY_LABELS[item.category]})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.monthlyBudget)}</span>
                                  <span className="text-xs text-muted-foreground ml-0.5">/mo</span>
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item.id)}>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(item)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this expense. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TabsContent>
    </Tabs>
  )
}
