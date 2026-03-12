import { useState, useEffect } from 'react'
import { Receipt, Info } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { FinanceState } from '@/stores/useFinanceStore'

function StepHeader({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Estimated Monthly Expenses</h2>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

export function ExpensesStep({ store }: { store: FinanceState }) {
  const { userProfile, setEstimatedMonthlyExpenses } = store as any
  const [amount, setAmount] = useState(() => 
    userProfile?.estimatedMonthlyExpenses ? String(userProfile.estimatedMonthlyExpenses) : ''
  )

  useEffect(() => {
    const num = parseFloat(amount) || 0
    if (num > 0) {
      setEstimatedMonthlyExpenses(num)
    }
  }, [amount, setEstimatedMonthlyExpenses])

  return (
    <div className="space-y-6">
      <StepHeader
        title="Estimated Monthly Expenses"
        description="Enter an estimate of your total monthly spending. You'll be able to enter a full detailed budget later."
        icon={Receipt}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Estimated Monthly Expenses</label>
          <CurrencyInput
            value={amount}
            onValueChange={setAmount}
            placeholder="e.g. 5000"
            className="text-lg h-12"
          />
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">This is just an estimate</p>
            <p className="text-sm text-muted-foreground">
              You'll be able to enter your full budget details later in the Living Expenses section, 
              broken down by category (housing, insurance, groceries, etc.).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
