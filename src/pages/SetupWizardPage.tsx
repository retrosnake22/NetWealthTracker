import { useState, useEffect } from 'react'

import {
  ArrowRight, ArrowLeft, Check, Plus, Trash2, X,
  Sparkles, Briefcase, Wallet, Building2, CreditCard,
  Receipt, Target, TrendingUp, DollarSign, PiggyBank,
  Home, Car
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore, type FinanceState } from '@/stores/useFinanceStore'
import { formatCurrency, formatPercent, formatCompact } from '@/lib/format'
import type {
  AssetCategory, IncomeCategory, LiabilityCategory, ExpenseCategory
} from '@/types/models'

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'income', label: 'Income', icon: Briefcase },
  { id: 'assets', label: 'Assets', icon: Wallet },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'liabilities', label: 'Debts', icon: CreditCard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'projections', label: 'Goals', icon: Target },
  { id: 'summary', label: 'Summary', icon: TrendingUp },
] as const

// ── Shared constants ──────────────────────────────────────────────────────────

const INCOME_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary / Wages', rental: 'Rental Income', dividends: 'Dividends',
  interest: 'Interest', side_hustle: 'Side Hustle', other: 'Other',
}

const ASSET_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash / Savings', property: 'Property', stocks: 'Stocks / ETFs',
  super: 'Superannuation', vehicles: 'Vehicles', other: 'Other',
}

const LIABILITY_LABELS: Record<LiabilityCategory, string> = {
  mortgage: 'Mortgage', personal_loan: 'Personal Loan', car_loan: 'Car Loan',
  credit_card: 'Credit Card', hecs: 'HECS-HELP', other: 'Other',
}

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
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

const EXPENSE_QUICK_PICKS: { label: string; categories: ExpenseCategory[] }[] = [
  { label: '🏠 Housing', categories: ['mortgage_repayment', 'rent', 'council_rates', 'water_rates', 'strata'] },
  { label: '🛡️ Insurance', categories: ['insurance_home', 'insurance_health', 'insurance_car', 'insurance_life'] },
  { label: '🛒 Living', categories: ['groceries', 'utilities', 'transport', 'fuel', 'phone_internet'] },
  { label: '🎉 Lifestyle', categories: ['subscriptions', 'entertainment', 'dining_out', 'clothing', 'health_fitness', 'personal_care'] },
  { label: '📚 Other', categories: ['education', 'childcare', 'pet_expenses', 'gifts_donations', 'hecs_repayment', 'tax', 'other'] },
]

