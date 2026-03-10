import { useState } from 'react'
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
import type { ExpenseBudget, ExpenseCategory } from '@/types/models'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mortgage_repayment: 'Mortgage Repayment', rent: 'Rent',
  council_rates: 'Council Rates', water_rates: 'Water Rates', strata: 'Strata',
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
    label: 'Housing',
    icon: '🏠',
    categories: ['mortgage_repayment', 'rent', 'council_rates', 'water_rates', 'strata', 'utilities'],
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

export function ExpensesPage() {
  const { expenseBudgets, addExpenseBudget, updateExpenseBudget, removeExpenseBudget } = useFinanceStore()
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

  const total = expenseBudgets.reduce((s, b) => s + b.monthlyBudget, 0)

  // Group expenses by super-category
  const groupedExpenses = SUPER_CATEGORIES.map(group => {
    const items = expenseBudgets.filter(b => group.categories.includes(b.category))
    const groupTotal = items.reduce((s, b) => s + b.monthlyBudget, 0)
    return { ...group, items, groupTotal }
  }).filter(g => g.items.length > 0)

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

      {expenseBudgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingDown className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4">Set your monthly budget for each category.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Expense</Button>
        </div>
      ) : (
        <div className="space-y-4">
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
