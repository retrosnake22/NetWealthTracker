import { useState } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { Asset, AssetCategory } from '@/types/models'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash / Savings',
  property: 'Property',
  stocks: 'Stocks / ETFs',
  super: 'Superannuation',
  vehicles: 'Vehicles',
  other: 'Other',
}

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  cash: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  property: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  stocks: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  super: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  vehicles: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const DEFAULT_GROWTH: Record<AssetCategory, number> = {
  cash: 0.045,
  property: 0.07,
  stocks: 0.08,
  super: 0.07,
  vehicles: -0.10,
  other: 0.03,
}

export function AssetsPage() {
  const { assets, addAsset, updateAsset, removeAsset } = useFinanceStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'cash' as AssetCategory,
    currentValue: '',
    growthRatePA: '',
    isOffset: false,
  })

  const resetForm = () => {
    setForm({ name: '', category: 'cash', currentValue: '', growthRatePA: '', isOffset: false })
    setEditId(null)
  }

  const handleCategoryChange = (cat: AssetCategory) => {
    setForm({ ...form, category: cat, growthRatePA: String(DEFAULT_GROWTH[cat] * 100) })
  }

  const handleSave = () => {
    const data = {
      name: form.name,
      category: form.category,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 0) / 100,
      ...(form.category === 'cash' ? { isOffset: form.isOffset } : {}),
    }

    if (editId) {
      updateAsset(editId, data)
    } else {
      addAsset(data)
    }
    resetForm()
    setOpen(false)
  }

  const handleEdit = (id: string) => {
    const asset = assets.find(a => a.id === id)
    if (!asset) return
    setForm({
      name: asset.name,
      category: asset.category,
      currentValue: String(asset.currentValue),
      growthRatePA: String(asset.growthRatePA * 100),
      isOffset: 'isOffset' in asset ? (asset as { isOffset: boolean }).isOffset : false,
    })
    setEditId(id)
    setOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeAsset(deleteTarget.id)
    setDeleteTarget(null)
  }

  const total = assets.reduce((s, a) => s + a.currentValue, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Add'} Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => handleCategoryChange(v as AssetCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== 'property').map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Value (AUD)</Label>
                <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} />
              </div>
              <div>
                <Label>Expected Growth Rate (% p.a.)</Label>
                <Input type="number" step="0.1" value={form.growthRatePA} onChange={e => setForm({...form, growthRatePA: e.target.value})} />
              </div>
              {form.category === 'cash' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isOffset" checked={form.isOffset} onChange={e => setForm({...form, isOffset: e.target.checked})} className="rounded" />
                  <Label htmlFor="isOffset">This is a mortgage offset account</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave} disabled={!form.name || !form.currentValue}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Assets</span>
            <span className="text-emerald-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
          <p className="text-muted-foreground">Add your cash, stocks, super and other assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map(asset => (
            <Card key={asset.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{asset.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={CATEGORY_COLORS[asset.category]}>{CATEGORY_LABELS[asset.category]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatPercent(asset.growthRatePA)} p.a.</span>
                    </div>
                    <p className="text-xl font-bold mt-2">{formatCurrency(asset.currentValue)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(asset.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(asset)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this asset. This action cannot be undone.
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
