import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Wallet, Home } from 'lucide-react'
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
import { formatCurrency, formatPercent } from '@/lib/format'
import type { Asset, AssetCategory, Property } from '@/types/models'

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
  const { assets, properties, addAsset, updateAsset, removeAsset, updateProperty, removeProperty } = useFinanceStore()
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') as AssetCategory | null

  // Asset form state
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

  // Property form state
  const [propOpen, setPropOpen] = useState(false)
  const [propEditId, setPropEditId] = useState<string | null>(null)
  const [deletePropTarget, setDeletePropTarget] = useState<Property | null>(null)
  const [propForm, setPropForm] = useState({
    name: '',
    type: 'investment' as 'primary_residence' | 'investment',
    currentValue: '',
    growthRatePA: '7',
    weeklyRent: '',
    councilRatesPA: '',
    waterRatesPA: '',
    insurancePA: '',
    strataPA: '',
    maintenancePA: '',
    propertyManagementPct: '',
    landTaxPA: '',
  })

  // Filter assets based on category param
  const filteredAssets = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'property') return assets.filter(a => !categoryFilter || a.category === categoryFilter)
    return assets.filter(a => a.category === categoryFilter)
  }, [assets, categoryFilter])

  const showProperties = categoryFilter === 'property' || !categoryFilter

  const assetTotal = filteredAssets.reduce((s, a) => s + a.currentValue, 0)
  const propertyTotal = showProperties ? properties.reduce((s, p) => s + p.currentValue, 0) : 0
  const total = assetTotal + (categoryFilter === 'property' ? propertyTotal : (!categoryFilter ? propertyTotal : 0))

  const pageTitle = categoryFilter ? CATEGORY_LABELS[categoryFilter] || 'Assets' : 'All Assets'

  // --- Asset handlers ---
  const resetForm = () => {
    setForm({ name: '', category: (categoryFilter && categoryFilter !== 'property' ? categoryFilter : 'cash') as AssetCategory, currentValue: '', growthRatePA: '', isOffset: false })
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

  // --- Property handlers ---
  const resetPropForm = () => {
    setPropForm({
      name: '', type: 'investment', currentValue: '', growthRatePA: '7', weeklyRent: '',
      councilRatesPA: '', waterRatesPA: '', insurancePA: '', strataPA: '',
      maintenancePA: '', propertyManagementPct: '', landTaxPA: '',
    })
    setPropEditId(null)
  }

  const handleEditProperty = (prop: Property) => {
    setPropForm({
      name: prop.name,
      type: prop.type,
      currentValue: String(prop.currentValue),
      growthRatePA: String((prop.growthRatePA || 0.07) * 100),
      weeklyRent: String(prop.weeklyRent || ''),
      councilRatesPA: String((prop.councilRatesPA || 0) / 4 || ''),
      waterRatesPA: String((prop.waterRatesPA || 0) / 4 || ''),
      insurancePA: String(prop.insurancePA || ''),
      strataPA: String((prop.strataPA || 0) / 4 || ''),
      maintenancePA: String(prop.maintenanceBudgetPA || ''),
      propertyManagementPct: String(prop.propertyManagementPct || ''),
      landTaxPA: String(prop.landTaxPA || ''),
    })
    setPropEditId(prop.id)
    setPropOpen(true)
  }

  const handleSaveProperty = () => {
    const councilQ = parseFloat(propForm.councilRatesPA) || 0
    const waterQ = parseFloat(propForm.waterRatesPA) || 0
    const strataQ = parseFloat(propForm.strataPA) || 0

    const data: Partial<Property> = {
      name: propForm.name,
      type: propForm.type,
      currentValue: parseFloat(propForm.currentValue) || 0,
      growthRatePA: (parseFloat(propForm.growthRatePA) || 0) / 100,
      weeklyRent: parseFloat(propForm.weeklyRent) || 0,
      councilRatesPA: councilQ * 4,
      waterRatesPA: waterQ * 4,
      insurancePA: parseFloat(propForm.insurancePA) || 0,
      strataPA: strataQ * 4,
      maintenanceBudgetPA: parseFloat(propForm.maintenancePA) || 0,
      propertyManagementPct: parseFloat(propForm.propertyManagementPct) || 0,
      landTaxPA: parseFloat(propForm.landTaxPA) || 0,
    }

    if (propEditId) {
      updateProperty(propEditId, data)
    }
    resetPropForm()
    setPropOpen(false)
  }

  const confirmDeleteProperty = () => {
    if (!deletePropTarget) return
    removeProperty(deletePropTarget.id)
    setDeletePropTarget(null)
  }

  const canAddHere = categoryFilter !== 'property'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{pageTitle}</h2>
        {canAddHere && (
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
                  <CurrencyInput value={form.currentValue} onChange={v => setForm({...form, currentValue: v})} />
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
        )}
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total {pageTitle}</span>
            <span className="text-emerald-500">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Property cards */}
      {showProperties && properties.length > 0 && (
        <>
          {!categoryFilter && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Property</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((prop: Property) => (
              <Card key={prop.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <Badge className={CATEGORY_COLORS.property}>
                        <Home className="h-3 w-3 mr-1" />
                        {prop.type === 'investment' ? 'Investment' : 'Primary Residence'}
                      </Badge>
                      <p className="font-semibold">{prop.name}</p>
                      <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(prop.currentValue)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProperty(prop)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletePropTarget(prop)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatPercent(prop.growthRatePA)} p.a.</span>
                      {(prop.weeklyRent ?? 0) > 0 && (
                        <span className="text-xs text-emerald-500 tabular-nums">{formatCurrency(prop.weeklyRent ?? 0)}/wk rent</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Regular asset cards */}
      {filteredAssets.length > 0 && (
        <>
          {!categoryFilter && properties.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-4">Financial Assets</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssets.filter(a => a.category !== 'property').map(asset => (
              <Card key={asset.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      {!categoryFilter && (
                        <Badge className={CATEGORY_COLORS[asset.category]}>{CATEGORY_LABELS[asset.category]}</Badge>
                      )}
                      <p className="font-semibold">{asset.name}</p>
                      <p className="text-2xl font-extrabold tabular-nums tracking-tight">{formatCurrency(asset.currentValue)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(asset.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(asset)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatPercent(asset.growthRatePA)} p.a.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {filteredAssets.length === 0 && (!showProperties || properties.length === 0) && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No {categoryFilter ? CATEGORY_LABELS[categoryFilter].toLowerCase() : 'assets'} yet
          </h3>
          <p className="text-muted-foreground mb-4">
            {categoryFilter === 'property'
              ? 'Add properties via the Setup Wizard.'
              : `Add your ${categoryFilter ? CATEGORY_LABELS[categoryFilter].toLowerCase() : 'cash, stocks, super and other assets'}.`
            }
          </p>
          {canAddHere && (
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>
          )}
        </div>
      )}

      {/* Asset Delete Confirmation */}
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

      {/* Property Delete Confirmation */}
      <AlertDialog open={!!deletePropTarget} onOpenChange={(o) => { if (!o) setDeletePropTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletePropTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this property and its associated expenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteProperty}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Property Edit Dialog */}
      <Dialog open={propOpen} onOpenChange={(o) => { setPropOpen(o); if (!o) resetPropForm() }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property Name</Label>
              <Input value={propForm.name} onChange={e => setPropForm({...propForm, name: e.target.value})} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={propForm.type} onValueChange={(v: string) => setPropForm({...propForm, type: v as 'primary_residence' | 'investment'})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary_residence">Primary Residence</SelectItem>
                  <SelectItem value="investment">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Value</Label>
              <CurrencyInput value={propForm.currentValue} onChange={v => setPropForm({...propForm, currentValue: v})} />
            </div>
            <div>
              <Label>Growth Rate (% p.a.)</Label>
              <Input type="number" step="0.1" value={propForm.growthRatePA} onChange={e => setPropForm({...propForm, growthRatePA: e.target.value})} />
            </div>
            {propForm.type === 'investment' && (
              <div>
                <Label>Weekly Rent ($)</Label>
                <CurrencyInput value={propForm.weeklyRent} onChange={v => setPropForm({...propForm, weeklyRent: v})} />
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Running Costs</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Council Rates ($/quarter)</Label>
                  <CurrencyInput value={propForm.councilRatesPA} onChange={v => setPropForm({...propForm, councilRatesPA: v})} />
                </div>
                <div>
                  <Label className="text-xs">Water Rates ($/quarter)</Label>
                  <CurrencyInput value={propForm.waterRatesPA} onChange={v => setPropForm({...propForm, waterRatesPA: v})} />
                </div>
                <div>
                  <Label className="text-xs">Building Insurance ($/year)</Label>
                  <CurrencyInput value={propForm.insurancePA} onChange={v => setPropForm({...propForm, insurancePA: v})} />
                </div>
                <div>
                  <Label className="text-xs">Strata / Body Corp ($/quarter)</Label>
                  <CurrencyInput value={propForm.strataPA} onChange={v => setPropForm({...propForm, strataPA: v})} />
                </div>
                <div>
                  <Label className="text-xs">Maintenance ($/year)</Label>
                  <CurrencyInput value={propForm.maintenancePA} onChange={v => setPropForm({...propForm, maintenancePA: v})} />
                </div>
                {propForm.type === 'investment' && (
                  <>
                    <div>
                      <Label className="text-xs">Property Mgmt (%)</Label>
                      <Input type="number" step="0.1" value={propForm.propertyManagementPct} onChange={e => setPropForm({...propForm, propertyManagementPct: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Land Tax ($/year)</Label>
                      <CurrencyInput value={propForm.landTaxPA} onChange={v => setPropForm({...propForm, landTaxPA: v})} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveProperty} disabled={!propForm.name || !propForm.currentValue}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
