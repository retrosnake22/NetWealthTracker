import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { ExpenseBudget, ExpenseCategory, Property } from '@/types/models'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
  property_management: 'Property Management', land_tax: 'Land Tax',
  maintenance: 'Maintenance', building_insurance: 'Building / Landlord Insurance',
  insurance_home: 'Home Insurance', insurance_health: 'Health Insurance',
  insurance_car: 'Car Insurance', insurance_life: 'Life Insurance',
  utilities: 'Utilities', groceries: 'Groceries', transport: 'Transport', fuel: 'Fuel',
  subscriptions: 'Subscriptions', entertainment: 'Entertainment', dining_out: 'Dining Out',
  clothing: 'Clothing', health_fitness: 'Health & Fitness', education: 'Education',
  childcare: 'Childcare', pet_expenses: 'Pet Expenses', phone_internet: 'Phone & Internet',
  personal_care: 'Personal Care', gifts_donations: 'Gifts & Donations',
  hecs_repayment: 'HECS Repayment', tax: 'Tax', other: 'Other',
}

const EXPENSE_GROUP_COLORS: Record<string, string> = {
  mortgage_repayment: 'bg-red-500/10 text-red-500 border-red-500/20',
  rent: 'bg-red-500/10 text-red-500 border-red-500/20',
  council_rates: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  water_rates: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  strata: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  property_management: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  land_tax: 'bg-amber-600/10 text-amber-600 border-amber-600/20',
  maintenance: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  building_insurance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  insurance_home: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  insurance_health: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  insurance_car: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  insurance_life: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  utilities: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  groceries: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  transport: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fuel: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  subscriptions: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  entertainment: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  dining_out: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  clothing: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
  health_fitness: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  education: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  childcare: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  pet_expenses: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  phone_internet: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  personal_care: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  gifts_donations: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  hecs_repayment: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  tax: 'bg-red-500/10 text-red-500 border-red-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

// Super-categories for grouping
const SUPER_CATEGORIES: { label: string; icon: string; categories: ExpenseCategory[] }[] = [
  {
    label: 'Property',
    icon: '🏠',
    categories: ['mortgage_repayment', 'council_rates', 'water_rates', 'strata', 'property_management', 'land_tax', 'maintenance', 'building_insurance'],
  },
  {
    label: 'Housing',
    icon: '🏡',
    categories: ['rent', 'utilities'],
  },
  {
    label: 'Insurance',
    icon: '🛡️',
    categories: ['insurance_home', 'insurance_health', 'insurance_car', 'insurance_life'],
  },
  {
    label: 'Living',
    icon: '🛒',
    categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing'],
  },
  {
    label: 'Lifestyle',
    icon: '✨',
    categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'pet_expenses', 'gifts_donations'],
  },
  {
    label: 'Financial',
    icon: '💰',
    categories: ['hecs_repayment', 'tax', 'other'],
  },
]

// Auto-generated property expense item type
interface AutoPropertyExpenseItem {
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

