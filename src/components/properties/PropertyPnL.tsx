import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react'
import { getMarginalTaxRate } from '@/lib/ausTax'
import type { Property, Liability } from '@/types/models'

interface PropertyPnLProps {
  property: Property
  mortgage?: Liability
  offsetBalance?: number
  grossSalary?: number
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
  interestWithoutOffsetPA: number
  interestSavingPA: number
  offsetBalance: number
  netCashflowPA: number
  netCashflowWeekly: number
  grossYield: number
  netYield: number
  // Negative gearing
  deductibleLossPA: number
  marginalTaxRate: number
  taxBenefitPA: number
  afterTaxCashflowPA: number
  afterTaxCashflowWeekly: number
}

export function calculatePropertyPnL(property: Property, mortgage?: Liability, offsetBalance: number = 0, grossSalary: number = 0): PnLResult {
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

  // Interest cost with offset
  const interestWithoutOffsetPA = mortgage ? mortgage.currentBalance * mortgage.interestRatePA : 0
  const effectiveMortgageBalance = mortgage ? Math.max(0, mortgage.currentBalance - offsetBalance) : 0
  const interestPA = mortgage ? effectiveMortgageBalance * mortgage.interestRatePA : 0
  const interestSavingPA = interestWithoutOffsetPA - interestPA

  // Net cashflow = net rental income minus financing costs
  const netCashflowPA = netRentalIncomePA - interestPA
  const netCashflowWeekly = netCashflowPA / 52

  const grossYield = property.currentValue > 0 ? grossRentPA / property.currentValue : 0
  const netYield = property.currentValue > 0 ? netRentalIncomePA / property.currentValue : 0

  // Negative gearing: if property makes a loss, that loss reduces taxable income
  const deductibleLossPA = Math.max(0, -netCashflowPA)
  const marginalTaxRate = grossSalary > 0 ? getMarginalTaxRate(grossSalary) : 0
  const taxBenefitPA = deductibleLossPA * marginalTaxRate
  const afterTaxCashflowPA = netCashflowPA + taxBenefitPA
  const afterTaxCashflowWeekly = afterTaxCashflowPA / 52

  return {
    grossRentPA, vacancyLossPA, effectiveRentPA,
    managementFeePA, councilRatesPA, waterRatesPA, insurancePA,
    strataPA, landTaxPA, maintenancePA, totalExpensesPA,
    netRentalIncomePA, interestPA, interestWithoutOffsetPA, interestSavingPA,
    offsetBalance,
    netCashflowPA, netCashflowWeekly,
    grossYield, netYield,
    deductibleLossPA, marginalTaxRate, taxBenefitPA,
    afterTaxCashflowPA, afterTaxCashflowWeekly,
  }
}

/** Format a currency value with parentheses for negatives */
function fmtAmt(amount: number): string {
  if (amount < 0) return `(${formatCurrency(Math.abs(amount))})`
  return formatCurrency(amount)
}

/** Column header row */
function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-1 mb-1">
      <span />
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right w-20">Monthly</span>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right w-20">Quarterly</span>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right w-20">Yearly</span>
    </div>
  )
}

function PnLRow({ label, amountPA, indent, bold, muted, color }: {
  label: string
  amountPA: number
  indent?: boolean
  bold?: boolean
  muted?: boolean
  color?: string
}) {
  const monthly = amountPA / 12
  const quarterly = amountPA / 4
  const yearly = amountPA
  const colorClass = (val: number) => color ? color : val < 0 ? 'text-red-400' : bold ? '' : 'text-foreground'

  return (
    <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-1 ${indent ? 'pl-4' : ''} ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground text-sm' : ''}`}>
      <span>{label}</span>
      <span className={`tabular-nums text-right w-20 ${colorClass(monthly)}`}>{fmtAmt(monthly)}</span>
      <span className={`tabular-nums text-right w-20 ${colorClass(quarterly)}`}>{fmtAmt(quarterly)}</span>
      <span className={`tabular-nums text-right w-20 ${colorClass(yearly)}`}>{fmtAmt(yearly)}</span>
    </div>
  )
}

