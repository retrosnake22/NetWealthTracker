import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'

interface VehicleFinancingFieldsProps {
  vehicleFinancing: 'owned' | 'car_loan' | 'lease'
  loanBalance: string
  loanRate: string
  loanRepayment: string
  leasePayment: string
  onChange: (updates: Partial<{
    vehicleFinancing: 'owned' | 'car_loan' | 'lease'
    loanBalance: string
    loanRate: string
    loanRepayment: string
    leasePayment: string
  }>) => void
}

export function VehicleFinancingFields({
  vehicleFinancing, loanBalance, loanRate, loanRepayment, leasePayment, onChange,
}: VehicleFinancingFieldsProps) {
  return (
    <div className="pt-2 border-t border-border/50 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        How is this vehicle financed?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {([
          ['owned', 'Owned Outright'],
          ['car_loan', 'Car Loan'],
          ['lease', 'Lease'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ vehicleFinancing: value })}
            className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
              vehicleFinancing === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {vehicleFinancing === 'car_loan' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            A car loan will be created in your Liabilities
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Loan Balance</Label>
              <CurrencyInput
                value={loanBalance}
                onValueChange={v => onChange({ loanBalance: v })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Interest Rate (% p.a.)</Label>
              <Input
                type="number" step="0.01" min="0" max="30"
                value={loanRate}
                onChange={e => onChange({ loanRate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Monthly Repayment</Label>
              <CurrencyInput
                value={loanRepayment}
                onValueChange={v => onChange({ loanRepayment: v })}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {vehicleFinancing === 'lease' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            The lease payment will be added to your monthly expenses
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Lease Payment</Label>
            <CurrencyInput
              value={leasePayment}
              onValueChange={v => onChange({ leasePayment: v })}
              placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  )
}
