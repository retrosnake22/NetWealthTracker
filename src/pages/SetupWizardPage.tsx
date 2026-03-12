import { useState, useEffect, useMemo } from 'react'

import {
  ArrowRight, ArrowLeft, Check, Plus, Trash2, X, Pencil,
  Sparkles, Briefcase, Wallet, Building2, CreditCard,
  Receipt, Target, TrendingUp, DollarSign, PiggyBank,
  Home, Car, Info, User, Users, Moon, Sun, Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFinanceStore, type FinanceState } from '@/stores/useFinanceStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatPercent, formatCompact } from '@/lib/format'
import { calculateTaxBreakdown } from '@/lib/ausTax'
import type {
  AssetCategory, IncomeCategory, IncomeItem, LiabilityCategory, MortgageType, Property
} from '@/types/models'
import { ExpensesStep } from './SetupWizardExpensesStep'
import { VehicleFinancingFields } from '@/components/forms/VehicleFinancingFields'
import { useThemeMode } from '@/hooks/useThemeMode'

// -- Mortgage calculation helpers --

function calcInterestOnlyMonthly(balance: number, annualRate: number): number {
  return (balance * annualRate) / 12
}

function calcPIMonthly(balance: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return balance / (termYears * 12)
  const r = annualRate / 12
  const n = termYears * 12
  return balance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function calcMortgageMonthly(balance: number, annualRate: number, type: MortgageType, termYears: number): number {
  if (type === 'interest_only') return calcInterestOnlyMonthly(balance, annualRate)
  return calcPIMonthly(balance, annualRate, termYears)
}

// -- Rounding helpers --

function pctToFraction(pctStr: string, decimals: number): number {
  const raw = parseFloat(pctStr) || 0
  const rounded = parseFloat(raw.toFixed(decimals))
  return rounded / 100
}

function autoCalcRepayment(balance: string, rate: string, type: MortgageType, term: string): string {
  const bal = parseFloat(balance) || 0
  const r = (parseFloat(rate) || 0) / 100
  const t = parseInt(term) || 30
  if (bal <= 0) return ''
  const monthly = calcMortgageMonthly(bal, r, type, t)
  return Math.round(monthly).toString()
}

// -- Step definitions --

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'assets', label: 'Assets & Property', icon: Wallet },
  { id: 'liabilities', label: 'Debts', icon: CreditCard },
  { id: 'income', label: 'Income', icon: Briefcase },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'summary', label: 'Summary', icon: TrendingUp },
] as const

// -- Shared constants --

const INCOME_LABELS: Record<IncomeCategory, string> = {
  salary: 'Salary / Wages', rental: 'Rental Income', dividends: 'Dividends',
  interest: 'Interest', side_hustle: 'Side Hustle', other: 'Other',
}

const ASSET_LABELS: Record<AssetCategory, string> = {
  cash: 'Cash & Savings', property: 'Property', stocks: 'Shares / Stocks',
  super: 'Superannuation', vehicles: 'Vehicles', other: 'Other',
}

const LIABILITY_LABELS: Record<LiabilityCategory, string> = {
  mortgage: 'Mortgage', home_loan: 'Home Loan', personal_loan: 'Personal Loan',
  car_loan: 'Car Loan', credit_card: 'Credit Card', hecs: 'HECS-HELP', other: 'Other',
}


const DEFAULT_GROWTH: Record<AssetCategory, number> = {
  cash: 0.045, property: 0.07, stocks: 0.08, super: 0.07, vehicles: -0.10, other: 0.03,
}

// Asset type tabs config
type AssetTab = AssetCategory
const ASSET_TABS: { id: AssetTab; label: string; icon: typeof Wallet; color: string }[] = [
  { id: 'cash', label: 'Cash & Savings', icon: PiggyBank, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'property', label: 'Property', icon: Home, color: 'text-sky-500 bg-sky-500/10' },
  { id: 'stocks', label: 'Shares / Stocks', icon: TrendingUp, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'super', label: 'Super', icon: Target, color: 'text-violet-500 bg-violet-500/10' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'other', label: 'Other', icon: Wallet, color: 'text-gray-500 bg-gray-500/10' },
]

// -- Main Component --