const DEFAULT_GROWTH: Record<AssetCategory, number> = {
  cash: 0.045, property: 0.07, stocks: 0.08, super: 0.07, vehicles: -0.10, other: 0.03,
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SetupWizardPage() {
  const store = useFinanceStore()
  const [currentStep, setCurrentStep] = useState(0)

  const step = STEPS[currentStep]
  const progress = ((currentStep) / (STEPS.length - 1)) * 100

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }
  const goToStep = (idx: number) => {
    setCurrentStep(idx)
  }

  const finishWizard = () => {
    localStorage.setItem('nwt-wizard-complete', 'true')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Progress Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Step Indicator ── */}
      <div className="fixed top-1 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: back button + step label */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              )}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
            </div>

            {/* Center: step dots (desktop only) */}
            <div className="hidden md:flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-primary scale-125'
                      : i < currentStep
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/20'
                  }`}
                  title={s.label}
                />
              ))}
            </div>

            {/* Right: skip/finish */}
            <div>
              {currentStep < STEPS.length - 1 ? (
                <Button variant="ghost" size="sm" onClick={finishWizard} className="text-muted-foreground">
                  Skip Setup
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-32">
        {step.id === 'welcome' && <WelcomeStep onNext={goNext} />}
        {step.id === 'income' && <IncomeStep store={store} />}
        {step.id === 'assets' && <AssetsStep store={store} />}
        {step.id === 'properties' && <PropertiesStep store={store} />}
        {step.id === 'liabilities' && <LiabilitiesStep store={store} />}
        {step.id === 'expenses' && <ExpensesStep store={store} />}
        {step.id === 'projections' && <ProjectionsStep store={store} />}
        {step.id === 'summary' && <SummaryStep store={store} onFinish={finishWizard} />}
      </div>

      {/* ── Bottom Navigation ── */}
      {step.id !== 'welcome' && step.id !== 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              You can always edit these later
            </p>
            <Button onClick={goNext} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      {/* Logo */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 animate-ping" />
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Let's map your finances
        </h1>
        <p className="text-muted-foreground text-lg">
          We'll walk through everything step by step — income, assets, debts, and expenses.
          It takes about <span className="text-foreground font-medium">5 minutes</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
        {[
          { icon: Briefcase, label: 'Income', color: 'text-emerald-500' },
          { icon: Wallet, label: 'Assets', color: 'text-blue-500' },
          { icon: CreditCard, label: 'Debts', color: 'text-red-500' },
          { icon: Receipt, label: 'Expenses', color: 'text-amber-500' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      <Button size="lg" onClick={onNext} className="gap-2 text-base px-8">
        Get Started <ArrowRight className="w-5 h-5" />
      </Button>

      <p className="text-xs text-muted-foreground">
        Already have data? Your existing entries will appear pre-filled.
      </p>
    </div>
  )
}

// ── Step 2: Income ────────────────────────────────────────────────────────────

function IncomeStep({ store }: { store: FinanceState }) {
  const { incomes, addIncome, removeIncome } = store
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'salary' as IncomeCategory, monthlyAmount: '',
  })

  const handleAdd = () => {
    if (!form.name || !form.monthlyAmount) return
    addIncome({
      name: form.name,
      category: form.category,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0,
      isActive: true,
    })
    setForm({ name: '', category: 'salary', monthlyAmount: '' })
    setShowForm(false)
  }

  const totalMonthly = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you earn?"
        description="Add your income sources. Include salary, rental income, dividends — anything that brings in money."
        icon={Briefcase}
      />

      {/* Existing items */}
      {incomes.length > 0 && (
        <div className="space-y-2">
          {incomes.map(inc => (
            <Card key={inc.id} className="card-hover group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">{inc.name}</p>
                    <p className="text-xs text-muted-foreground">{INCOME_LABELS[inc.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatCurrency(inc.monthlyAmount)}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => removeIncome(inc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-sm font-medium text-muted-foreground">Total Monthly Income</span>
            <span className="font-bold text-primary tabular-nums">{formatCurrency(totalMonthly)}</span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add Income Source</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. Full-time salary"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v: IncomeCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(INCOME_LABELS) as [IncomeCategory, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Monthly Amount</Label>
                <CurrencyInput
                  value={form.monthlyAmount}
                  onValueChange={v => setForm({ ...form, monthlyAmount: v })}
                  placeholder="0"
                />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!form.name || !form.monthlyAmount} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Income
            </Button>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Income Source</span>
        </button>
      )}
    </div>
  )
}

// ── Step 3: Assets ────────────────────────────────────────────────────────────

function AssetsStep({ store }: { store: FinanceState }) {
  const { assets, addAsset, removeAsset } = store
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'cash' as AssetCategory, currentValue: '', growthRatePA: '4.5',
  })

  const handleCategoryChange = (cat: AssetCategory) => {
    setForm({ ...form, category: cat, growthRatePA: String(DEFAULT_GROWTH[cat] * 100) })
  }

  const handleAdd = () => {
    if (!form.name || !form.currentValue) return
    addAsset({
      name: form.name,
      category: form.category,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 0) / 100,
    })
    setForm({ name: '', category: 'cash', currentValue: '', growthRatePA: '4.5' })
    setShowForm(false)
  }

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)

  const ASSET_ICONS: Record<AssetCategory, { icon: typeof Wallet; color: string }> = {
    cash: { icon: PiggyBank, color: 'text-emerald-500 bg-emerald-500/10' },
    stocks: { icon: TrendingUp, color: 'text-blue-500 bg-blue-500/10' },
    super: { icon: Target, color: 'text-violet-500 bg-violet-500/10' },
    vehicles: { icon: Car, color: 'text-amber-500 bg-amber-500/10' },
    property: { icon: Home, color: 'text-blue-500 bg-blue-500/10' },
    other: { icon: Wallet, color: 'text-gray-500 bg-gray-500/10' },
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you own?"
        description="Add your assets — savings accounts, investment portfolios, superannuation, vehicles, and anything else of value."
        icon={Wallet}
      />

      {/* Quick-add category buttons */}
      {!showForm && assets.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(ASSET_LABELS) as [AssetCategory, string][])
            .filter(([k]) => k !== 'property')
            .map(([cat, label]) => {
              const { icon: Icon, color } = ASSET_ICONS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => {
                    handleCategoryChange(cat)
                    setShowForm(true)
                  }}
                  className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2"
                >
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              )
            })}
        </div>
      )}

      {/* Existing items */}
      {assets.length > 0 && (
        <div className="space-y-2">
          {assets.map(asset => {
            const { icon: Icon, color } = ASSET_ICONS[asset.category]
            return (
              <Card key={asset.id} className="card-hover group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ASSET_LABELS[asset.category]} · {formatPercent(asset.growthRatePA)} p.a.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold tabular-nums">{formatCurrency(asset.currentValue)}</p>
                    <Button
                      variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => removeAsset(asset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-sm font-medium text-muted-foreground">Total Assets</span>
            <span className="font-bold text-primary tabular-nums">{formatCurrency(totalAssets)}</span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add Asset</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. Emergency Fund"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v: AssetCategory) => handleCategoryChange(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ASSET_LABELS) as [AssetCategory, string][])
                      .filter(([k]) => k !== 'property')
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Value</Label>
                <CurrencyInput
                  value={form.currentValue}
                  onValueChange={v => setForm({ ...form, currentValue: v })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Growth Rate (% p.a.)</Label>
                <Input
                  type="number" step="0.1"
                  value={form.growthRatePA}
                  onChange={e => setForm({ ...form, growthRatePA: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!form.name || !form.currentValue} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Asset
            </Button>
          </CardContent>
        </Card>
      ) : assets.length > 0 ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Another Asset</span>
        </button>
      ) : null}
    </div>
  )
}

// ── Step 4: Properties ────────────────────────────────────────────────────────

function PropertiesStep({ store }: { store: FinanceState }) {
  const { properties, addProperty, removeProperty, addLiability } = store
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'primary_residence' as 'primary_residence' | 'investment',
    address: '', currentValue: '', growthRatePA: '7',
    hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '',
    weeklyRent: '',
  })

  const handleAdd = () => {
    if (!form.name || !form.currentValue) return

    let mortgageId: string | undefined
    if (form.hasMortgage && form.mortgageBalance) {
      const mortData = {
        name: `${form.name} Mortgage`,
        category: 'mortgage' as const,
        currentBalance: parseFloat(form.mortgageBalance) || 0,
        interestRatePA: (parseFloat(form.interestRate) || 0) / 100,
        minimumRepayment: parseFloat(form.repayment) || 0,
        repaymentFrequency: 'monthly' as const,
      }
      addLiability(mortData)
      // Get the ID from the last added liability
      const liabs = useFinanceStore.getState().liabilities
      mortgageId = liabs[liabs.length - 1]?.id
    }

    addProperty({
      name: form.name,
      type: form.type,
      address: form.address || undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      growthRatePA: (parseFloat(form.growthRatePA) || 0) / 100,
      mortgageId,
      weeklyRent: form.type === 'investment' ? (parseFloat(form.weeklyRent) || 0) : undefined,
    })

    setForm({
      name: '', type: 'primary_residence', address: '', currentValue: '', growthRatePA: '7',
      hasMortgage: false, mortgageBalance: '', interestRate: '', repayment: '', weeklyRent: '',
    })
    setShowForm(false)
  }

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0)

  return (
    <div className="space-y-6">
      <StepHeader
        title="Do you own any property?"
        description="Add your home and any investment properties. We'll include the mortgage in the next step if you add one here."
        icon={Building2}
      />

      {properties.length > 0 && (
        <div className="space-y-2">
          {properties.map(prop => (
            <Card key={prop.id} className="card-hover group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    {prop.type === 'primary_residence' ? (
                      <Home className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Building2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{prop.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {prop.type === 'primary_residence' ? 'Primary Residence' : 'Investment'} · {formatPercent(prop.growthRatePA)} p.a.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold tabular-nums">{formatCurrency(prop.currentValue)}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => removeProperty(prop.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-sm font-medium text-muted-foreground">Total Property Value</span>
            <span className="font-bold text-primary tabular-nums">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}

      {showForm ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add Property</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Property Name</Label>
                <Input
                  placeholder="e.g. Family Home"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v: 'primary_residence' | 'investment') => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary_residence">Primary Residence</SelectItem>
                    <SelectItem value="investment">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Value</Label>
                <CurrencyInput
                  value={form.currentValue}
                  onValueChange={v => setForm({ ...form, currentValue: v })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Growth Rate (% p.a.)</Label>
                <Input
                  type="number" step="0.1"
                  value={form.growthRatePA}
                  onChange={e => setForm({ ...form, growthRatePA: e.target.value })}
                />
              </div>

              {form.type === 'investment' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Weekly Rent</Label>
                  <CurrencyInput
                    value={form.weeklyRent}
                    onValueChange={v => setForm({ ...form, weeklyRent: v })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Mortgage toggle */}
            <div className="pt-2 border-t border-border/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasMortgage}
                  onChange={e => setForm({ ...form, hasMortgage: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">This property has a mortgage</span>
              </label>

              {form.hasMortgage && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 ml-7">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mortgage Balance</Label>
                    <CurrencyInput
                      value={form.mortgageBalance}
                      onValueChange={v => setForm({ ...form, mortgageBalance: v })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Interest Rate (%)</Label>
                    <Input
                      type="number" step="0.01"
                      value={form.interestRate}
                      onChange={e => setForm({ ...form, interestRate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monthly Repayment</Label>
                    <CurrencyInput
                      value={form.repayment}
                      onValueChange={v => setForm({ ...form, repayment: v })}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleAdd} disabled={!form.name || !form.currentValue} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">{properties.length > 0 ? 'Add Another Property' : 'Add a Property'}</span>
        </button>
      )}

      {properties.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground">
          No property? No worries — hit <strong>Continue</strong> to skip.
        </p>
      )}
    </div>
  )
}

// ── Step 5: Liabilities ───────────────────────────────────────────────────────

function LiabilitiesStep({ store }: { store: FinanceState }) {
  const { liabilities, addLiability, removeLiability } = store
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'personal_loan' as LiabilityCategory,
    currentBalance: '', interestRatePA: '', minimumRepayment: '',
    repaymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
  })

  const handleAdd = () => {
    if (!form.name || !form.currentBalance) return
    addLiability({
      name: form.name,
      category: form.category,
      currentBalance: parseFloat(form.currentBalance) || 0,
      interestRatePA: (parseFloat(form.interestRatePA) || 0) / 100,
      minimumRepayment: parseFloat(form.minimumRepayment) || 0,
      repaymentFrequency: form.repaymentFrequency,
    })
    setForm({ name: '', category: 'personal_loan', currentBalance: '', interestRatePA: '', minimumRepayment: '', repaymentFrequency: 'monthly' })
    setShowForm(false)
  }

  const totalDebt = liabilities.reduce((s, l) => s + l.currentBalance, 0)
  // Separate mortgages (auto-added from properties step) from other debts
  const mortgages = liabilities.filter(l => l.category === 'mortgage')
  const otherDebts = liabilities.filter(l => l.category !== 'mortgage')

  const LIA_ICONS: Record<LiabilityCategory, { color: string }> = {
    mortgage: { color: 'text-red-500 bg-red-500/10' },
    personal_loan: { color: 'text-orange-500 bg-orange-500/10' },
    car_loan: { color: 'text-orange-500 bg-orange-500/10' },
    credit_card: { color: 'text-pink-500 bg-pink-500/10' },
    hecs: { color: 'text-violet-500 bg-violet-500/10' },
    other: { color: 'text-gray-500 bg-gray-500/10' },
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you owe?"
        description="Add any debts — personal loans, car loans, credit cards, HECS. Mortgages from the previous step are already here."
        icon={CreditCard}
      />

      {/* Show mortgages from property step */}
      {mortgages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">From Properties</p>
          {mortgages.map(m => (
            <Card key={m.id} className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${LIA_ICONS.mortgage.color} flex items-center justify-center`}>
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(m.interestRatePA)} interest · {formatCurrency(m.minimumRepayment)}/month
                    </p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums text-red-400">{formatCurrency(m.currentBalance)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Other debts */}
      {otherDebts.length > 0 && (
        <div className="space-y-2">
          {mortgages.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Other Debts</p>
          )}
          {otherDebts.map(lia => (
            <Card key={lia.id} className="card-hover group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${LIA_ICONS[lia.category].color} flex items-center justify-center`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{lia.name}</p>
                    <p className="text-xs text-muted-foreground">{LIABILITY_LABELS[lia.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold tabular-nums text-red-400">{formatCurrency(lia.currentBalance)}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => removeLiability(lia.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalDebt > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
          <span className="text-sm font-medium text-muted-foreground">Total Debt</span>
          <span className="font-bold text-red-400 tabular-nums">{formatCurrency(totalDebt)}</span>
        </div>
      )}

      {/* Quick add buttons for common debt types */}
      {!showForm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['personal_loan', 'Personal Loan'],
            ['car_loan', 'Car Loan'],
            ['credit_card', 'Credit Card'],
            ['hecs', 'HECS-HELP'],
          ] as [LiabilityCategory, string][]).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => {
                setForm({ ...form, category: cat, name: label })
                setShowForm(true)
              }}
              className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <div className={`w-8 h-8 rounded-lg ${LIA_ICONS[cat].color} flex items-center justify-center`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Add Debt</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. ANZ Credit Card"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.category} onValueChange={(v: LiabilityCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LIABILITY_LABELS) as [LiabilityCategory, string][])
                      .filter(([k]) => k !== 'mortgage')
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Balance Owing</Label>
                <CurrencyInput
                  value={form.currentBalance}
                  onValueChange={v => setForm({ ...form, currentBalance: v })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interest Rate (% p.a.)</Label>
                <Input
                  type="number" step="0.01"
                  value={form.interestRatePA}
                  onChange={e => setForm({ ...form, interestRatePA: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum Repayment</Label>
                <CurrencyInput
                  value={form.minimumRepayment}
                  onValueChange={v => setForm({ ...form, minimumRepayment: v })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={form.repaymentFrequency} onValueChange={(v: 'weekly' | 'fortnightly' | 'monthly') => setForm({ ...form, repaymentFrequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!form.name || !form.currentBalance} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Debt
            </Button>
          </CardContent>
        </Card>
      )}

      {liabilities.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground">
          Debt-free? Amazing — hit <strong>Continue</strong> to keep going.
        </p>
      )}
    </div>
  )
}

// ── Step 6: Expenses ──────────────────────────────────────────────────────────

function ExpensesStep({ store }: { store: FinanceState }) {
  const { expenseBudgets, addExpenseBudget, removeExpenseBudget } = store
  const [expandedGroup, setExpandedGroup] = useState<string | null>('🛒 Living')
  const [addingCategory, setAddingCategory] = useState<ExpenseCategory | null>(null)
  const [amount, setAmount] = useState('')

  const existingCategories = new Set(expenseBudgets.map(b => b.category))
  const totalMonthly = expenseBudgets.reduce((s, b) => s + b.monthlyBudget, 0)

  const handleAdd = (cat: ExpenseCategory) => {
    if (!amount) return
    addExpenseBudget({
      category: cat,
      label: EXPENSE_LABELS[cat],
      monthlyBudget: parseFloat(amount) || 0,
    })
    setAmount('')
    setAddingCategory(null)
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you spend?"
        description="Go through each category and enter your monthly budget. Skip what doesn't apply — you can always come back."
        icon={Receipt}
      />

      {totalMonthly > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <span className="text-sm font-medium text-muted-foreground">Total Monthly Expenses</span>
          <span className="font-bold text-amber-400 tabular-nums">{formatCurrency(totalMonthly)}</span>
        </div>
      )}

      {/* Category groups */}
      <div className="space-y-2">
        {EXPENSE_QUICK_PICKS.map(group => {
          const isExpanded = expandedGroup === group.label
          const groupTotal = expenseBudgets
            .filter(b => group.categories.includes(b.category))
            .reduce((s, b) => s + b.monthlyBudget, 0)
          const filledCount = group.categories.filter(c => existingCategories.has(c)).length

          return (
            <Card key={group.label} className="overflow-hidden">
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{group.label.split(' ')[0]}</span>
                  <div>
                    <p className="font-medium text-left">{group.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {filledCount}/{group.categories.length} entered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {groupTotal > 0 && (
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(groupTotal)}/mo</span>
                  )}
                  <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/50 px-4 py-3 space-y-2">
                  {group.categories.map(cat => {
                    const existing = expenseBudgets.find(b => b.category === cat)
                    const isAdding = addingCategory === cat

                    if (existing) {
                      return (
                        <div key={cat} className="flex items-center justify-between py-1.5 group">
                          <span className="text-sm">{EXPENSE_LABELS[cat]}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums">{formatCurrency(existing.monthlyBudget)}/mo</span>
                            <Button
                              variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => removeExpenseBudget(existing.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    }

                    if (isAdding) {
                      return (
                        <div key={cat} className="flex items-center gap-2 py-1">
                          <span className="text-sm flex-1">{EXPENSE_LABELS[cat]}</span>
                          <CurrencyInput
                            value={amount}
                            onValueChange={setAmount}
                            placeholder="$/month"
                            className="w-32 h-8 text-sm"
                          />
                          <Button size="sm" className="h-8 px-3" onClick={() => handleAdd(cat)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingCategory(null); setAmount('') }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={cat}
                        onClick={() => { setAddingCategory(cat); setAmount('') }}
                        className="flex items-center justify-between py-1.5 w-full text-left hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
                      >
                        <span className="text-sm text-muted-foreground">{EXPENSE_LABELS[cat]}</span>
                        <Plus className="w-4 h-4 text-muted-foreground/50" />
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 7: Projections ───────────────────────────────────────────────────────

function ProjectionsStep({ store }: { store: FinanceState }) {
  const { projectionSettings, updateProjectionSettings, assets, properties, liabilities } = store
  const [years, setYears] = useState(String(projectionSettings.projectionYears))

  const handleYearsChange = (v: string) => {
    setYears(v)
    const num = parseInt(v)
    if (num > 0 && num <= 50) {
      updateProjectionSettings({ projectionYears: num })
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="How far ahead do you want to plan?"
        description="Set your projection horizon. You can configure detailed surplus allocations later from the Projections page."
        icon={Target}
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Projection Period</Label>
            <div className="flex gap-2">
              {['10', '20', '30', '40'].map(y => (
                <button
                  key={y}
                  onClick={() => handleYearsChange(y)}
                  className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-all ${
                    years === y
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  {y} years
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Or set a custom period</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1} max={50}
                value={years}
                onChange={e => handleYearsChange(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary of what will be projected */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">Your projection will include:</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold tabular-nums">{assets.length}</p>
              <p className="text-xs text-muted-foreground">Assets</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{properties.length}</p>
              <p className="text-xs text-muted-foreground">Properties</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{liabilities.length}</p>
              <p className="text-xs text-muted-foreground">Debts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Step 8: Summary ───────────────────────────────────────────────────────────

function SummaryStep({ store, onFinish }: { store: FinanceState; onFinish: () => void }) {
  const { assets, properties, liabilities, incomes, expenseBudgets } = store
  const [revealed, setRevealed] = useState(false)

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
    + properties.reduce((s, p) => s + p.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.currentBalance, 0)
  const netWealth = totalAssets - totalLiabilities
  const monthlyIncome = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)
  const monthlyExpenses = expenseBudgets.reduce((s, b) => s + b.monthlyBudget, 0)
  const monthlySurplus = monthlyIncome - monthlyExpenses

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-8">
      <StepHeader
        title="Your Financial Snapshot"
        description="Here's where you stand. Welcome to your wealth tracking journey."
        icon={Sparkles}
      />

      {/* Net Wealth reveal */}
      <div className={`text-center transition-all duration-1000 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Net Wealth</p>
        <p className={`text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums ${netWealth >= 0 ? 'text-primary' : 'text-red-400'}`}>
          {formatCompact(netWealth)}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {formatCurrency(totalAssets)} in assets − {formatCurrency(totalLiabilities)} in debts
        </p>
      </div>

      {/* Breakdown cards */}
      <div className={`grid grid-cols-2 gap-3 transition-all duration-1000 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Monthly Income</p>
            <p className="text-xl font-bold text-emerald-400 tabular-nums mt-1">{formatCurrency(monthlyIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{incomes.length} source{incomes.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Monthly Expenses</p>
            <p className="text-xl font-bold text-amber-400 tabular-nums mt-1">{formatCurrency(monthlyExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenseBudgets.length} categor{expenseBudgets.length !== 1 ? 'ies' : 'y'}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Monthly Surplus</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${monthlySurplus >= 0 ? 'text-primary' : 'text-red-400'}`}>
              {formatCurrency(monthlySurplus)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlySurplus >= 0 ? 'Available to save or invest each month' : 'You\'re spending more than you earn'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset breakdown */}
      {(assets.length > 0 || properties.length > 0) && (
        <div className={`transition-all duration-1000 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Asset Breakdown</p>
          <div className="space-y-2">
            {[
              ...properties.map(p => ({ name: p.name, value: p.currentValue, color: 'bg-blue-500' })),
              ...assets.map(a => ({ name: a.name, value: a.currentValue, color: a.category === 'cash' ? 'bg-emerald-500' : a.category === 'stocks' ? 'bg-blue-500' : a.category === 'super' ? 'bg-violet-500' : a.category === 'vehicles' ? 'bg-amber-500' : 'bg-gray-500' })),
            ]
              .sort((a, b) => b.value - a.value)
              .map((item, i) => {
                const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-semibold tabular-nums w-24 text-right">{formatCurrency(item.value)}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Finish */}
      <div className={`transition-all duration-1000 delay-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Button size="lg" onClick={onFinish} className="w-full gap-2 text-base py-6">
          <Sparkles className="w-5 h-5" /> Go to Dashboard
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          You can re-run this wizard anytime from the sidebar menu
        </p>
      </div>
    </div>
  )
}

// ── Shared Components ─────────────────────────────────────────────────────────

function StepHeader({ title, description, icon: Icon }: { title: string; description: string; icon: typeof Sparkles }) {
  return (
    <div className="space-y-2 mb-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
