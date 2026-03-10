import { useState } from 'react'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { LiabilityCategory } from '@/types/models'

const CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  car_loan: 'Car Loan',
  credit_card: 'Credit Card',
  hecs: 'HECS-HELP',
  other: 'Other',
}

export function LiabilitiesPage() {
  const { liabilities, addLiability, updateLiability, removeLiability, properties } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
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

  const getLinkedProperty = (id: string) => {
    const liability = liabilities.find(l => l.id === id)
    if (!liability?.linkedPropertyId) return null
    return properties.find(p => p.mortgageId === id)
  }

  const total = liabilities.reduce((s, l) => s + l.currentBalance, 0)

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case 'weekly': return '/wk'
      case 'fortnightly': return '/fn'
      default: return '/mo'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liabilities</h1>
          <p className="text-muted-foreground mt-1">Manage your debts and loans</p>
        </div>
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
                <Input type="number" placeholder="0" value={form.currentBalance} onChange={e => setForm({...form, currentBalance: e.target.value})} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" value={form.interestRatePA} onChange={e => setForm({...form, interestRatePA: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Repayment Amount</Label>
                  <Input type="number" value={form.minimumRepayment} onChange={e => setForm({...form, minimumRepayment: e.target.value})} />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Liabilities</span>
            <span className="text-red-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {liabilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No liabilities yet</h3>
          <p className="text-muted-foreground">Add your mortgages, loans, credit cards, and HECS debt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liabilities.map(item => {
            const linkedProperty = getLinkedProperty(item.id)
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatPercent(item.interestRatePA)} p.a.
                        </span>
                        {linkedProperty && (
                          <Badge variant="outline">🏠 {linkedProperty.name}</Badge>
                        )}
                      </div>
                      <p className="text-xl font-bold mt-2 text-red-500">{formatCurrency(item.currentBalance)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Repayment: {formatCurrency(item.minimumRepayment)}{frequencyLabel(item.repaymentFrequency)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeLiability(item.id)}>
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
