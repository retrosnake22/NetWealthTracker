import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Property, Liability } from '@/types/models'

interface PropertyPnLProps {
  property: Property
  mortgage?: Liability
}

export interface PnLResult {
  grossRentPA: number
  vacancyLossPA: number
  effectiveRentPA: number
  managementFeePA: number
  councilRatesPA: number
  waterRatesPA: number
  insurancePA: number
  strataPA: number
  landTaxPA: number
  maintenancePA: number
  totalExpensesPA: number
  netRentalIncomePA: number
  interestPA: number
  netCashflowPA: number
  netCashflowWeekly: number
  grossYield: number
  netYield: number
}

export function calculatePropertyPnL(property: Property, mortgage?: Liability): PnLResult {
  const grossRentPA = (property.weeklyRent ?? 0) * 52
  const vacancyLossPA = grossRentPA * ((property.vacancyRatePA ?? 0) / 100)
  const effectiveRentPA = grossRentPA - vacancyLossPA

  // Management fee is on effective rent (after vacancy)
  const managementFeePA = effectiveRentPA * ((property.propertyManagementPct ?? 0) / 100)
  const councilRatesPA = property.councilRatesPA ?? 0
  const waterRatesPA = property.waterRatesPA ?? 0
  const insurancePA = property.insurancePA ?? 0
  const strataPA = property.strataPA ?? 0
  const landTaxPA = property.landTaxPA ?? 0
  const maintenancePA = property.maintenanceBudgetPA ?? 0

  const totalExpensesPA = managementFeePA + councilRatesPA + waterRatesPA +
    insurancePA + strataPA + landTaxPA + maintenancePA

  // Net rental income = effective rent minus all operating expenses (before financing)
  const netRentalIncomePA = effectiveRentPA - totalExpensesPA

  // Interest cost (not principal repayment — that's equity building)
  const interestPA = mortgage ? mortgage.currentBalance * mortgage.interestRatePA : 0

  // Net cashflow = net rental income minus financing costs
  const netCashflowPA = netRentalIncomePA - interestPA
  const netCashflowWeekly = netCashflowPA / 52

  const grossYield = property.currentValue > 0 ? grossRentPA / property.currentValue : 0
  const netYield = property.currentValue > 0 ? netCashflowPA / property.currentValue : 0

  return {
    grossRentPA, vacancyLossPA, effectiveRentPA,
    managementFeePA, councilRatesPA, waterRatesPA, insurancePA,
    strataPA, landTaxPA, maintenancePA, totalExpensesPA,
    netRentalIncomePA, interestPA, netCashflowPA, netCashflowWeekly,
    grossYield, netYield,
  }
}

function PnLRow({ label, amount, indent, bold, muted }: {
  label: string
  amount: number
  indent?: boolean
  bold?: boolean
  muted?: boolean
}) {
  const isNegative = amount < 0
  return (
    <div className={`flex items-center justify-between py-1 ${indent ? 'pl-4' : ''} ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground text-sm' : ''}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${isNegative ? 'text-red-400' : bold ? '' : 'text-foreground'}`}>
        {isNegative ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  )
}

export function PropertyPnL({ property, mortgage }: PropertyPnLProps) {
  const pnl = calculatePropertyPnL(property, mortgage)

  const cashflowIcon = pnl.netCashflowPA > 0
    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
    : pnl.netCashflowPA < 0
    ? <TrendingDown className="h-4 w-4 text-red-400" />
    : <Minus className="h-4 w-4 text-muted-foreground" />

  const cashflowLabel = pnl.netCashflowPA >= 0 ? 'Positive' : 'Negative'
  const cashflowColor = pnl.netCashflowPA >= 0
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20'

  return (
    <Card className="border-dashed">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {cashflowIcon}
            <h4 className="font-semibold text-sm">Annual P&L</h4>
            <Badge className={cashflowColor}>{cashflowLabel} Cashflow</Badge>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground mr-2">Net Yield</span>
            <span className={`font-bold tabular-nums ${pnl.netYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(pnl.netYield)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Rental Income */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Rental Income</p>
          <PnLRow label="Gross Rental Income" amount={pnl.grossRentPA} />
          {pnl.vacancyLossPA > 0 && (
            <PnLRow label="Less Vacancy" amount={-pnl.vacancyLossPA} indent muted />
          )}
          {pnl.managementFeePA > 0 && <PnLRow label="Less Property Management" amount={-pnl.managementFeePA} indent muted />}
          {pnl.councilRatesPA > 0 && <PnLRow label="Less Council Rates" amount={-pnl.councilRatesPA} indent muted />}
          {pnl.waterRatesPA > 0 && <PnLRow label="Less Water Rates" amount={-pnl.waterRatesPA} indent muted />}
          {pnl.insurancePA > 0 && <PnLRow label="Less Insurance" amount={-pnl.insurancePA} indent muted />}
          {pnl.strataPA > 0 && <PnLRow label="Less Strata" amount={-pnl.strataPA} indent muted />}
          {pnl.landTaxPA > 0 && <PnLRow label="Less Land Tax" amount={-pnl.landTaxPA} indent muted />}
          {pnl.maintenancePA > 0 && <PnLRow label="Less Maintenance" amount={-pnl.maintenancePA} indent muted />}
          <PnLRow label="Net Rental Income" amount={pnl.netRentalIncomePA} bold />
        </div>

        {pnl.interestPA > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Financing</p>
              <PnLRow label="Mortgage Interest" amount={-pnl.interestPA} indent muted />
            </div>
          </>
        )}

        <Separator />

        {/* Bottom line */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className={`text-lg font-bold tabular-nums ${pnl.netCashflowPA >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnl.netCashflowPA < 0 ? `(${formatCurrency(Math.abs(pnl.netCashflowPA))})` : formatCurrency(pnl.netCashflowPA)}
              <span className="text-sm font-normal text-muted-foreground ml-1">/yr</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {pnl.netCashflowWeekly < 0 ? `(${formatCurrency(Math.abs(pnl.netCashflowWeekly))})` : formatCurrency(pnl.netCashflowWeekly)}/wk
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Gross Yield </span>
              <span className="font-semibold tabular-nums">{formatPercent(pnl.grossYield)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Net Yield </span>
              <span className={`font-semibold tabular-nums ${pnl.netYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercent(pnl.netYield)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
