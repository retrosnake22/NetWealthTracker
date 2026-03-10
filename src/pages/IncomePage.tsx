import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency } from '@/lib/format'
import type { IncomeCategory } from '@/types/models'

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary / Wages',
  rental: 'Rental Income',
  dividends: 'Dividends',
  interest: 'Interest',
  side_hustle: 'Side Hustle',
  other: 'Other',
}

const CATEGORY_COLORS: Record<IncomeCategory, string> = {
  salary: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rental: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  dividends: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  interest: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  side_hustle: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export function IncomePage() {
  const { incomes, addIncome, updateIncome, removeIncome } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: 'salary' as IncomeCategory, monthlyAmount: '', isActive: true,
  })

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

  const total = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)

  return (
    <div className="space-y-6">
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
              <div><Label>Monthly Amount (AUD)</Label><Input type="number" placeholder="0" value={form.monthlyAmount} onChange={e => setForm({...form, monthlyAmount: e.target.value})} /></div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Monthly Income</span>
            <span className="text-emerald-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {incomes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No income sources yet</h3>
          <p className="text-muted-foreground">Add your salary, rental income, dividends, etc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomes.map(item => (
            <Card key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={CATEGORY_COLORS[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                      {!item.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <p className="text-xl font-bold mt-2 text-emerald-500">{formatCurrency(item.monthlyAmount)}/mo</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeIncome(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
