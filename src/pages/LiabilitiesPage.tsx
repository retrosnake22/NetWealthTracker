import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
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
import type { Liability, LiabilityCategory } from '@/types/models'

const CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  car_loan: 'Car Loan',
  credit_card: 'Credit Card',
  hecs: 'HECS-HELP',
  home_loan: 'Home Loan',
  other: 'Other',
}

const CATEGORY_COLORS: Record<LiabilityCategory, string> = {
  mortgage: 'bg-red-500/10 text-red-500 border-red-500/20',
  home_loan: 'bg-red-500/10 text-red-500 border-red-500/20',
  personal_loan: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  car_loan: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  credit_card: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  hecs: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export function LiabilitiesPage() {
  const { liabilities, addLiability, updateLiability, removeLiability, properties } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'personal_loan' as LiabilityCategory,
    currentBalance: '',
    interestRatePA: '',
    minimumRepayment: '',
    repaymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
  })

  const resetForm = () => {
    setForm({
      name: '', category: 'personal_loan', currentBalance: '',
      interestRatePA: '', minimumRepayment: '', repaymentFrequency: 'monthly',
    })
    setEditId(null)
  }

  const handleSave = () => {
    const data = {
      name: form.name,
      category: form.category,
      currentBalance: parseFloat(form.currentBalance) || 0,
      interestRatePA: (parseFloat(form.interestRatePA) || 0) / 100,
      minimumRepayment: parseFloat(form.minimumRepayment) || 0,
      repaymentFrequency: form.repaymentFrequency,
    }
    if (editId) updateLiability(editId, data)
    else addLiability(data)
    resetForm()
    setOpen(false)
  }

  const handleEdit = (id: string) => {
    const item = liabilities.find(l => l.id === id)
    if (!item) return
    setForm({
      name: item.name,
      category: item.category,
      currentBalance: String(item.currentBalance),
      interestRatePA: String(item.interestRatePA * 100),
      minimumRepayment: String(item.minimumRepayment),
      repaymentFrequency: item.repaymentFrequency,
    })
    setEditId(id)
    setOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeLiability(deleteTarget.id)
    setDeleteTarget(null)
  }

  const getLinkedProperty = (id: string) => {
    const liability = liabilities.find(l => l.id === id)
    if (!liability?.linkedPropertyId) return null
    return properties.find(p => p.mortgageId === id)
  }

  const total = liabilities.reduce((s, l) => s + l.currentBalance, 0)

  const monthlyRepayments = liabilities.reduce((s, l) => {
    const repayment = l.minimumRepayment ?? 0
    if (l.repaymentFrequency === 'weekly') return s + (repayment * 52) / 12
    if (l.repaymentFrequency === 'fortnightly') return s + (repayment * 26) / 12
    return s + repayment
  }, 0)

  const weightedRate = total > 0
    ? liabilities.reduce((s, l) => s + l.interestRatePA * (l.currentBalance / total), 0)
    : 0

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case 'weekly': return '/wk'
      case 'fortnightly': return '/fn'
      default: return '/mo'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Liability</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Add'} Liability</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v as LiabilityCategory})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Balance (AUD)</Label>
                <CurrencyInput value={form.currentBalance} onChange={v => setForm({...form, currentBalance: v})} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" value={form.interestRatePA} onChange={e => setForm({...form, interestRatePA: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Repayment Amount</Label>
                  <CurrencyInput value={form.minimumRepayment} onChange={v => setForm({...form, minimumRepayment: v})} />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.repaymentFrequency} onValueChange={(v: 'weekly' | 'fortnightly' | 'monthly') => setForm({...form, repaymentFrequency: v})}>
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
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.currentBalance}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Total Liabilities</p>
            <p className='text-2xl font-extrabold tabular-nums tracking-tight text-amber-400'>{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Monthly Repayments</p>
            <p className='text-2xl font-extrabold tabular-nums tracking-tight'>{formatCurrency(monthlyRepayments)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Avg Interest Rate</p>
            <p className='text-2xl font-extrabold tabular-nums tracking-tight'>{total > 0 ? formatPercent(weightedRate) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {liabilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No liabilities yet</h3>
          <p className="text-muted-foreground mb-4">Add your mortgages, loans, credit cards, and HECS debt.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Liability</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liabilities.map(item => {
            const linkedProperty = getLinkedProperty(item.id)
            return (
              <Card key={item.id} className="card-hover group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className={CATEGORY_COLORS[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatPercent(item.interestRatePA)} p.a.
                        </span>
                        {linkedProperty && (
                          <Badge variant="outline">🏠 {linkedProperty.name}</Badge>
                        )}
                      </div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-lg font-bold tabular-nums text-amber-400">{formatCurrency(item.currentBalance)}</p>
                      <p className="text-xs text-muted-foreground">
                        Repayment: {formatCurrency(item.minimumRepayment)}{frequencyLabel(item.repaymentFrequency)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this liability. This action cannot be undone.
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
