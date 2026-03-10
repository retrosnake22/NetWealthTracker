import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { FinanceState } from '@/stores/useFinanceStore'
import type { Asset, Property, AssetCategory } from '@/types/models'
import { formatCurrency } from '@/lib/format'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash & Savings',
  property: 'Property',
  stocks: 'Stocks / ETFs',
  super: 'Superannuation',
  vehicles: 'Vehicles',
  other: 'Other',
}

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  cash: '💰',
  property: '🏠',
  stocks: '📈',
  super: '🎯',
  vehicles: '🚗',
  other: '📦',
}

export default function AssetsPage() {
  const store = useFinanceStore() as FinanceState
  const { assets, properties, addAsset, updateAsset, removeAsset, addProperty, updateProperty, removeProperty } = store
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') as AssetCategory | 'property' | null

  // Asset editing
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [assetForm, setAssetForm] = useState({ name: '', value: '', category: 'cash' as AssetCategory })

  // Property editing
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [propForm, setPropForm] = useState({
    name: '', type: 'primary_residence' as 'primary_residence' | 'investment',
    currentValue: '', weeklyRent: '',
    councilRatesPA: '', waterRatesPA: '', insurancePA: '',
    strataPA: '', maintenanceBudgetPA: '', propertyManagementPct: '', landTaxPA: '',
  })

  const filteredAssets = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'property') return assets
    return assets.filter(a => a.category === categoryFilter)
  }, [assets, categoryFilter])

  const showProperties = !categoryFilter || categoryFilter === 'property'
  const showAssets = categoryFilter !== 'property'

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalProperties = properties.reduce((s, p) => s + p.currentValue, 0)

  // --- Asset handlers ---
  function openAddAsset() {
    setAssetForm({ name: '', value: '', category: (categoryFilter && categoryFilter !== 'property' ? categoryFilter : 'cash') as AssetCategory })
    setEditingAsset(null)
    setShowAddAsset(true)
  }
  function openEditAsset(a: Asset) {
    setAssetForm({ name: a.name, value: String(a.currentValue), category: a.category })
    setEditingAsset(a)
    setShowAddAsset(true)
  }
  function saveAsset() {
    const data = {
      name: assetForm.name,
      currentValue: parseFloat(assetForm.value) || 0,
      growthRatePA: editingAsset?.growthRatePA ?? 0,
      category: assetForm.category,
    }
    if (editingAsset) {
      updateAsset(editingAsset.id, data)
    } else {
      addAsset(data as any)
    }
    setShowAddAsset(false)
    setEditingAsset(null)
  }

  // --- Property handlers ---
  function openAddProperty() {
    setPropForm({
      name: '', type: 'primary_residence', currentValue: '', weeklyRent: '',
      councilRatesPA: '', waterRatesPA: '', insurancePA: '',
      strataPA: '', maintenanceBudgetPA: '', propertyManagementPct: '', landTaxPA: '',
    })
    setEditingProperty(null)
    setShowAddProperty(true)
  }
  function openEditProperty(p: Property) {
    setPropForm({
      name: p.name,
      type: p.type,
      currentValue: String(p.currentValue),
      weeklyRent: String(p.weeklyRent ?? ''),
      councilRatesPA: String((p.councilRatesPA ?? 0) / 4 || ''),
      waterRatesPA: String((p.waterRatesPA ?? 0) / 4 || ''),
      insurancePA: String(p.insurancePA ?? ''),
      strataPA: String((p.strataPA ?? 0) / 4 || ''),
      maintenanceBudgetPA: String(p.maintenanceBudgetPA ?? ''),
      propertyManagementPct: String(p.propertyManagementPct ?? ''),
      landTaxPA: String(p.landTaxPA ?? ''),
    })
    setEditingProperty(p)
    setShowAddProperty(true)
  }
  function saveProperty() {
    const data: any = {
      name: propForm.name,
      type: propForm.type,
      currentValue: parseFloat(propForm.currentValue) || 0,
      growthRatePA: editingProperty?.growthRatePA ?? 0.07,
      weeklyRent: parseFloat(propForm.weeklyRent) || 0,
      councilRatesPA: (parseFloat(propForm.councilRatesPA) || 0) * 4,
      waterRatesPA: (parseFloat(propForm.waterRatesPA) || 0) * 4,
      insurancePA: parseFloat(propForm.insurancePA) || 0,
      strataPA: (parseFloat(propForm.strataPA) || 0) * 4,
      maintenanceBudgetPA: parseFloat(propForm.maintenanceBudgetPA) || 0,
      propertyManagementPct: parseFloat(propForm.propertyManagementPct) || 0,
      landTaxPA: parseFloat(propForm.landTaxPA) || 0,
    }
    if (editingProperty?.id) {
      updateProperty(editingProperty.id, data)
    } else {
      addProperty(data)
    }
    setShowAddProperty(false)
    setEditingProperty(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {categoryFilter === 'property' ? 'Properties' : categoryFilter ? CATEGORY_LABELS[categoryFilter] : 'All Assets'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total: {formatCurrency(categoryFilter === 'property' ? totalProperties : categoryFilter ? filteredAssets.reduce((s, a) => s + a.currentValue, 0) : totalAssets + totalProperties)}
          </p>
        </div>
        <div className="flex gap-2">
          {showAssets && (
            <Button onClick={openAddAsset} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Asset
            </Button>
          )}
          {showProperties && (
            <Button onClick={openAddProperty} size="sm" variant="outline">
              <Home className="h-4 w-4 mr-1" /> Add Property
            </Button>
          )}
        </div>
      </div>

      {/* Financial Assets */}
      {showAssets && filteredAssets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Financial Assets</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {filteredAssets.map(a => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORY_ICONS[a.category] ?? '📦'}</span>
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[a.category] ?? a.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatCurrency(a.currentValue)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAsset(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeAsset(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Properties */}
      {showProperties && properties.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {properties.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏠</span>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.type === 'investment' ? 'Investment' : 'Primary Residence'}
                      {(p.weeklyRent ?? 0) > 0 && ` · $${p.weeklyRent}/wk rent`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatCurrency(p.currentValue)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProperty(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeProperty(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty states */}
      {showAssets && filteredAssets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No assets yet</p>
            <Button onClick={openAddAsset} variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" /> Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      )}
      {showProperties && properties.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No properties yet</p>
            <Button onClick={openAddProperty} variant="outline" size="sm" className="mt-3">
              <Home className="h-4 w-4 mr-1" /> Add Your First Property
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Savings Account" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={assetForm.category} onValueChange={v => setAssetForm(f => ({ ...f, category: v as AssetCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{CATEGORY_ICONS[k as AssetCategory]} {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Value ($)</Label>
              <Input type="number" value={assetForm.value} onChange={e => setAssetForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
              <Button onClick={saveAsset} disabled={!assetForm.name || !assetForm.value}>
                {editingAsset ? 'Save Changes' : 'Add Asset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Property Dialog */}
      <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty?.id ? 'Edit Property' : 'Add Property'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property Name</Label>
              <Input value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 123 Main Street" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={propForm.type} onValueChange={v => setPropForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary_residence">Primary Residence</SelectItem>
                  <SelectItem value="investment">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Value ($)</Label>
              <Input type="number" value={propForm.currentValue} onChange={e => setPropForm(f => ({ ...f, currentValue: e.target.value }))} />
            </div>
            {propForm.type === 'investment' && (
              <div>
                <Label>Weekly Rent ($)</Label>
                <Input type="number" value={propForm.weeklyRent} onChange={e => setPropForm(f => ({ ...f, weeklyRent: e.target.value }))} />
              </div>
            )}

            {/* Running Costs */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Running Costs</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Council Rates ($/qtr)</Label>
                  <Input type="number" value={propForm.councilRatesPA} onChange={e => setPropForm(f => ({ ...f, councilRatesPA: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Water Rates ($/qtr)</Label>
                  <Input type="number" value={propForm.waterRatesPA} onChange={e => setPropForm(f => ({ ...f, waterRatesPA: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Strata / Body Corp ($/qtr)</Label>
                  <Input type="number" value={propForm.strataPA} onChange={e => setPropForm(f => ({ ...f, strataPA: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Building Insurance ($/yr)</Label>
                  <Input type="number" value={propForm.insurancePA} onChange={e => setPropForm(f => ({ ...f, insurancePA: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Maintenance ($/yr)</Label>
                  <Input type="number" value={propForm.maintenanceBudgetPA} onChange={e => setPropForm(f => ({ ...f, maintenanceBudgetPA: e.target.value }))} />
                </div>
                {propForm.type === 'investment' && (
                  <>
                    <div>
                      <Label className="text-xs">Property Mgmt (%)</Label>
                      <Input type="number" step="0.1" value={propForm.propertyManagementPct} onChange={e => setPropForm(f => ({ ...f, propertyManagementPct: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Land Tax ($/yr)</Label>
                      <Input type="number" value={propForm.landTaxPA} onChange={e => setPropForm(f => ({ ...f, landTaxPA: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowAddProperty(false)}>Cancel</Button>
              <Button onClick={saveProperty} disabled={!propForm.name || !propForm.currentValue}>
                {editingProperty?.id ? 'Save Changes' : 'Add Property'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
