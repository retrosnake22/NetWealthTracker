import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, CreditCard, Home, GraduationCap, Wallet, CircleDot } from 'lucide-react'
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
  credit_card: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  hecs: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const CATEGORY_BAR_COLORS: Record<LiabilityCategory, string> = {
  mortgage: 'bg-red-500',
  home_loan: 'bg-red-500',
  personal_loan: 'bg-orange-500',
  car_loan: 'bg-orange-500',
  credit_card: 'bg-amber-500',
  hecs: 'bg-indigo-500',
  other: 'bg-gray-500',
}

const CATEGORY_GROUPS = [
  {
    key: 'mortgages',
    label: 'Mortgages',
    icon: Home,
    color: 'text-red-400',
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    totalColor: 'text-red-500 dark:text-red-400',
    categories: ['mortgage'] as LiabilityCategory[],
    filterKey: 'mortgage',
  },
  {
    key: 'car_loans',
    label: 'Car Loans',
    icon: Wallet,
    color: 'text-orange-400',
    borderColor: 'border-l-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    totalColor: 'text-orange-500 dark:text-orange-400',
    categories: ['car_loan'] as LiabilityCategory[],
    filterKey: 'car_loan',
  },
  {
    key: 'personal',
    label: 'Personal Loans',
    icon: Wallet,
    color: 'text-orange-400',
    borderColor: 'border-l-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    totalColor: 'text-orange-500 dark:text-orange-400',
    categories: ['personal_loan'] as LiabilityCategory[],
    filterKey: 'personal_loan',
  },
  {
    key: 'credit',
    label: 'Credit Cards',
    icon: CreditCard,
    color: 'text-amber-400',
    borderColor: 'border-l-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    totalColor: 'text-amber-500 dark:text-amber-400',
    categories: ['credit_card'] as LiabilityCategory[],
    filterKey: 'credit_card',
  },
  {
    key: 'hecs',
    label: 'HECS / Student',
    icon: GraduationCap,
    color: 'text-indigo-400',
    borderColor: 'border-l-indigo-500',
    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
    totalColor: 'text-indigo-500 dark:text-indigo-400',
    categories: ['hecs'] as LiabilityCategory[],
    filterKey: 'hecs',
  },
  {
    key: 'other',
    label: 'Other',
    icon: CircleDot,
    color: 'text-gray-400',
    borderColor: 'border-l-gray-400',
    badgeBg: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    totalColor: 'text-gray-500 dark:text-gray-400',
    categories: ['other'] as LiabilityCategory[],
    filterKey: 'other',
  },
]