  // Auto-generated property expense cards derived from property data
  const autoPropertyExpenses = useMemo<AutoPropertyExpenseItem[]>(() => {
    const items: AutoPropertyExpenseItem[] = []
    for (const prop of properties as Property[]) {
      // Mortgage repayment from linked liability
      if (prop.mortgageId) {
        const liability = liabilities.find(l => l.id === prop.mortgageId)
        if (liability && liability.minimumRepayment > 0) {
          items.push({
            key: `${prop.id}-mortgage`,
            propertyName: prop.name,
            label: `${prop.name} — Mortgage`,
            category: 'mortgage_repayment',
            monthlyAmount: liability.minimumRepayment,
          })
        }
      }
      // Council rates
      if (prop.councilRatesPA && prop.councilRatesPA > 0) {
        items.push({
          key: `${prop.id}-council`,
          propertyName: prop.name,
          label: `${prop.name} — Council Rates`,
          category: 'council_rates',
          monthlyAmount: prop.councilRatesPA / 12,
        })
      }
      // Water rates
      if (prop.waterRatesPA && prop.waterRatesPA > 0) {
        items.push({
          key: `${prop.id}-water`,
          propertyName: prop.name,
          label: `${prop.name} — Water Rates`,
          category: 'water_rates',
          monthlyAmount: prop.waterRatesPA / 12,
        })
      }
      // Building / Landlord Insurance
      if (prop.insurancePA && prop.insurancePA > 0) {
        items.push({
          key: `${prop.id}-insurance`,
          propertyName: prop.name,
          label: `${prop.name} — Insurance`,
          category: 'building_insurance',
          monthlyAmount: prop.insurancePA / 12,
        })
      }
      // Strata
      if (prop.strataPA && prop.strataPA > 0) {
        items.push({
          key: `${prop.id}-strata`,
          propertyName: prop.name,
          label: `${prop.name} — Strata`,
          category: 'strata',
          monthlyAmount: prop.strataPA / 12,
        })
      }
      // Property management
      if (prop.weeklyRent && prop.weeklyRent > 0 && prop.propertyManagementPct && prop.propertyManagementPct > 0) {
        const monthly = (prop.weeklyRent * 52 * prop.propertyManagementPct) / 100 / 12
        if (monthly > 0) {
          items.push({
            key: `${prop.id}-mgmt`,
            propertyName: prop.name,
            label: `${prop.name} — Property Management`,
            category: 'property_management',
            monthlyAmount: monthly,
          })
        }
      }
      // Land tax
      if (prop.landTaxPA && prop.landTaxPA > 0) {
        items.push({
          key: `${prop.id}-landtax`,
          propertyName: prop.name,
          label: `${prop.name} — Land Tax`,
          category: 'land_tax',
          monthlyAmount: prop.landTaxPA / 12,
        })
      }
      // Maintenance
      if (prop.maintenanceBudgetPA && prop.maintenanceBudgetPA > 0) {
        items.push({
          key: `${prop.id}-maintenance`,
          propertyName: prop.name,
          label: `${prop.name} — Maintenance`,
          category: 'maintenance',
          monthlyAmount: prop.maintenanceBudgetPA / 12,
        })
      }
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

  // Group auto expenses by property name
  const autoExpensesByProperty = useMemo(() => {
    const map = new Map<string, AutoPropertyExpenseItem[]>()
    for (const item of autoPropertyExpenses) {
      const existing = map.get(item.propertyName) ?? []
      existing.push(item)
      map.set(item.propertyName, existing)
    }
    return Array.from(map.entries()).map(([propertyName, items]) => ({
      propertyName,
      items,
      groupTotal: items.reduce((s, i) => s + i.monthlyAmount, 0),
    }))
  }, [autoPropertyExpenses])

  return (
    <div className="space-y-6">
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
              <div><Label>Monthly Budget (AUD)</Label><CurrencyInput value={form.monthlyBudget} onChange={v => setForm({...form, monthlyBudget: v})} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.monthlyBudget}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Monthly Expenses</span>
            <span className="text-red-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {expenseBudgets.length === 0 && autoPropertyExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4">Set your monthly budget for each category.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Expense</Button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Auto-generated property expenses grouped by property */}
          {autoExpensesByProperty.length > 0 && (
            <div>
              <button
                onClick={() => toggleGroup('__auto_property__')}
                className="w-full flex items-center justify-between px-1 py-2 group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {collapsedGroups.has('__auto_property__') ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold">🏠 Property</span>
                  <Badge variant="outline" className="text-xs">{autoPropertyExpenses.length}</Badge>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">🔗 Auto</Badge>
                </div>
                <span className="text-sm font-semibold text-red-500">{formatCurrency(autoPropertyTotal)}/mo</span>
              </button>

              {!collapsedGroups.has('__auto_property__') && (
                <div className="space-y-3 pl-6">
                  {autoExpensesByProperty.map(({ propertyName, items, groupTotal }) => (
                    <div key={propertyName}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>{propertyName}</span>
                        <span className="tabular-nums">{formatCurrency(groupTotal)}/mo</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map(item => (
                          <Card key={item.key} className="bg-muted/30 border-dashed">
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{item.label}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={EXPENSE_GROUP_COLORS[item.category] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}>
                                      {CATEGORY_LABELS[item.category]}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">🔗 Auto</Badge>
                                  </div>
                                  <p className="text-2xl font-extrabold tabular-nums tracking-tight mt-2 text-red-500">{formatCurrency(item.monthlyAmount)}/mo</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual expense groups */}
          {groupedExpenses.map(group => {
            const isCollapsed = collapsedGroups.has(group.label)
            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-1 py-2 group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-semibold">{group.icon} {group.label}</span>
                    <Badge variant="outline" className="text-xs">{group.items.length}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-red-500">{formatCurrency(group.groupTotal)}/mo</span>
                </button>

                {/* Group items */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    {group.items.map(item => (
                      <Card key={item.id} className="card-hover group">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{item.label}</p>
                              <Badge variant="outline" className={`mt-1 ${EXPENSE_GROUP_COLORS[item.category] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                                {CATEGORY_LABELS[item.category]}
                              </Badge>
                              <p className="text-2xl font-extrabold tabular-nums tracking-tight mt-2 text-red-500">{formatCurrency(item.monthlyBudget)}/mo</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this expense budget. This action cannot be undone.
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
