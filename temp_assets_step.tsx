// -- Step 3: Other Assets (non-property) --

function AssetsStep({ store }: { store: FinanceState }) {
  const {
    assets, addAsset, removeAsset, updateAsset,
    addLiability, addExpenseBudget,
  } = store

  const [activeTab, setActiveTab] = useState<AssetTab>('cash')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [assetForm, setAssetForm] = useState({
    name: '', currentValue: '', growthRatePA: '4.5',
    vehicleFinancing: 'owned' as 'owned' | 'car_loan' | 'lease',
    loanBalance: '', loanRate: '', loanRepayment: '', leasePayment: '',
    cashType: 'bank' as 'cash' | 'bank',
    bankName: '',
    interestRate: '',
  })

  const resetForm = () => {
    setAssetForm({
      name: '', currentValue: '', growthRatePA: String((DEFAULT_GROWTH[activeTab] * 100).toFixed(1)),
      vehicleFinancing: 'owned', loanBalance: '', loanRate: '', loanRepayment: '', leasePayment: '',
      cashType: 'bank' as 'cash' | 'bank', bankName: '', interestRate: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleTabChange = (tab: AssetTab) => {
    resetForm()
    setActiveTab(tab)
    setAssetForm(f => ({ ...f, growthRatePA: (DEFAULT_GROWTH[tab] * 100).toFixed(1) }))
  }

  const startEditAsset = (asset: typeof assets[0]) => {
    const va = asset as any
    setAssetForm({
      name: asset.name,
      currentValue: String(asset.currentValue),
      growthRatePA: (asset.growthRatePA * 100).toFixed(1),
      vehicleFinancing: va.financingType ?? 'owned',
      loanBalance: '', loanRate: '', loanRepayment: '', leasePayment: '',
      cashType: va.cashType || 'bank',
      bankName: va.bankName || '',
      interestRate: va.cashType === 'cash' ? '0' : (asset.growthRatePA * 100).toFixed(1),
    })
    setEditingId(asset.id)
    setShowForm(true)
  }

  const handleAddAsset = () => {
    if (!assetForm.name || !assetForm.currentValue) return
    const cashFields = activeTab === 'cash' ? {
      cashType: assetForm.cashType || 'bank',
      bankName: assetForm.cashType === 'bank' ? assetForm.bankName : undefined,
      growthRatePA: assetForm.cashType === 'cash' ? 0 : pctToFraction(assetForm.interestRate || '0', 1),
    } : {}
    if (editingId) {
      updateAsset(editingId, {
        name: assetForm.name,
        category: activeTab as AssetCategory,
        currentValue: parseFloat(assetForm.currentValue) || 0,
        growthRatePA: activeTab === 'cash'
          ? (assetForm.cashType === 'cash' ? 0 : pctToFraction(assetForm.interestRate || '0', 1))
          : pctToFraction(assetForm.growthRatePA, 1),
        ...(activeTab === 'vehicles' ? { financingType: assetForm.vehicleFinancing } : {}),
        ...cashFields,
      } as any)
    } else {
      addAsset({
        name: assetForm.name,
        category: activeTab as AssetCategory,
        currentValue: parseFloat(assetForm.currentValue) || 0,
        growthRatePA: activeTab === 'cash'
          ? (assetForm.cashType === 'cash' ? 0 : pctToFraction(assetForm.interestRate || '0', 1))
          : pctToFraction(assetForm.growthRatePA, 1),
        ...(activeTab === 'vehicles' ? { financingType: assetForm.vehicleFinancing } : {}),
        ...cashFields,
      } as any)

      // Handle vehicle financing side-effects
      if (activeTab === 'vehicles' && assetForm.vehicleFinancing !== 'owned') {
        const latestAssets = useFinanceStore.getState().assets
        const newAssetId = latestAssets[latestAssets.length - 1]?.id

        if (assetForm.vehicleFinancing === 'car_loan' && assetForm.loanBalance) {
          addLiability({
            name: `${assetForm.name} Car Loan`,
            category: 'car_loan' as const,
            currentBalance: parseFloat(assetForm.loanBalance) || 0,
            interestRatePA: pctToFraction(assetForm.loanRate, 2),
            minimumRepayment: parseFloat(assetForm.loanRepayment) || 0,
            repaymentFrequency: 'monthly' as const,
          })
          if (newAssetId) {
            const latestLiabs = useFinanceStore.getState().liabilities
            const newLiabId = latestLiabs[latestLiabs.length - 1]?.id
            if (newLiabId) {
              updateAsset(newAssetId, { linkedLiabilityId: newLiabId } as any)
            }
          }
        } else if (assetForm.vehicleFinancing === 'lease' && assetForm.leasePayment) {
          addExpenseBudget({
            label: `${assetForm.name} Lease`,
            category: 'transport' as const,
            monthlyBudget: parseFloat(assetForm.leasePayment) || 0,
          })
          if (newAssetId) {
            const latestBudgets = useFinanceStore.getState().expenseBudgets
            const newBudgetId = latestBudgets[latestBudgets.length - 1]?.id
            if (newBudgetId) {
              updateAsset(newAssetId, {
                linkedExpenseId: newBudgetId,
                leaseMonthlyPayment: parseFloat(assetForm.leasePayment) || 0,
              } as any)
            }
          }
        }
      }
    }
    resetForm()
  }

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const tabAssets = assets.filter(a => a.category === activeTab)

  const getTabCount = (tab: AssetTab) => {
    return assets.filter(a => a.category === tab).length
  }

  const renderAssetForm = () => (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{editingId ? `Edit ${ASSET_LABELS[activeTab]}` : `Add ${ASSET_LABELS[activeTab]}`}</h3>
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder={activeTab === 'cash' ? 'e.g. Emergency Fund' : activeTab === 'stocks' ? 'e.g. VDHG Portfolio' : activeTab === 'super' ? 'e.g. AustralianSuper' : activeTab === 'vehicles' ? 'e.g. 2020 Toyota RAV4' : 'e.g. Collectibles'}
              value={assetForm.name}
              onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Current Value</Label>
            <CurrencyInput
              value={assetForm.currentValue}
              onValueChange={v => setAssetForm({ ...assetForm, currentValue: v })}
              placeholder="0"
            />
          </div>
          {activeTab === 'cash' && (
            <div className="space-y-3 sm:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Account Type</Label>
                <div className="flex gap-2">
                  {(['cash', 'bank'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setAssetForm({ ...assetForm, cashType: t as any, interestRate: t === 'bank' ? '' : '0' })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        (assetForm as any).cashType === t || (!((assetForm as any).cashType) && t === 'bank')
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/30 text-muted-foreground'
                      }`}
                    >
                      {t === 'cash' ? '💵 Cash' : '🏦 Bank Account'}
                    </button>
                  ))}
                </div>
              </div>
              {((assetForm as any).cashType === 'bank' || !(assetForm as any).cashType) && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bank Name</Label>
                    <Input
                      placeholder="e.g. Commonwealth Bank"
                      value={(assetForm as any).bankName || ''}
                      onChange={e => setAssetForm({ ...assetForm, bankName: e.target.value } as any)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Interest Rate (% p.a.)</Label>
                    <Input
                      type="number" step="0.1" min="0" max="20"
                      value={assetForm.interestRate}
                      onChange={e => setAssetForm({ ...assetForm, interestRate: e.target.value })}
                      placeholder="e.g. 3.0"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Interest income will be included in your income calculations
                    </p>
                  </div>
                </>
              )}
              {(assetForm as any).cashType === 'cash' && (
                <p className="text-xs text-muted-foreground">
                  No interest is calculated for physical cash holdings.
                </p>
              )}
            </div>
          )}
          {/* Vehicle financing fields */}
          {activeTab === 'vehicles' && (
            <div className="sm:col-span-2">
              <VehicleFinancingFields
                vehicleFinancing={assetForm.vehicleFinancing}
                loanBalance={assetForm.loanBalance}
                loanRate={assetForm.loanRate}
                loanRepayment={assetForm.loanRepayment}
                leasePayment={assetForm.leasePayment}
                onChange={updates => setAssetForm(prev => ({ ...prev, ...updates }))}
              />
            </div>
          )}
        </div>
        <Button onClick={handleAddAsset} disabled={!assetForm.name || !assetForm.currentValue} className="w-full gap-2">
          {editingId ? <><Check className="w-4 h-4" /> Save Changes</> : <><Plus className="w-4 h-4" /> Add {ASSET_LABELS[activeTab]}</>}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you own?"
        description="Add your savings, investments, super, vehicles, and other assets."
        icon={Wallet}
      />

      {totalAssets > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Total Assets</span>
          <span className="font-bold text-primary tabular-nums">{formatCurrency(totalAssets)}</span>
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ASSET_TABS.map(tab => {
          const count = getTabCount(tab.id)
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : count > 0
                  ? 'border-border bg-muted/30 text-foreground'
                  : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {count > 0 && (
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                  isActive ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Asset tab content */}
      <div className="space-y-4">
        {tabAssets.length > 0 && (
          <div className="space-y-2">
            {tabAssets.map(asset => {
              const tabConfig = ASSET_TABS.find(t => t.id === asset.category)!
              const Icon = tabConfig.icon
              return (
                <div key={asset.id} className="space-y-2">
                  <Card className="card-hover">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${tabConfig.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ASSET_LABELS[asset.category]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold tabular-nums">{formatCurrency(asset.currentValue)}</p>
                        <Button variant="ghost" size="icon" onClick={() => startEditAsset(asset)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeAsset(asset.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {editingId === asset.id && showForm && renderAssetForm()}
                </div>
              )
            })}
          </div>
        )}

        {/* Asset form — only at bottom for NEW items */}
        {showForm && !editingId ? (
          renderAssetForm()
        ) : !showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">{tabAssets.length > 0 ? `Add Another ${ASSET_LABELS[activeTab]}` : `Add ${ASSET_LABELS[activeTab]}`}</span>
          </button>
        )}
      </div>
    </div>
  )
}
