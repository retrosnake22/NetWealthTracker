import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, Briefcase, Home, BarChart3, Landmark, Sparkles, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { IncomeItem, IncomeCategory, Property, Asset } from '@/types/models'

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary / Wages',
  rental: 'Rental Income',
  dividends: 'Dividends',
  interest: 'Interest',
  side_hustle: 'Side Hustle',
  other: 'Other',
}

const CATEGORY_COLORS: Record<IncomeCategory, string> = {
  salary: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  rental: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  dividends: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  interest: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  side_hustle: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const CATEGORY_ICONS: Record<IncomeCategory, React.ElementType> = {
  salary: Briefcase,
  rental: Home,
  dividends: BarChart3,
  interest: Landmark,
  side_hustle: Sparkles,
  other: HelpCircle,
}

// ─── Auto-generated item shape ────────────────────────────────────────────────

interface AutoIncomeItem {
  key: string
  name: string
  category: IncomeCategory
  monthlyAmount: number
  note: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAutoItems(properties: Property[], assets: Asset[]): AutoIncomeItem[] {
  const items: AutoIncomeItem[] = []

  // 1. Rental income from properties
  for (const p of properties) {
    if ((p.weeklyRent ?? 0) > 0) {
      const weeklyRent = p.weeklyRent!
      items.push({
        key: `rental-${p.id}`,
        name: `${p.name} — Rental Income`,
        category: 'rental',
        monthlyAmount: (weeklyRent * 52) / 12,
        note: `$${weeklyRent.toLocaleString('en-AU')}/wk × 52 ÷ 12`,
      })
    }
  }

  // 2. Interest income from cash assets
  for (const a of assets) {
    if (a.category === 'cash' && a.growthRatePA > 0) {
      items.push({
        key: `interest-${a.id}`,
        name: `${a.name} — Interest`,
        category: 'interest',
        monthlyAmount: (a.currentValue * a.growthRatePA) / 12,
        note: `Based on ${formatPercent(a.growthRatePA)} p.a.`,
      })
    }
  }

  // 3. Dividend income from stock assets
  for (const a of assets) {
    if (a.category === 'stocks' && a.growthRatePA > 0) {
      items.push({
        key: `dividends-${a.id}`,
        name: `${a.name} — Dividends`,
        category: 'dividends',
        monthlyAmount: (a.currentValue * a.growthRatePA) / 12,
        note: `Based on ${formatPercent(a.growthRatePA)} p.a.`,
      })
    }
  }

  return items
}

function groupByCategory<T extends { category: IncomeCategory }>(items: T[]): Map<IncomeCategory, T[]> {
  const map = new Map<IncomeCategory, T[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return map
}

// Category display order
const CATEGORY_ORDER: IncomeCategory[] = ['salary', 'rental', 'dividends', 'interest', 'side_hustle', 'other']

// ─── Component ────────────────────────────────────────────────────────────────

export function IncomePage() {
  const { incomes, addIncome, updateIncome, removeIncome, assets, properties } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IncomeItem | null>(null)
  const [form, setForm] = useState({
    name: '', category: 'salary' as IncomeCategory, monthlyAmount: '', isActive: true,
  })

  // ── Auto-generated items ────────────────────────────────────────────────────

  const autoItems = useMemo(() => buildAutoItems(properties, assets), [properties, assets])
  const autoTotal = useMemo(() => autoItems.reduce((s, i) => s + i.monthlyAmount, 0), [autoItems])
  const autoGrouped = useMemo(() => groupByCategory(autoItems), [autoItems])

  // ── Manual income helpers ───────────────────────────────────────────────────

  const resetForm = () => { setForm({ name: '', category: 'salary', monthlyAmount: '', isActive: true }); setEditId(null) }

  const handleSave = () => {
    const data = {
      name: form.name,
      category: form.category,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0,
      isActive: form.isActive,
    }
    if (editId) updateIncome(editId, data)
    else addIncome(data)
    resetForm(); setOpen(false)
  }

  const handleEdit = (id: string) => {
    const item = incomes.find(i => i.id === id)
    if (!item) return
    setForm({ name: item.name, category: item.category, monthlyAmount: String(item.monthlyAmount), isActive: item.isActive })
    setEditId(id); setOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeIncome(deleteTarget.id)
    setDeleteTarget(null)
  }

  const manualTotal = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)
  const grandTotal = manualTotal + autoTotal
  const manualGrouped = useMemo(() => groupByCategory(incomes), [incomes])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Income</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Income</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input placeholder="e.g. Full-time Salary" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as IncomeCategory})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Monthly Amount (AUD)</Label><CurrencyInput value={form.monthlyAmount} onChange={v => setForm({...form, monthlyAmount: v})} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
                <Label htmlFor="isActive">Currently active</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.monthlyAmount}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Monthly Income</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-blue-400">{formatCurrency(grandTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(grandTotal * 12)}/year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Manually Entered</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(manualTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Auto-Generated</p>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(autoTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Auto-Generated Income section (grouped by category) ── */}
      {autoItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Auto-Generated Income</h2>
            <span className="text-xs text-muted-foreground">Based on your assets and properties</span>
          </div>

          {CATEGORY_ORDER.map(cat => {
            const items = autoGrouped.get(cat)
            if (!items || items.length === 0) return null
            const Icon = CATEGORY_ICONS[cat]
            const catTotal = items.reduce((s, i) => s + i.monthlyAmount, 0)

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">{CATEGORY_LABELS[cat]}</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-blue-400">{formatCurrency(catTotal)}/mo</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                  {items.map(item => (
                    <Card key={item.key} className="bg-muted/30 border-dashed">
                      <CardContent className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-muted-foreground/30">
                              🔗 Auto
                            </Badge>
                          </div>
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-lg font-bold tabular-nums text-blue-400">
                            {formatCurrency(item.monthlyAmount)}/mo
                          </p>
                          <p className="text-xs text-muted-foreground">{item.note}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Manually Entered Income section (grouped by category) ── */}
      {incomes.length === 0 && autoItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No income sources yet</h3>
          <p className="text-muted-foreground mb-4">Add your salary, rental income, dividends, etc.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Income</Button>
        </div>
      ) : incomes.length > 0 ? (
        <div className="space-y-4">
          {autoItems.length > 0 && (
            <h2 className="text-base font-semibold">Manually Entered Income</h2>
          )}

          {CATEGORY_ORDER.map(cat => {
            const items = manualGrouped.get(cat)
            if (!items || items.length === 0) return null
            const Icon = CATEGORY_ICONS[cat]
            const catTotal = items.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium">{CATEGORY_LABELS[cat]}</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-blue-400">{formatCurrency(catTotal)}/mo</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                  {items.map(item => (
                    <Card key={item.id} className={`card-hover group${!item.isActive ? ' opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={CATEGORY_COLORS[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                              {!item.isActive && <Badge variant="outline">Inactive</Badge>}
                            </div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-lg font-bold tabular-nums text-blue-400">{formatCurrency(item.monthlyAmount)}/mo</p>
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
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this income source. This action cannot be undone.
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