export function LiabilitiesPage() {
  const { liabilities, addLiability, updateLiability, removeLiability, properties } = useFinanceStore()
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category')
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
    mortgageType: 'principal_and_interest' as 'interest_only' | 'principal_and_interest',
    loanTermYears: '',
  })

  // Filter liabilities based on URL category param
  const filteredLiabilities = useMemo(() => {
    if (!categoryFilter) return liabilities
    const group = CATEGORY_GROUPS.find(g => g.filterKey === categoryFilter)
    if (!group) return liabilities
    return liabilities.filter(l => group.categories.includes(l.category))
  }, [liabilities, categoryFilter])

  const resetForm = () => {
    setForm({
      name: '', category: (categoryFilter as LiabilityCategory) || 'personal_loan', currentBalance: '',
      interestRatePA: '', minimumRepayment: '', repaymentFrequency: 'monthly',
      mortgageType: 'principal_and_interest', loanTermYears: '',
    })
    setEditId(null)
  }

  const calcMonthlyRepayment = (
    balance: number,
    annualRate: number,
    termYears: number,
    type: 'principal_and_interest' | 'interest_only',
  ): number => {
    if (balance <= 0 || annualRate <= 0) return 0
    const r = annualRate / 12
    if (type === 'interest_only') return balance * r
    if (termYears <= 0) return 0
    const n = termYears * 12
    return (balance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }

  const handleSave = () => {
    const balance = parseFloat(form.currentBalance) || 0
    const annualRate = (parseFloat(form.interestRatePA) || 0) / 100
    const termYears = parseFloat(form.loanTermYears) || 0
    const isAutoCalcCategory = ['personal_loan', 'mortgage', 'home_loan'].includes(form.category)
    const autoRepayment = isAutoCalcCategory
      ? calcMonthlyRepayment(balance, annualRate, termYears, form.mortgageType)
      : null
    const data = {
      name: form.name,
      category: form.category,
      currentBalance: balance,
      interestRatePA: annualRate,
      minimumRepayment: autoRepayment !== null && autoRepayment > 0
        ? autoRepayment
        : parseFloat(form.minimumRepayment) || 0,
      repaymentFrequency: form.repaymentFrequency,
      mortgageType: form.mortgageType,
      loanTermYears: termYears || undefined,
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
      interestRatePA: (item.interestRatePA * 100).toFixed(2),
      minimumRepayment: String(item.minimumRepayment),
      repaymentFrequency: item.repaymentFrequency,
      mortgageType: (item as any).mortgageType ?? 'principal_and_interest',
      loanTermYears: (item as any).loanTermYears ? String((item as any).loanTermYears) : '',
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

  const total = filteredLiabilities.reduce((s, l) => s + l.currentBalance, 0)

  const monthlyRepayments = filteredLiabilities.reduce((s, l) => {
    const repayment = l.minimumRepayment ?? 0
    if (l.repaymentFrequency === 'weekly') return s + (repayment * 52) / 12
    if (l.repaymentFrequency === 'fortnightly') return s + (repayment * 26) / 12
    return s + repayment
  }, 0)

  const weightedRate = total > 0
    ? filteredLiabilities.reduce((s, l) => s + l.interestRatePA * (l.currentBalance / total), 0)
    : 0

  const frequencyLabel = (freq: string) => {
    switch (freq) {
      case 'weekly': return '/wk'
      case 'fortnightly': return '/fn'
      default: return '/mo'
    }
  }

  const groupedLiabilities = useMemo(() => {
    return CATEGORY_GROUPS
      .map(group => ({
        ...group,
        items: filteredLiabilities.filter(l => group.categories.includes(l.category)),
        subtotal: filteredLiabilities
          .filter(l => group.categories.includes(l.category))
          .reduce((s, l) => s + l.currentBalance, 0),
        monthlyRepay: filteredLiabilities
          .filter(l => group.categories.includes(l.category))
          .reduce((s, l) => {
            const r = l.minimumRepayment ?? 0
            if (l.repaymentFrequency === 'weekly') return s + (r * 52) / 12
            if (l.repaymentFrequency === 'fortnightly') return s + (r * 26) / 12
            return s + r
          }, 0),
      }))
      .filter(group => group.items.length > 0)
  }, [filteredLiabilities])

  const activeFilterLabel = categoryFilter
    ? CATEGORY_GROUPS.find(g => g.filterKey === categoryFilter)?.label ?? null
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {activeFilterLabel && (
          <p className="text-sm text-muted-foreground">
            Showing: <span className="font-medium text-foreground">{activeFilterLabel}</span>
          </p>
        )}
        <div className="ml-auto">
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
                {(['personal_loan', 'mortgage', 'home_loan'] as LiabilityCategory[]).includes(form.category) && (() => {
                  const previewBalance = parseFloat(form.currentBalance) || 0
                  const previewRate = (parseFloat(form.interestRatePA) || 0) / 100
                  const previewTerm = parseFloat(form.loanTermYears) || 0
                  const autoAmt = calcMonthlyRepayment(previewBalance, previewRate, previewTerm, form.mortgageType)
                  return (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Repayment Type</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForm({...form, mortgageType: 'principal_and_interest'})}
                            className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              form.mortgageType === 'principal_and_interest'
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            P&I
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({...form, mortgageType: 'interest_only'})}
                            className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              form.mortgageType === 'interest_only'
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Interest Only
                          </button>
                        </div>
                      </div>
                      {form.mortgageType === 'principal_and_interest' && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Loan Term (years)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="40"
                            placeholder="e.g. 25"
                            value={form.loanTermYears}
                            onChange={e => setForm({...form, loanTermYears: e.target.value})}
                          />
                        </div>
                      )}
                      {autoAmt > 0 && (
                        <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                          <p className="text-xs text-muted-foreground">Auto-calculated monthly repayment</p>
                          <p className="text-base font-bold tabular-nums text-primary">{formatCurrency(autoAmt)}/mo</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">This will replace the manual repayment amount on save.</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSave} disabled={!form.name || !form.currentBalance}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Strip — Gradient (light) / Glass (dark) */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#7f1d1d] to-[#ef4444] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
          <p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>{activeFilterLabel ? `${activeFilterLabel} Total` : 'Total Liabilities'}</p>
          <p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-red-400'>{formatCurrency(total)}</p>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#9a3412] to-[#f97316] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
          <p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Monthly Repayments</p>
          <p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-orange-400'>{formatCurrency(monthlyRepayments)}</p>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
          <p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Avg Interest Rate</p>
          <p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-blue-400'>{total > 0 ? formatPercent(weightedRate) : '—'}</p>
        </div>
      </div>

      {/* Grouped Liabilities */}
      {filteredLiabilities.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border/60 p-10 text-center bg-white/50 dark:bg-white/[0.03]">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {activeFilterLabel ? `No ${activeFilterLabel.toLowerCase()} yet` : 'No liabilities yet'}
          </h3>
          <p className="text-muted-foreground mb-4">Add your mortgages, loans, credit cards, and HECS debt.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Your First Liability</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedLiabilities.map(group => {
            const Icon = group.icon
            return (
              <div key={group.key}>
                {/* Section wrapper with colored left border */}
                <div className={`rounded-xl border-l-4 ${group.borderColor} bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none dark:border dark:border-white/[0.06] overflow-hidden`}>
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/[0.06] ${group.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">{group.label}</h3>
                      <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${group.badgeBg}`}>
                        {group.items.length}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-[17px] font-extrabold tabular-nums ${group.totalColor}`}>{formatCurrency(group.subtotal)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(group.monthlyRepay)}/mo repayments</p>
                    </div>
                  </div>

                  {/* Group Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {group.items.map((item, idx) => {
                      const linkedProperty = getLinkedProperty(item.id)
                      const groupShare = group.subtotal > 0
                        ? Math.round((item.currentBalance / group.subtotal) * 100)
                        : 0
                      const barColor = CATEGORY_BAR_COLORS[item.category]
                      const isLastOdd = idx === group.items.length - 1 && group.items.length % 2 === 1

                      return (
                        <div
                          key={item.id}
                          className={`group p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] ${
                            idx < group.items.length - (isLastOdd ? 0 : 2) ? 'border-b border-slate-100 dark:border-white/[0.04]' : ''
                          } ${idx % 2 === 0 && !isLastOdd ? 'md:border-r md:border-slate-100 md:dark:border-white/[0.04]' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              {/* Badge row */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={CATEGORY_COLORS[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatPercent(item.interestRatePA)} p.a.
                                </span>
                                {linkedProperty && (
                                  <Badge variant="outline" className="text-xs">🏠 {linkedProperty.name}</Badge>
                                )}
                              </div>

                              {/* Name */}
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>

                              {/* Balance */}
                              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                                {formatCurrency(item.currentBalance)}
                              </p>

                              {/* Repayment + type details */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>Repayment: {formatCurrency(item.minimumRepayment)}{frequencyLabel(item.repaymentFrequency)}</span>
                                {(item as any).mortgageType && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                    {(item as any).mortgageType === 'interest_only' ? 'IO' : 'P&I'}
                                  </span>
                                )}
                                {(item as any).loanTermYears && (
                                  <span>{(item as any).loanTermYears}yr term</span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {group.items.length > 1 && (
                            <div className="mt-3 space-y-1">
                              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 opacity-60 ${barColor}`}
                                  style={{ width: `${groupShare}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {groupShare}% of {group.label.toLowerCase()} total
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
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
