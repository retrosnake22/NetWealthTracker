import { useState, useEffect, useMemo } from 'react'
import { Receipt, Info, Home, CreditCard, Car } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { FinanceState } from '@/stores/useFinanceStore'

function StepHeader({ description, icon: Icon }: { description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">What do you spend?</h2>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

export function ExpensesStep({ store }: { store: FinanceState }) {
  const { userProfile, setEstimatedMonthlyExpenses, properties, liabilities, expenseBudgets } = store as any
  const [amount, setAmount] = useState(() =>
    userProfile?.estimatedMonthlyExpenses ? String(userProfile.estimatedMonthlyExpenses) : ''
  )

  useEffect(() => {
    const num = parseFloat(amount) || 0
    if (num > 0) {
      setEstimatedMonthlyExpenses(num)
    }
  }, [amount, setEstimatedMonthlyExpenses])

  // Compute fixed expenses from mortgages, personal loans, vehicle expenses
  const fixedExpenses = useMemo(() => {
    const items: { name: string; amount: number; type: string; icon: 'property' | 'loan' | 'vehicle' }[] = []

    // Property mortgages
    for (const prop of (properties ?? [])) {
      if (prop.mortgageId) {
        const lia = (liabilities ?? []).find((l: any) => l.id === prop.mortgageId)
        if (lia && lia.minimumRepayment > 0) {
          const freq = lia.repaymentFrequency === 'weekly' ? 52 : lia.repaymentFrequency === 'fortnightly' ? 26 : 12
          items.push({
            name: `${prop.name} Mortgage`,
            amount: (lia.minimumRepayment * freq) / 12,
            type: `${lia.mortgageType === 'interest_only' ? 'IO' : 'P&I'} · ${formatPercent(lia.interestRatePA)} p.a.`,
            icon: 'property',
          })
        }
      }
    }

    // Other liabilities (personal loans, credit cards, etc.)
    const propertyMortgageIds = new Set((properties ?? []).map((p: any) => p.mortgageId).filter(Boolean))
    for (const lia of (liabilities ?? [])) {
      if (propertyMortgageIds.has(lia.id)) continue // already shown above
      if (lia.category === 'car_loan') continue // shown in vehicle section
      if (lia.minimumRepayment > 0) {
        const freq = lia.repaymentFrequency === 'weekly' ? 52 : lia.repaymentFrequency === 'fortnightly' ? 26 : 12
        items.push({
          name: lia.name,
          amount: (lia.minimumRepayment * freq) / 12,
          type: `${formatPercent(lia.interestRatePA)} p.a.`,
          icon: 'loan',
        })
      }
    }

    // Vehicle expenses (car loan repayments and lease payments from budget)
    for (const b of (expenseBudgets ?? [])) {
      if (b.linkedAssetId || b.label.endsWith('Car Loan Repayment') || b.label.endsWith('Lease Payment')) {
        items.push({
          name: b.label,
          amount: b.monthlyBudget,
          type: b.label.includes('Lease') ? 'Lease' : 'Car Loan',
          icon: 'vehicle',
        })
      }
    }

    return items
  }, [properties, liabilities, expenseBudgets])

  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)

  const getIcon = (type: 'property' | 'loan' | 'vehicle') => {
    if (type === 'property') return <Home className="w-4 h-4 text-sky-500" />
    if (type === 'vehicle') return <Car className="w-4 h-4 text-amber-500" />
    return <CreditCard className="w-4 h-4 text-orange-500" />
  }

  return (
    <div className="space-y-6">
      <StepHeader
        description="Enter your estimated monthly living expenses, then review your fixed expenses from prior steps."
        icon={Receipt}
      />

      {/* Section 1: Estimated Monthly Expenses */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Estimated Monthly Expenses</p>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">How much do you spend per month?</label>
              <CurrencyInput
                value={amount}
                onValueChange={setAmount}
                placeholder="e.g. 5000"
                className="text-lg h-12"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  That's {formatCurrency((parseFloat(amount) || 0) * 12)}/year
                </p>
              )}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                This is your living expenses estimate (groceries, bills, entertainment, etc.).
                You can switch to a detailed category budget later in Living Expenses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Fixed Expenses Summary */}
      {fixedExpenses.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Fixed Expenses (from prior steps)</p>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-0">
              {fixedExpenses.map((expense, idx) => (
                <div
                  key={`${expense.name}-${idx}`}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    idx !== fixedExpenses.length - 1 ? 'border-b border-border/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {getIcon(expense.icon)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{expense.name}</p>
                      <p className="text-xs text-muted-foreground">{expense.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(expense.amount)}</span>
                    <span className="text-xs text-muted-foreground ml-1">/mo</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
                <span className="text-sm font-medium text-muted-foreground">Total Fixed Expenses</span>
                <div>
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(fixedTotal)}</span>
                  <span className="text-xs text-muted-foreground ml-1">/mo</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            These are automatically calculated from your property, loan, and vehicle data entered in earlier steps.
          </p>
        </div>
      )}
    </div>
  )
}
