import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
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

const SUPER_CATEGORIES: { label: string; icon: string; categories: ExpenseCategory[] }[] = [
  { label: 'Property', icon: '🏠', categories: ['mortgage_repayment', 'council_rates', 'water_rates', 'strata', 'property_management', 'land_tax', 'maintenance', 'building_insurance'] },
  { label: 'Housing', icon: '🏡', categories: ['rent', 'utilities'] },
  { label: 'Insurance', icon: '🛡️', categories: ['insurance_home', 'insurance_health', 'insurance_car', 'insurance_life'] },
  { label: 'Living', icon: '🛒', categories: ['groceries', 'transport', 'fuel', 'phone_internet', 'personal_care', 'clothing'] },
  { label: 'Lifestyle', icon: '✨', categories: ['subscriptions', 'entertainment', 'dining_out', 'health_fitness', 'education', 'childcare', 'pet_expenses', 'gifts_donations'] },
  { label: 'Financial', icon: '💰', categories: ['hecs_repayment', 'tax', 'other'] },
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Monthly Expenses</p>
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">{formatCurrency(total)}</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
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

      {expenseBudgets.length === 0 && autoPropertyExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4">Add your monthly expenses to track your spending.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Expense</Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Auto property expenses */}
            {autoByProperty.length > 0 && (
              <div className="border-b border-border last:border-b-0">
                <button
                  onClick={() => toggleGroup('__auto__')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedGroups.has('__auto__') ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold">🏠 Property Expenses</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">auto</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(autoPropertyTotal)}/mo</span>
                </button>
                {!collapsedGroups.has('__auto__') && (
                  <div>
                    {autoByProperty.map(({ name, items, total: propTotal }) => (
                      <div key={name}>
                        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{name}</span>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">{formatCurrency(propTotal)}/mo</span>
                        </div>
                        {items.map(item => (
                          <div key={item.key} className="flex items-center justify-between px-4 py-2 pl-8 hover:bg-muted/30 transition-colors">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(item.monthlyAmount)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual expense groups */}
            {groupedExpenses.map(group => {
              const collapsed = collapsedGroups.has(group.label)
              return (
                <div key={group.label} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold">{group.icon} {group.label}</span>
                      <span className="text-xs text-muted-foreground">{group.items.length}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(group.groupTotal)}/mo</span>
                  </button>
                  {!collapsed && (
                    <div>
                      {group.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-2 pl-8 hover:bg-muted/30 transition-colors group">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{item.label}</span>
                            {item.label !== CATEGORY_LABELS[item.category] && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">{CATEGORY_LABELS[item.category]}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">{formatCurrency(item.monthlyBudget)}</span>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(item.id)} className="p-1 rounded hover:bg-muted"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                              <button onClick={() => setDeleteTarget(item)} className="p-1 rounded hover:bg-muted"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
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
  )
}