/** Special row for percentage values — only shows in yearly column */
function PercentRow({ label, value, indent, muted }: {
  label: string
  value: number
  indent?: boolean
  muted?: boolean
}) {
  return (
    <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-1 ${indent ? 'pl-4' : ''} ${muted ? 'text-muted-foreground text-sm' : ''}`}>
      <span>{label}</span>
      <span className="w-20" />
      <span className="w-20" />
      <span className="tabular-nums text-right w-20">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

export function PropertyPnL({ property, mortgage, offsetBalance = 0, grossSalary = 0 }: PropertyPnLProps) {
  const pnl = calculatePropertyPnL(property, mortgage, offsetBalance, grossSalary)
  const isInvestment = property.type === 'investment'

  // For primary residence: use FULL mortgage interest (offset doesn't reduce your payment)
  // For investment: use net cashflow (rent - expenses - interest after offset)
  const displayCashflowPA = isInvestment
    ? pnl.netCashflowPA
    : -(pnl.totalExpensesPA + pnl.interestWithoutOffsetPA)

  const cashflowIcon = displayCashflowPA > 0
    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
    : displayCashflowPA < 0
    ? <TrendingDown className="h-4 w-4 text-red-400" />
    : <Minus className="h-4 w-4 text-muted-foreground" />

  const monthlyCashflow = displayCashflowPA / 12
  const yearlyCashflow = displayCashflowPA

  return (
    <Card className="border-dashed">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {cashflowIcon}
            <h4 className="font-semibold text-sm">{isInvestment ? 'Property P&L' : 'Holding Costs'}</h4>
            {isInvestment ? (
              <Badge className={pnl.netCashflowPA >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
              }>
                {pnl.netCashflowPA >= 0 ? 'Positive' : 'Negative'} Cashflow
              </Badge>
            ) : (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                Owner-Occupied
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground mr-1">Monthly</span>
              <span className={`font-bold tabular-nums ${monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtAmt(monthlyCashflow)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">Yearly</span>
              <span className={`font-bold tabular-nums ${yearlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtAmt(yearlyCashflow)}
              </span>
            </div>
            {isInvestment && (
              <div>
                <span className="text-muted-foreground mr-1">Net Yield</span>
                <span className={`font-bold tabular-nums ${pnl.netYield >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(pnl.netYield)}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Column headers */}
        <ColumnHeaders />

        {isInvestment ? (
          /* ── INVESTMENT PROPERTY ── */
          <>
            {/* Rental Income */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Rental Income</p>
              <PnLRow label="Gross Rental Income" amountPA={pnl.grossRentPA} />
              {pnl.vacancyLossPA > 0 && (
                <PnLRow label="Less Vacancy" amountPA={-pnl.vacancyLossPA} indent muted />
              )}
              {pnl.managementFeePA > 0 && <PnLRow label="Less Property Management" amountPA={-pnl.managementFeePA} indent muted />}
              {pnl.councilRatesPA > 0 && <PnLRow label="Less Council Rates" amountPA={-pnl.councilRatesPA} indent muted />}
              {pnl.waterRatesPA > 0 && <PnLRow label="Less Water Rates" amountPA={-pnl.waterRatesPA} indent muted />}
              {pnl.insurancePA > 0 && <PnLRow label="Less Insurance" amountPA={-pnl.insurancePA} indent muted />}
              {pnl.strataPA > 0 && <PnLRow label="Less Strata" amountPA={-pnl.strataPA} indent muted />}
              {pnl.landTaxPA > 0 && <PnLRow label="Less Land Tax" amountPA={-pnl.landTaxPA} indent muted />}
              {pnl.maintenancePA > 0 && <PnLRow label="Less Maintenance" amountPA={-pnl.maintenancePA} indent muted />}
              <PnLRow label="Net Rental Income" amountPA={pnl.netRentalIncomePA} bold />
            </div>
          </>
        ) : (
          /* ── PRIMARY RESIDENCE ── */
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Property Expenses</p>
              {pnl.councilRatesPA > 0 && <PnLRow label="Council Rates" amountPA={-pnl.councilRatesPA} indent muted />}
              {pnl.waterRatesPA > 0 && <PnLRow label="Water Rates" amountPA={-pnl.waterRatesPA} indent muted />}
              {pnl.insurancePA > 0 && <PnLRow label="Insurance" amountPA={-pnl.insurancePA} indent muted />}
              {pnl.strataPA > 0 && <PnLRow label="Strata" amountPA={-pnl.strataPA} indent muted />}
              {pnl.landTaxPA > 0 && <PnLRow label="Land Tax" amountPA={-pnl.landTaxPA} indent muted />}
              {pnl.maintenancePA > 0 && <PnLRow label="Maintenance" amountPA={-pnl.maintenancePA} indent muted />}
              {pnl.totalExpensesPA > 0 && <PnLRow label="Total Expenses" amountPA={-pnl.totalExpensesPA} bold />}
            </div>
          </>
        )}

        {(pnl.interestPA > 0 || pnl.interestSavingPA > 0) && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Financing</p>
              {isInvestment ? (
                // Investment: show offset breakdown if applicable
                pnl.offsetBalance > 0 ? (
                  <>
                    <PnLRow label="Mortgage Interest (before offset)" amountPA={-pnl.interestWithoutOffsetPA} indent muted />
                    <PnLRow label="Less Offset Saving" amountPA={pnl.interestSavingPA} indent muted color="text-emerald-400" />
                    <PnLRow label="Net Mortgage Interest" amountPA={-pnl.interestPA} bold />
                  </>
                ) : (
                  <PnLRow label="Mortgage Interest" amountPA={-pnl.interestPA} indent muted />
                )
              ) : (
                // Primary residence: show full mortgage interest (offset doesn't reduce payment)
                <PnLRow label="Mortgage Interest" amountPA={-pnl.interestWithoutOffsetPA} indent muted />
              )}
            </div>
          </>
        )}

        {isInvestment && pnl.taxBenefitPA > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Negative Gearing Tax Benefit
                </span>
              </p>
              <PnLRow label="Deductible Loss" amountPA={-pnl.deductibleLossPA} indent muted />
              <PercentRow label="Marginal Tax Rate" value={pnl.marginalTaxRate} indent muted />
              <PnLRow label="Annual Tax Benefit" amountPA={pnl.taxBenefitPA} bold color="text-emerald-400" />
              <p className="text-xs text-muted-foreground mt-1 pl-4">
                Tax refund of {formatCurrency(pnl.taxBenefitPA / 12)}/month reduces real cost of holding
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* Bottom line */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className={`text-lg font-bold tabular-nums ${displayCashflowPA >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtAmt(displayCashflowPA)}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                /yr {isInvestment ? '' : 'total holding cost'}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {fmtAmt(displayCashflowPA / 12)}/mo · {fmtAmt(displayCashflowPA / 52)}/wk
            </p>
            {isInvestment && pnl.taxBenefitPA > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-border">
                <p className={`text-base font-bold tabular-nums ${pnl.afterTaxCashflowPA >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {fmtAmt(pnl.afterTaxCashflowPA)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/yr after tax</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {fmtAmt(pnl.afterTaxCashflowPA / 12)}/mo after tax · {fmtAmt(pnl.afterTaxCashflowWeekly)}/wk after tax
                </p>
              </div>
            )}
          </div>
          {isInvestment && (
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}