export function SetupWizardPage() {
  const store = useFinanceStore()
  const [themeMode, setThemeMode] = useThemeMode()

  // Always start at step 0 — data is preserved from previous runs
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

  const finishWizard = async () => {
    const { data } = await supabase.auth.getSession()
    const uid = data?.session?.user?.id ?? 'anonymous'
    localStorage.setItem(`nwt-wizard-complete-${uid}`, 'true')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className="fixed top-1 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
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
                  {step.id === 'welcome' ? 'Welcome' : step.id === 'summary' ? 'Financial Snapshot' : `Step ${currentStep} of ${STEPS.length - 2}`}
                </span>
              </div>
            </div>

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

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light')}
                title={themeMode === 'light' ? 'Dark Mode' : themeMode === 'dark' ? 'Auto' : 'Light Mode'}
              >
                {themeMode === 'light' ? <Moon className="h-4 w-4" /> : themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button variant="ghost" size="sm" onClick={finishWizard} className="text-muted-foreground">
                  Save & Exit
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-32">
        {step.id === 'welcome' && <WelcomeStep store={store} onNext={goNext} />}
        {step.id === 'assets' && <AssetsStep store={store} />}
        {step.id === 'liabilities' && <LiabilitiesStep store={store} />}
        {step.id === 'income' && <IncomeStep store={store} />}
        {step.id === 'expenses' && <ExpensesStep store={store} />}
        {step.id === 'summary' && <SummaryStep store={store} onFinish={finishWizard} />}
      </div>

      {/* Bottom Navigation */}
      {step.id !== 'welcome' && step.id !== 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <Button variant="outline" onClick={goBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={goNext} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// -- Step 1: Welcome + Profile (merged) --

function WelcomeStep({ store, onNext }: { store: FinanceState; onNext: () => void }) {
  const { userProfile, setProfileType, setIndividualName, addHouseholdMember, updateHouseholdMember, removeHouseholdMember } = store
  const [newMemberName, setNewMemberName] = useState('')

  const handleAddMember = () => {
    if (!newMemberName.trim()) return
    addHouseholdMember(newMemberName.trim())
    setNewMemberName('')
  }

  const canContinue = userProfile.profileType === 'household'
    ? userProfile.householdMembers.length > 0
    : true

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 animate-ping" />
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Let's map your finances
        </h1>
        <p className="text-muted-foreground text-lg">
          We'll walk through everything step by step — assets, debts, income, and expenses.
          It takes about <span className="text-foreground font-medium">5 minutes</span>.
        </p>
      </div>

      {/* Profile selection inline */}
      <div className="w-full max-w-lg space-y-4 text-left">
        <p className="text-sm font-medium text-center text-muted-foreground">Who is this tracker for?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setProfileType('individual')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              userProfile.profileType === 'individual'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              userProfile.profileType === 'individual' ? 'bg-primary/20' : 'bg-muted'
            }`}>
              <User className={`w-5 h-5 ${userProfile.profileType === 'individual' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="font-semibold mb-0.5">Individual</h3>
            <p className="text-xs text-muted-foreground">
              Track your personal finances — one income, one set of goals.
            </p>
          </button>

          <button
            onClick={() => setProfileType('household')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              userProfile.profileType === 'household'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              userProfile.profileType === 'household' ? 'bg-primary/20' : 'bg-muted'
            }`}>
              <Users className={`w-5 h-5 ${userProfile.profileType === 'household' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <h3 className="font-semibold mb-0.5">Household</h3>
            <p className="text-xs text-muted-foreground">
              Track combined finances — multiple incomes contributing to shared goals.
            </p>
          </button>
        </div>

        {userProfile.profileType === 'individual' && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">What's your name?</h3>
              <Input
                placeholder="e.g. John"
                value={userProfile.individualName || ''}
                onChange={(e) => setIndividualName(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        {userProfile.profileType === 'household' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-0.5">Household Members</h3>
                <p className="text-xs text-muted-foreground">
                  Add each person. You'll assign salaries to each member later.
                </p>
              </div>

              {userProfile.householdMembers.length > 0 && (
                <div className="space-y-2">
                  {userProfile.householdMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <Input
                        value={member.name}
                        onChange={(e) => updateHouseholdMember(member.id, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => removeHouseholdMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Sarah"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember() }}
                  className="flex-1"
                />
                <Button onClick={handleAddMember} disabled={!newMemberName.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {userProfile.householdMembers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Add at least one household member to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Button size="lg" onClick={onNext} className="gap-2 text-base px-8" disabled={!canContinue}>
        Get Started <ArrowRight className="w-5 h-5" />
      </Button>

      <p className="text-xs text-muted-foreground">
        Already have data? Your existing entries will appear pre-filled.
      </p>
    </div>
  )
}

// -- Step 2: Assets & Property (unified) --

function AssetsStep({ store }: { store: FinanceState }) {
  const {
    assets, addAsset, removeAsset, updateAsset,
    properties, addProperty, removeProperty, addLiability, updateProperty,
    liabilities, updateLiability, removeLiability,
    addExpenseBudget,
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

  const [propForm, setPropForm] = useState({
    name: '', type: 'primary_residence' as 'primary_residence' | 'investment',
    address: '', currentValue: '', growthRatePA: '7.0',
    hasMortgage: true, mortgageBalance: '', interestRate: '', repayment: '',
    mortgageType: 'principal_and_interest' as MortgageType,
    loanTermYears: '30',
    repaymentOverridden: false,
    weeklyRent: '',
    councilRatesPA: '', waterRatesPA: '', insurancePA: '', strataPA: '',
    propertyManagementPct: '', landTaxPA: '', maintenanceBudgetPA: '',
  })

  const resetForm = () => {
    setAssetForm({
      name: '', currentValue: '', growthRatePA: String((DEFAULT_GROWTH[activeTab] * 100).toFixed(1)),
      vehicleFinancing: 'owned', loanBalance: '', loanRate: '', loanRepayment: '', leasePayment: '',
      cashType: 'bank' as 'cash' | 'bank', bankName: '', interestRate: '',
    })
    setPropForm({
      name: '', type: 'primary_residence', address: '', currentValue: '', growthRatePA: '7.0',
      hasMortgage: true, mortgageBalance: '', interestRate: '', repayment: '',
      mortgageType: 'principal_and_interest', loanTermYears: '30',
      repaymentOverridden: false, weeklyRent: '',
      councilRatesPA: '', waterRatesPA: '', insurancePA: '', strataPA: '',
      propertyManagementPct: '', landTaxPA: '', maintenanceBudgetPA: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleTabChange = (tab: AssetTab) => {
    resetForm()
    setActiveTab(tab)
    setAssetForm(f => ({ ...f, growthRatePA: (DEFAULT_GROWTH[tab] * 100).toFixed(1) }))
  }

  const updateMortgageField = (updates: Partial<typeof propForm>) => {
    const next = { ...propForm, ...updates }
    if (!next.repaymentOverridden && next.hasMortgage) {
      next.repayment = autoCalcRepayment(next.mortgageBalance, next.interestRate, next.mortgageType, next.loanTermYears)
    }
    setPropForm(next)
  }

  // -- Asset CRUD --
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

  // -- Property CRUD --
  const startEditProperty = (prop: typeof properties[0]) => {
    const linkedMortgage = prop.mortgageId
      ? liabilities.find(l => l.id === prop.mortgageId)
      : undefined

    setPropForm({
      name: prop.name,
      type: prop.type,
      address: prop.address || '',
      currentValue: String(prop.currentValue),
      growthRatePA: (prop.growthRatePA * 100).toFixed(1),
      hasMortgage: !!linkedMortgage,
      mortgageBalance: linkedMortgage ? String(linkedMortgage.currentBalance) : '',
      interestRate: linkedMortgage ? (linkedMortgage.interestRatePA * 100).toFixed(2) : '',
      repayment: linkedMortgage ? String(linkedMortgage.minimumRepayment) : '',
      mortgageType: linkedMortgage?.mortgageType || 'principal_and_interest',
      loanTermYears: linkedMortgage?.loanTermYears ? String(linkedMortgage.loanTermYears) : '30',
      repaymentOverridden: false,
      weeklyRent: prop.weeklyRent ? String(prop.weeklyRent) : '',
      councilRatesPA: prop.councilRatesPA ? String(prop.councilRatesPA / 4) : '',
      waterRatesPA: prop.waterRatesPA ? String(prop.waterRatesPA / 4) : '',
      insurancePA: prop.insurancePA ? String(prop.insurancePA) : '',
      strataPA: prop.strataPA ? String(prop.strataPA / 4) : '',
      propertyManagementPct: prop.propertyManagementPct ? String(prop.propertyManagementPct) : '',
      landTaxPA: prop.landTaxPA ? String(prop.landTaxPA) : '',
      maintenanceBudgetPA: prop.maintenanceBudgetPA ? String(prop.maintenanceBudgetPA) : '',
    })
    setEditingId(prop.id)
    setShowForm(true)
  }

  const handleAddProperty = () => {
    if (!propForm.name || !propForm.currentValue) return

    if (editingId) {
      const prop = properties.find(p => p.id === editingId)
      updateProperty(editingId, {
        name: propForm.name,
        type: propForm.type,
        address: propForm.address || undefined,
        currentValue: parseFloat(propForm.currentValue) || 0,
        growthRatePA: pctToFraction(propForm.growthRatePA, 1),
        weeklyRent: propForm.type === 'investment' ? (parseFloat(propForm.weeklyRent) || 0) : undefined,
        councilRatesPA: (parseFloat(propForm.councilRatesPA) || 0) * 4 || undefined,
        waterRatesPA: (parseFloat(propForm.waterRatesPA) || 0) * 4 || undefined,
        insurancePA: parseFloat(propForm.insurancePA) || undefined,
        strataPA: (parseFloat(propForm.strataPA) || 0) * 4 || undefined,
        propertyManagementPct: propForm.type === 'investment' ? (parseFloat(propForm.propertyManagementPct) || undefined) : undefined,
        landTaxPA: propForm.type === 'investment' ? (parseFloat(propForm.landTaxPA) || undefined) : undefined,
        maintenanceBudgetPA: parseFloat(propForm.maintenanceBudgetPA) || undefined,
      })

      if (propForm.hasMortgage && propForm.mortgageBalance) {
        const mortgageData = {
          name: `${propForm.name} Mortgage`,
          category: 'mortgage' as const,
          currentBalance: parseFloat(propForm.mortgageBalance) || 0,
          interestRatePA: pctToFraction(propForm.interestRate, 2),
          minimumRepayment: parseFloat(propForm.repayment) || 0,
          repaymentFrequency: 'monthly' as const,
          mortgageType: propForm.mortgageType,
          loanTermYears: parseInt(propForm.loanTermYears) || 30,
        }

        if (prop?.mortgageId) {
          updateLiability(prop.mortgageId, mortgageData)
        } else {
          addLiability(mortgageData)
          const liabs = useFinanceStore.getState().liabilities
          const newMortgageId = liabs[liabs.length - 1]?.id
          if (newMortgageId) {
            updateProperty(editingId, { mortgageId: newMortgageId })
          }
        }
      } else if (prop?.mortgageId && !propForm.hasMortgage) {
        removeLiability(prop.mortgageId)
        updateProperty(editingId, { mortgageId: undefined })
      }

      resetForm()
      return
    }

    // Adding new property
    let mortgageId: string | undefined
    if (propForm.hasMortgage && propForm.mortgageBalance) {
      const mortData = {
        name: `${propForm.name} Mortgage`,
        category: 'mortgage' as const,
        currentBalance: parseFloat(propForm.mortgageBalance) || 0,
        interestRatePA: pctToFraction(propForm.interestRate, 2),
        minimumRepayment: parseFloat(propForm.repayment) || 0,
        repaymentFrequency: 'monthly' as const,
        mortgageType: propForm.mortgageType,
        loanTermYears: parseInt(propForm.loanTermYears) || 30,
      }
      addLiability(mortData)
      const liabs = useFinanceStore.getState().liabilities
      mortgageId = liabs[liabs.length - 1]?.id
    }

    addProperty({
      name: propForm.name,
      type: propForm.type,
      address: propForm.address || undefined,
      currentValue: parseFloat(propForm.currentValue) || 0,
      growthRatePA: pctToFraction(propForm.growthRatePA, 1),
      mortgageId,
      weeklyRent: propForm.type === 'investment' ? (parseFloat(propForm.weeklyRent) || 0) : undefined,
      councilRatesPA: (parseFloat(propForm.councilRatesPA) || 0) * 4 || undefined,
      waterRatesPA: (parseFloat(propForm.waterRatesPA) || 0) * 4 || undefined,
      insurancePA: parseFloat(propForm.insurancePA) || undefined,
      strataPA: (parseFloat(propForm.strataPA) || 0) * 4 || undefined,
      propertyManagementPct: propForm.type === 'investment' ? (parseFloat(propForm.propertyManagementPct) || undefined) : undefined,
      landTaxPA: propForm.type === 'investment' ? (parseFloat(propForm.landTaxPA) || undefined) : undefined,
      maintenanceBudgetPA: parseFloat(propForm.maintenanceBudgetPA) || undefined,
    })

    resetForm()
  }

  const handleDeleteProperty = (propId: string) => {
    const prop = properties.find(p => p.id === propId)
    if (prop?.mortgageId) {
      removeLiability(prop.mortgageId)
    }
    removeProperty(propId)
  }

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalProperties = properties.reduce((s, p) => s + p.currentValue, 0)
  const grandTotal = totalAssets + totalProperties

  const tabAssets = activeTab === 'property' ? [] : assets.filter(a => a.category === activeTab)
  const tabProperties = activeTab === 'property' ? properties : []
  const isPropertyTab = activeTab === 'property'

  const getTabCount = (tab: AssetTab) => {
    if (tab === 'property') return properties.length
    return assets.filter(a => a.category === tab).length
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you own?"
        description="Add all your assets: savings, investments, super, vehicles, and property."
        icon={Wallet}
      />

      {grandTotal > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Total Assets</span>
          <span className="font-bold text-primary tabular-nums">{formatCurrency(grandTotal)}</span>
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

      {/* Property tab content */}
      {isPropertyTab && (
        <div className="space-y-4">
          {tabProperties.length > 0 && (
            <div className="space-y-2">
              {tabProperties.map(prop => {
                const linkedMortgage = prop.mortgageId
                  ? liabilities.find(l => l.id === prop.mortgageId)
                  : undefined
                return (
                  <Card key={prop.id} className="card-hover">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                          {prop.type === 'primary_residence' ? (
                            <Home className="w-5 h-5 text-sky-500" />
                          ) : (
                            <Building2 className="w-5 h-5 text-sky-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{prop.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prop.type === 'primary_residence' ? 'Primary Residence' : 'Investment'}
                            {prop.weeklyRent ? ` · ${formatCurrency(prop.weeklyRent)}/wk rent` : ''}
                            {linkedMortgage ? ` · ${linkedMortgage.mortgageType === 'interest_only' ? 'IO' : 'P&I'} ${formatCurrency(linkedMortgage.minimumRepayment)}/mo` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold tabular-nums">{formatCurrency(prop.currentValue)}</p>
                        <Button variant="ghost" size="icon" onClick={() => startEditProperty(prop)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProperty(prop.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Property form */}
          {showForm ? (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{editingId ? 'Edit Property' : 'Add Property'}</h3>
                  <Button variant="ghost" size="icon" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Property Name</Label>
                    <Input
                      placeholder="e.g. Family Home"
                      value={propForm.name}
                      onChange={e => setPropForm({ ...propForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={propForm.type} onValueChange={(v: 'primary_residence' | 'investment') => setPropForm({ ...propForm, type: v })}>
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
                      value={propForm.currentValue}
                      onValueChange={v => setPropForm({ ...propForm, currentValue: v })}
                      placeholder="0"
                    />
                  </div>

                  {propForm.type === 'investment' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Weekly Rent</Label>
                      <CurrencyInput
                        value={propForm.weeklyRent}
                        onValueChange={v => setPropForm({ ...propForm, weeklyRent: v })}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        This will be automatically added to your income
                      </p>
                    </div>
                  )}
                </div>

                {/* Property Running Costs */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                    Property Running Costs (Annual)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Council Rates ($/quarter)</Label>
                      <CurrencyInput
                        value={propForm.councilRatesPA}
                        onValueChange={v => setPropForm({ ...propForm, councilRatesPA: v })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Water Rates ($/quarter)</Label>
                      <CurrencyInput
                        value={propForm.waterRatesPA}
                        onValueChange={v => setPropForm({ ...propForm, waterRatesPA: v })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Building / Landlord Insurance ($ p.a.)</Label>
                      <CurrencyInput
                        value={propForm.insurancePA}
                        onValueChange={v => setPropForm({ ...propForm, insurancePA: v })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Strata / Body Corp ($/quarter)</Label>
                      <CurrencyInput
                        value={propForm.strataPA}
                        onValueChange={v => setPropForm({ ...propForm, strataPA: v })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Maintenance Budget ($ p.a.)</Label>
                      <CurrencyInput
                        value={propForm.maintenanceBudgetPA}
                        onValueChange={v => setPropForm({ ...propForm, maintenanceBudgetPA: v })}
                        placeholder="0"
                      />
                    </div>
                    {propForm.type === 'investment' && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Property Management Fee (%)</Label>
                          <Input
                            type="number" step="0.1" min="0" max="20"
                            value={propForm.propertyManagementPct}
                            onChange={e => setPropForm({ ...propForm, propertyManagementPct: e.target.value })}
                            placeholder="e.g. 7"
                          />
                          {propForm.weeklyRent && propForm.propertyManagementPct && (
                            <p className="text-xs text-muted-foreground">
                              &asymp; {formatCurrency(parseFloat(propForm.weeklyRent) * 52 * parseFloat(propForm.propertyManagementPct) / 100 / 12)}/mo
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Land Tax ($ p.a.)</Label>
                          <CurrencyInput
                            value={propForm.landTaxPA}
                            onValueChange={v => setPropForm({ ...propForm, landTaxPA: v })}
                            placeholder="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                    <Info className="w-3 h-3" />
                    These will automatically appear in your monthly expenses
                  </p>
                </div>

                {/* Mortgage section */}
                <div className="pt-2 border-t border-border/50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propForm.hasMortgage}
                      onChange={e => updateMortgageField({ hasMortgage: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">This property has a mortgage</span>
                  </label>

                  {propForm.hasMortgage && (
                    <div className="space-y-3 mt-3 ml-7">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Mortgage details will appear in the Debts section and repayments in your monthly expenses
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Loan Type</Label>
                          <Select
                            value={propForm.mortgageType}
                            onValueChange={(v: MortgageType) => updateMortgageField({ mortgageType: v })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="principal_and_interest">Principal & Interest</SelectItem>
                              <SelectItem value="interest_only">Interest Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {propForm.mortgageType === 'principal_and_interest' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Loan Term (years)</Label>
                            <Input
                              type="number" min="1" max="40"
                              value={propForm.loanTermYears}
                              onChange={e => updateMortgageField({ loanTermYears: e.target.value })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Mortgage Balance</Label>
                          <CurrencyInput
                            value={propForm.mortgageBalance}
                            onValueChange={v => updateMortgageField({ mortgageBalance: v })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Interest Rate (% p.a.)</Label>
                          <Input
                            type="number" step="0.01" min="0" max="30"
                            value={propForm.interestRate}
                            onChange={e => updateMortgageField({ interestRate: e.target.value })}
                            onBlur={e => {
                              const clamped = parseFloat(e.target.value || '0').toFixed(2)
                              updateMortgageField({ interestRate: clamped })
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Min. Monthly Repayment
                          {!propForm.repaymentOverridden && propForm.repayment ? ' (auto-calculated)' : ''}
                        </Label>
                        <CurrencyInput
                          value={propForm.repayment}
                          onValueChange={v => setPropForm({ ...propForm, repayment: v, repaymentOverridden: true })}
                          placeholder="0"
                        />
                        {propForm.repaymentOverridden && propForm.mortgageBalance && propForm.interestRate && (
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              const calc = autoCalcRepayment(propForm.mortgageBalance, propForm.interestRate, propForm.mortgageType, propForm.loanTermYears)
                              setPropForm({ ...propForm, repayment: calc, repaymentOverridden: false })
                            }}
                          >
                            Reset to calculated amount
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleAddProperty} disabled={!propForm.name || !propForm.currentValue} className="w-full gap-2">
                  {editingId ? <><Check className="w-4 h-4" /> Save Changes</> : <><Plus className="w-4 h-4" /> Add Property</>}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{properties.length > 0 ? 'Add Another Property' : 'Add a Property'}</span>
            </button>
          )}

          {properties.length === 0 && !showForm && (
            <p className="text-center text-sm text-muted-foreground">
              No property? No worries \u2014 switch to another asset type or hit <strong>Continue</strong>.
            </p>
          )}
        </div>
      )}

      {/* Non-property tab content */}
      {!isPropertyTab && (
        <div className="space-y-4">
          {tabAssets.length > 0 && (
            <div className="space-y-2">
              {tabAssets.map(asset => {
                const tabConfig = ASSET_TABS.find(t => t.id === asset.category)!
                const Icon = tabConfig.icon
                return (
                  <Card key={asset.id} className="card-hover">
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
                )
              })}
            </div>
          )}

          {/* Simple asset form */}
          {showForm ? (
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
          ) : (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{tabAssets.length > 0 ? `Add Another ${ASSET_LABELS[activeTab]}` : `Add ${ASSET_LABELS[activeTab]}`}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// -- Step 3: Liabilities --

function LiabilitiesStep({ store }: { store: FinanceState }) {
  const { liabilities, addLiability, removeLiability, updateLiability } = store
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: 'personal_loan' as LiabilityCategory,
    currentBalance: '', interestRatePA: '', minimumRepayment: '',
    repaymentFrequency: 'monthly' as 'weekly' | 'fortnightly' | 'monthly',
    mortgageType: 'principal_and_interest' as MortgageType,
    loanTermYears: '30',
    repaymentOverridden: false,
  })

  const isMortgageCategory = (cat: LiabilityCategory) => cat === 'mortgage' || cat === 'home_loan'

  const resetForm = () => {
    setForm({ name: '', category: 'personal_loan', currentBalance: '', interestRatePA: '', minimumRepayment: '', repaymentFrequency: 'monthly', mortgageType: 'principal_and_interest', loanTermYears: '30', repaymentOverridden: false })
    setShowForm(false)
    setEditingId(null)
  }

  const updateLoanField = (updates: Partial<typeof form>) => {
    const next = { ...form, ...updates }
    if (isMortgageCategory(next.category) && !next.repaymentOverridden) {
      next.minimumRepayment = autoCalcRepayment(next.currentBalance, next.interestRatePA, next.mortgageType, next.loanTermYears)
    }
    setForm(next)
  }

  const startEdit = (lia: typeof liabilities[0]) => {
    setForm({
      name: lia.name,
      category: lia.category,
      currentBalance: String(lia.currentBalance),
      interestRatePA: (lia.interestRatePA * 100).toFixed(2),
      minimumRepayment: String(lia.minimumRepayment),
      repaymentFrequency: lia.repaymentFrequency,
      mortgageType: lia.mortgageType || 'principal_and_interest',
      loanTermYears: String(lia.loanTermYears || 30),
      repaymentOverridden: false,
    })
    setEditingId(lia.id)
    setShowForm(true)
  }

  const handleAdd = () => {
    if (!form.name || !form.currentBalance) return
    const base = {
      name: form.name,
      category: form.category,
      currentBalance: parseFloat(form.currentBalance) || 0,
      interestRatePA: pctToFraction(form.interestRatePA, 2),
      minimumRepayment: parseFloat(form.minimumRepayment) || 0,
      repaymentFrequency: form.repaymentFrequency,
      ...(isMortgageCategory(form.category) ? {
        mortgageType: form.mortgageType,
        loanTermYears: parseInt(form.loanTermYears) || 30,
      } : {}),
    }
    if (editingId) {
      updateLiability(editingId, base)
    } else {
      addLiability(base)
    }
    resetForm()
  }

  const totalDebt = liabilities.reduce((s, l) => s + l.currentBalance, 0)
  const mortgages = liabilities.filter(l => l.category === 'mortgage')
  const otherDebts = liabilities.filter(l => l.category !== 'mortgage')

  const LIA_ICONS: Record<LiabilityCategory, { color: string }> = {
    mortgage: { color: 'text-red-500 bg-red-500/10' },
    home_loan: { color: 'text-red-500 bg-red-500/10' },
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
        description="Add any debts — personal loans, credit cards, HECS. Mortgages and car loans are covered in your assets."
        icon={CreditCard}
      />

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
                      {formatPercent(m.interestRatePA)} interest &middot; {formatCurrency(m.minimumRepayment)}/month
                      {m.mortgageType === 'interest_only' ? ' · Interest Only' : ' · P&I'}
                      {m.loanTermYears ? ` · ${m.loanTermYears}yr term` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold tabular-nums text-red-400">{formatCurrency(m.currentBalance)}</p>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(m)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {otherDebts.length > 0 && (
        <div className="space-y-2">
          {mortgages.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Other Debts</p>
          )}
          {otherDebts.map(lia => (
            <Card key={lia.id} className="card-hover">
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold tabular-nums text-red-400">{formatCurrency(lia.currentBalance)}</p>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(lia)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeLiability(lia.id)}>
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

      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            ['personal_loan', 'Personal Loan'],
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
              <h3 className="font-medium">{editingId ? 'Edit Debt' : 'Add Debt'}</h3>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder={isMortgageCategory(form.category) ? 'e.g. ANZ Home Loan' : 'e.g. ANZ Credit Card'}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.category} onValueChange={(v: LiabilityCategory) => updateLoanField({ category: v })}>
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

              {isMortgageCategory(form.category) && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Loan Type</Label>
                    <Select
                      value={form.mortgageType}
                      onValueChange={(v: MortgageType) => updateLoanField({ mortgageType: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principal_and_interest">Principal & Interest</SelectItem>
                        <SelectItem value="interest_only">Interest Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.mortgageType === 'principal_and_interest' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Loan Term (years)</Label>
                      <Input
                        type="number" min="1" max="40"
                        value={form.loanTermYears}
                        onChange={e => updateLoanField({ loanTermYears: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Balance Owing</Label>
                <CurrencyInput
                  value={form.currentBalance}
                  onValueChange={v => updateLoanField({ currentBalance: v })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interest Rate (% p.a.)</Label>
                <Input
                  type="number" step="0.01" min="0" max="50"
                  value={form.interestRatePA}
                  onChange={e => updateLoanField({ interestRatePA: e.target.value })}
                  onBlur={e => updateLoanField({ interestRatePA: parseFloat(e.target.value || '0').toFixed(2) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Min. Monthly Repayment
                  {isMortgageCategory(form.category) && !form.repaymentOverridden && form.minimumRepayment ? ' (auto-calculated)' : ''}
                </Label>
                <CurrencyInput
                  value={form.minimumRepayment}
                  onValueChange={v => setForm({ ...form, minimumRepayment: v, repaymentOverridden: true })}
                  placeholder="0"
                />
                {isMortgageCategory(form.category) && form.repaymentOverridden && form.currentBalance && form.interestRatePA && (
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const calc = autoCalcRepayment(form.currentBalance, form.interestRatePA, form.mortgageType, form.loanTermYears)
                      setForm({ ...form, minimumRepayment: calc, repaymentOverridden: false })
                    }}
                  >
                    Reset to calculated amount
                  </button>
                )}
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
              {editingId ? <><Check className="w-4 h-4" /> Save Changes</> : <><Plus className="w-4 h-4" /> Add Debt</>}
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

// -- Step 4: Income --

function IncomeStep({ store }: { store: FinanceState }) {
  const { incomes, addIncome, removeIncome, updateIncome, properties, assets, userProfile } = store
  const isHousehold = userProfile.profileType === 'household' && userProfile.householdMembers.length > 0
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', category: 'salary' as IncomeCategory, monthlyAmount: '',
  })

  // Salary forms for each household member (or single individual)
  // Memoize to prevent infinite re-render loop
  const salaryPeople = useMemo(() => isHousehold
    ? userProfile.householdMembers
    : [{ id: '__individual__', name: userProfile.individualName || 'Your' }],
  [isHousehold, userProfile.householdMembers, userProfile.individualName])

  const [salaryForms, setSalaryForms] = useState<Record<string, { grossAnnual: string; includesSuper: boolean }>>(() => {
    const initial: Record<string, { grossAnnual: string; includesSuper: boolean }> = {}
    for (const person of salaryPeople) {
      // Check if there's an existing salary income for this person
      const existing = incomes.find(i =>
        i.category === 'salary' && (isHousehold ? i.memberId === person.id : true)
      )
      initial[person.id] = {
        grossAnnual: existing?.grossAnnualSalary ? String(existing.grossAnnualSalary) : '',
        includesSuper: existing?.includesSuper ?? false,
      }
    }
    return initial
  })

  const salaryBreakdowns = useMemo(() => {
    const result: Record<string, ReturnType<typeof calculateTaxBreakdown> | null> = {}
    for (const person of salaryPeople) {
      const sf = salaryForms[person.id]
      if (!sf) { result[person.id] = null; continue }
      const gross = parseFloat(sf.grossAnnual) || 0
      result[person.id] = gross > 0 ? calculateTaxBreakdown(gross, sf.includesSuper) : null
    }
    return result
  }, [salaryForms, salaryPeople])

  const handleSaveSalary = (personId: string) => {
    const sf = salaryForms[personId]
    const breakdown = salaryBreakdowns[personId]
    if (!sf || !breakdown) return

    const person = salaryPeople.find(p => p.id === personId)
    if (!person) return

    const existingIncome = incomes.find(i =>
      i.category === 'salary' && (isHousehold ? i.memberId === personId : !i.memberId || i.memberId === '__individual__')
    )

    const data: Partial<IncomeItem> = {
      name: isHousehold ? `${person.name}'s Salary` : (userProfile.individualName ? `${userProfile.individualName}'s Salary` : 'Salary'),
      category: 'salary',
      monthlyAmount: breakdown.netMonthly,
      isActive: true,
      grossAnnualSalary: parseFloat(sf.grossAnnual) || 0,
      includesSuper: sf.includesSuper,
      ...(isHousehold ? { memberId: personId } : {}),
    }

    if (existingIncome) {
      updateIncome(existingIncome.id, data)
    } else {
      addIncome(data)
    }
  }

  // Auto-save salary when values change (debounced via breakdown)
  useEffect(() => {
    for (const person of salaryPeople) {
      if (salaryBreakdowns[person.id]) {
        handleSaveSalary(person.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(salaryBreakdowns)])

  // Auto-generated rental income from investment properties
  const rentalIncomes = useMemo(() => {
    return properties
      .filter((p: Property) => p.type === 'investment' && p.weeklyRent && p.weeklyRent > 0)
      .map((p: Property) => ({
        propertyName: p.name,
        weeklyRent: p.weeklyRent!,
        monthlyAmount: (p.weeklyRent! * 52) / 12,
      }))
  }, [properties])

  // Auto-generated interest income from cash/savings assets
  const interestIncomes = useMemo(() => {
    return assets
      .filter(a => a.category === 'cash' && a.growthRatePA > 0 && a.currentValue > 0)
      .map(a => ({
        assetName: a.name,
        rate: a.growthRatePA,
        monthlyAmount: (a.currentValue * a.growthRatePA) / 12,
      }))
  }, [assets])

  // Auto-generated dividend income from stock assets
  const dividendIncomes = useMemo(() => {
    return assets
      .filter(a => a.category === 'stocks' && a.growthRatePA > 0 && a.currentValue > 0)
      .map(a => ({
        assetName: a.name,
        rate: a.growthRatePA,
        monthlyAmount: (a.currentValue * a.growthRatePA) / 12,
      }))
  }, [assets])

  const resetForm = () => {
    setForm({ name: '', category: 'salary', monthlyAmount: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const nonSalaryIncomes = incomes.filter(i => i.category !== 'salary')

  const startEdit = (inc: IncomeItem) => {
    setForm({ name: inc.name, category: inc.category, monthlyAmount: String(inc.monthlyAmount) })
    setEditingId(inc.id)
    setShowForm(true)
  }

  const handleAdd = () => {
    if (!form.name || !form.monthlyAmount) return
    if (editingId) {
      updateIncome(editingId, {
        name: form.name,
        category: form.category,
        monthlyAmount: parseFloat(form.monthlyAmount) || 0,
      })
    } else {
      addIncome({
        name: form.name,
        category: form.category,
        monthlyAmount: parseFloat(form.monthlyAmount) || 0,
        isActive: true,
      })
    }
    resetForm()
  }

  const salaryIncomes = incomes.filter(i => i.category === 'salary')
  const salaryTotal = salaryIncomes.reduce((s, i) => s + i.monthlyAmount, 0)
  const manualNonSalary = nonSalaryIncomes.filter((i: { isActive: boolean }) => i.isActive).reduce((s: number, i: { monthlyAmount: number }) => s + i.monthlyAmount, 0)
  const rentalTotal = rentalIncomes.reduce((s: number, r: { monthlyAmount: number }) => s + r.monthlyAmount, 0)
  const interestTotal = interestIncomes.reduce((s: number, r: { monthlyAmount: number }) => s + r.monthlyAmount, 0)
  const dividendTotal = dividendIncomes.reduce((s: number, r: { monthlyAmount: number }) => s + r.monthlyAmount, 0)
  const totalMonthly = salaryTotal + manualNonSalary + rentalTotal + interestTotal + dividendTotal

  const hasAutoIncome = rentalIncomes.length > 0 || interestIncomes.length > 0 || dividendIncomes.length > 0

  return (
    <div className="space-y-6">
      <StepHeader
        title="What do you earn?"
        description={isHousehold
          ? "Enter each household member's salary, then add any other income sources."
          : "Enter your salary details, then add any other income sources."
        }
        icon={Briefcase}
      />

      {/* Salary section — one card per person */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" /> {isHousehold ? 'Household Salaries' : 'Salary'}
        </p>

        {salaryPeople.map(person => {
          const sf = salaryForms[person.id] || { grossAnnual: '', includesSuper: false }
          const breakdown = salaryBreakdowns[person.id]

          return (
            <Card key={person.id} className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{isHousehold ? `${person.name}'s Salary` : (userProfile.individualName ? `${userProfile.individualName}'s Salary` : 'Your Salary')}</h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gross Annual Salary (AUD)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 120000"
                      value={sf.grossAnnual}
                      onChange={e => setSalaryForms(prev => ({
                        ...prev,
                        [person.id]: { ...prev[person.id], grossAnnual: e.target.value }
                      }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sf.includesSuper}
                      onChange={e => setSalaryForms(prev => ({
                        ...prev,
                        [person.id]: { ...prev[person.id], includesSuper: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm">This amount includes superannuation</span>
                  </label>
                </div>

                {breakdown && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Tax Breakdown (FY 2024-25)</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Base Salary</span>
                      <span className="text-right tabular-nums">{formatCurrency(breakdown.grossSalary)}</span>
                      <span className="text-muted-foreground">Super (11.5%)</span>
                      <span className="text-right tabular-nums">{formatCurrency(breakdown.superAmount)}</span>
                      <span className="text-muted-foreground">Income Tax</span>
                      <span className="text-right tabular-nums text-red-400">−{formatCurrency(breakdown.incomeTax)}</span>
                      <span className="text-muted-foreground">Medicare</span>
                      <span className="text-right tabular-nums text-red-400">−{formatCurrency(breakdown.medicareLevy)}</span>
                      <div className="col-span-2 border-t border-border my-0.5" />
                      <span className="font-semibold">Net Monthly</span>
                      <span className="text-right tabular-nums font-bold text-primary">{formatCurrency(breakdown.netMonthly)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Auto-generated income from assets */}
      {hasAutoIncome && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Auto-Generated from Your Assets
          </p>

          {rentalIncomes.map((ri: { propertyName: string; weeklyRent: number; monthlyAmount: number }) => (
            <Card key={ri.propertyName} className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="font-medium">{ri.propertyName} — Rent</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(ri.weeklyRent)}/wk × 52 ÷ 12
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(ri.monthlyAmount)}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {interestIncomes.map((ii) => (
            <Card key={ii.assetName} className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">{ii.assetName} — Interest</p>
                    <p className="text-xs text-muted-foreground">Based on {formatPercent(ii.rate)} p.a.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(ii.monthlyAmount)}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {dividendIncomes.map((di) => (
            <Card key={di.assetName} className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{di.assetName} — Dividends</p>
                    <p className="text-xs text-muted-foreground">Based on {formatPercent(di.rate)} p.a.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(di.monthlyAmount)}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Non-salary manual income items */}
      {nonSalaryIncomes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Other Income</p>
          {nonSalaryIncomes.map((inc: IncomeItem) => (
            <Card key={inc.id} className="card-hover">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{inc.name}</p>
                    <p className="text-xs text-muted-foreground">{INCOME_LABELS[inc.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatCurrency(inc.monthlyAmount)}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(inc)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeIncome(inc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Total */}
      {totalMonthly > 0 && (
        <div className="flex justify-between items-center px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Total Monthly Income</span>
          <span className="font-bold text-primary tabular-nums">{formatCurrency(totalMonthly)}</span>
        </div>
      )}

      {/* Add/Edit form for other income */}
      {showForm ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{editingId ? 'Edit Income Source' : 'Add Other Income'}</h3>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. Side hustle"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v: IncomeCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(INCOME_LABELS) as [IncomeCategory, string][])
                      .filter(([k]) => k !== 'salary')
                      .map(([k, v]) => (
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
              {editingId ? <><Check className="w-4 h-4" /> Save Changes</> : <><Plus className="w-4 h-4" /> Add Income</>}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Other Income Source</span>
        </button>
      )}
    </div>
  )
}

// -- Step 5: Expenses -- (moved to SetupWizardExpensesStep.tsx)
// (ExpensesStep imported from SetupWizardExpensesStep.tsx)

// -- Summary (Final step, not numbered) --

function SummaryStep({ store, onFinish }: { store: FinanceState; onFinish: () => void }) {
  const { assets, properties, liabilities, incomes, expenseBudgets } = store
  const [revealed, setRevealed] = useState(false)

  const rentalIncome = properties
    .filter((p: Property) => p.type === 'investment' && p.weeklyRent && p.weeklyRent > 0)
    .reduce((s: number, p: Property) => s + (p.weeklyRent! * 52) / 12, 0)

  const mortgageExpenses = liabilities
    .filter(l => l.category === 'mortgage' && l.minimumRepayment > 0)
    .reduce((s: number, l) => s + l.minimumRepayment, 0)

  // Property running costs
  const propertyRunningCosts = properties.reduce((s: number, p: Property) => {
    let cost = 0
    if (p.councilRatesPA) cost += p.councilRatesPA / 12
    if (p.waterRatesPA) cost += p.waterRatesPA / 12
    if (p.insurancePA) cost += p.insurancePA / 12
    if (p.strataPA) cost += p.strataPA / 12
    if (p.maintenanceBudgetPA) cost += p.maintenanceBudgetPA / 12
    if (p.type === 'investment' && p.propertyManagementPct && p.weeklyRent)
      cost += p.weeklyRent * 52 * p.propertyManagementPct / 100 / 12
    if (p.type === 'investment' && p.landTaxPA) cost += p.landTaxPA / 12
    return s + cost
  }, 0)

  // Interest + dividend income from assets
  const assetIncome = assets.reduce((s, a) => {
    if ((a.category === 'cash' || a.category === 'stocks') && a.growthRatePA > 0 && a.currentValue > 0) {
      return s + (a.currentValue * a.growthRatePA) / 12
    }
    return s
  }, 0)

  const totalAssets = assets.reduce((s: number, a: { currentValue: number }) => s + a.currentValue, 0)
    + properties.reduce((s: number, p: { currentValue: number }) => s + p.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s: number, l: { currentBalance: number }) => s + l.currentBalance, 0)
  const netWealth = totalAssets - totalLiabilities
  const monthlyIncome = incomes.filter((i: { isActive: boolean }) => i.isActive).reduce((s: number, i: { monthlyAmount: number }) => s + i.monthlyAmount, 0) + rentalIncome + assetIncome
  const monthlyExpenses = expenseBudgets.reduce((s: number, b: { monthlyBudget: number }) => s + b.monthlyBudget, 0) + mortgageExpenses + propertyRunningCosts
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

      <div className={`text-center transition-all duration-1000 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Net Wealth</p>
        <p className={`text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums ${netWealth >= 0 ? 'text-primary' : 'text-red-400'}`}>
          {formatCompact(netWealth)}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {formatCurrency(totalAssets)} in assets &minus; {formatCurrency(totalLiabilities)} in debts
        </p>
      </div>

      <div className={`grid grid-cols-2 gap-3 transition-all duration-1000 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Monthly Income</p>
            <p className="text-xl font-bold text-blue-400 tabular-nums mt-1">{formatCurrency(monthlyIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.length} source{incomes.length !== 1 ? 's' : ''}
              {rentalIncome > 0 ? ' + rental' : ''}
              {assetIncome > 0 ? ' + interest/dividends' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Monthly Expenses</p>
            <p className="text-xl font-bold text-amber-400 tabular-nums mt-1">{formatCurrency(monthlyExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseBudgets.length} categor{expenseBudgets.length !== 1 ? 'ies' : 'y'}
              {mortgageExpenses > 0 ? ' + mortgage' : ''}
              {propertyRunningCosts > 0 ? ' + property costs' : ''}
            </p>
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

      {(assets.length > 0 || properties.length > 0) && (
        <div className={`transition-all duration-1000 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Asset Breakdown</p>
          <div className="space-y-2">
            {[
              ...properties.map((p: { name: string; currentValue: number }) => ({ name: p.name, value: p.currentValue, color: 'bg-sky-500' })),
              ...assets.map((a: { name: string; currentValue: number; category: AssetCategory }) => ({
                name: a.name,
                value: a.currentValue,
                color: a.category === 'cash' ? 'bg-amber-500' : a.category === 'stocks' ? 'bg-blue-500' : a.category === 'super' ? 'bg-violet-500' : a.category === 'vehicles' ? 'bg-amber-500' : 'bg-gray-500',
              })),
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

// -- Shared Components --

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
