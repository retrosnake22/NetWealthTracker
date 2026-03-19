/**
 * Financial Snapshot Export — CSV and PDF
 *
 * Zero-dependency approach:
 * - CSV: plain string manipulation + Blob download
 * - PDF: generates styled HTML and opens browser print dialog (Save as PDF)
 */

import type { Asset, Property, Liability, IncomeItem, ExpenseBudget } from '@/types/models'
import type { DashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent } from '@/lib/format'

export interface SnapshotData {
  // Summary
  netWealth: number
  netWealthIncSuper: number
  totalAssets: number
  totalLiabilities: number
  metrics: DashboardMetrics
  debtRatio: number

  // Detail arrays
  assets: Asset[]
  properties: Property[]
  liabilities: Liability[]
  incomes: IncomeItem[]
  expenseBudgets: ExpenseBudget[]
}

// ─── CSV Export ───────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(c => escapeCsv(String(c))).join(',')
}

export function generateCsv(data: SnapshotData): string {
  const lines: string[] = []
  const date = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })

  // Header
  lines.push(csvRow(['Net Wealth Tracker — Financial Snapshot']))
  lines.push(csvRow([`Generated: ${date}`]))
  lines.push('')

  // Summary
  lines.push(csvRow(['SUMMARY']))
  lines.push(csvRow(['Metric', 'Value']))
  lines.push(csvRow(['Net Wealth (excl. Super)', data.netWealth]))
  lines.push(csvRow(['Net Wealth (incl. Super)', data.netWealthIncSuper]))
  lines.push(csvRow(['Total Assets', data.totalAssets]))
  lines.push(csvRow(['Total Liabilities', data.totalLiabilities]))
  lines.push(csvRow(['Monthly Income', data.metrics.monthlyIncome]))
  lines.push(csvRow(['Monthly Expenses', data.metrics.monthlyExpenses]))
  lines.push(csvRow(['Monthly Cashflow', data.metrics.monthlyCashflow]))
  lines.push(csvRow(['Savings Rate', `${data.metrics.savingsRate.toFixed(1)}%`]))
  lines.push(csvRow(['Debt-to-Asset Ratio', `${(data.debtRatio * 100).toFixed(1)}%`]))
  if (data.metrics.negGearingBenefitPA > 0) {
    lines.push(csvRow(['Neg. Gearing Benefit (p.a.)', data.metrics.negGearingBenefitPA]))
  }
  lines.push('')

  // Assets
  if (data.assets.length > 0) {
    lines.push(csvRow(['ASSETS']))
    lines.push(csvRow(['Name', 'Category', 'Current Value', 'Growth Rate p.a.']))
    for (const a of data.assets) {
      lines.push(csvRow([a.name, a.category, a.currentValue, `${(a.growthRatePA * 100).toFixed(1)}%`]))
    }
    lines.push('')
  }

  // Properties
  if (data.properties.length > 0) {
    lines.push(csvRow(['PROPERTIES']))
    lines.push(csvRow(['Name', 'Type', 'Current Value', 'Weekly Rent', 'Growth Rate p.a.']))
    for (const p of data.properties) {
      lines.push(csvRow([
        p.name,
        p.type === 'investment' ? 'Investment' : 'Primary Residence',
        p.currentValue,
        p.weeklyRent ?? 0,
        `${(p.growthRatePA * 100).toFixed(1)}%`,
      ]))
    }
    lines.push('')
  }

  // Liabilities
  if (data.liabilities.length > 0) {
    lines.push(csvRow(['LIABILITIES']))
    lines.push(csvRow(['Name', 'Category', 'Balance', 'Interest Rate', 'Repayment', 'Frequency']))
    for (const l of data.liabilities) {
      lines.push(csvRow([
        l.name,
        l.category,
        l.currentBalance,
        `${(l.interestRatePA * 100).toFixed(2)}%`,
        l.minimumRepayment,
        l.repaymentFrequency,
      ]))
    }
    lines.push('')
  }

  // Income
  if (data.incomes.length > 0) {
    lines.push(csvRow(['INCOME']))
    lines.push(csvRow(['Name', 'Category', 'Monthly Amount', 'Active']))
    for (const i of data.incomes) {
      lines.push(csvRow([i.name, i.category, i.monthlyAmount, i.isActive ? 'Yes' : 'No']))
    }
    lines.push('')
  }

  // Expenses
  const livingBudgets = data.expenseBudgets.filter(b => !b.linkedPropertyId && !b.linkedAssetId)
  if (livingBudgets.length > 0) {
    lines.push(csvRow(['EXPENSES (Living)']))
    lines.push(csvRow(['Category', 'Label', 'Monthly Budget']))
    for (const b of livingBudgets) {
      lines.push(csvRow([b.category, b.label, b.monthlyBudget]))
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadCsv(data: SnapshotData): void {
  const csv = generateCsv(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nwt-financial-snapshot-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── PDF Export (via browser print) ──────────────────────────────────────

function fmtCur(v: number): string {
  return formatCurrency(v)
}

function buildPdfHtml(data: SnapshotData): string {
  const date = new Date().toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const { metrics } = data

  // Category label mapping
  const categoryLabels: Record<string, string> = {
    cash: 'Cash & Savings', stocks: 'Shares / Stocks', super: 'Superannuation',
    vehicles: 'Vehicles', other: 'Other', property: 'Property',
    mortgage: 'Mortgage', home_loan: 'Home Loan', personal_loan: 'Personal Loan',
    car_loan: 'Car Loan', credit_card: 'Credit Card', hecs: 'HECS-HELP', 
    salary: 'Salary', rental: 'Rental', dividends: 'Dividends',
    interest: 'Interest', side_hustle: 'Side Hustle',
    primary_residence: 'Primary Residence', investment: 'Investment',
  }
  const catLabel = (cat: string) => categoryLabels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')

  const savingsTag = metrics.savingsRate >= 50 ? 'Excellent' : metrics.savingsRate >= 30 ? 'Moderate' : metrics.savingsRate > 0 ? 'Low' : 'None'
  const debtTag = data.debtRatio < 0.3 ? 'Healthy' : data.debtRatio < 0.5 ? 'Moderate' : 'High'

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Financial Snapshot — ${date}</title>
<style>
  @page { margin: 15mm 12mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .header h1 { font-size: 20px; font-weight: 800; color: #1e40af; }
  .header .date { font-size: 10px; color: #64748b; }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  .summary-card {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .summary-card .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px; }
  .summary-card .value { font-size: 16px; font-weight: 800; color: #0f172a; }
  .summary-card .tag { font-size: 8px; font-weight: 700; padding: 1px 6px; border-radius: 9px; display: inline-block; margin-top: 3px; }
  .tag-green { background: #dcfce7; color: #166534; }
  .tag-amber { background: #fef3c7; color: #92400e; }
  .tag-red { background: #fee2e2; color: #991b1b; }
  .positive { color: #059669; }
  .negative { color: #dc2626; }
  h2 {
    font-size: 13px;
    font-weight: 700;
    color: #1e40af;
    margin: 16px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
  th { text-align: left; padding: 5px 8px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.03em; color: #475569; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .total-row { background: #f8fafc; font-weight: 700; border-top: 2px solid #e2e8f0; }
  .total-row td { padding-top: 6px; }
  .footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px;
    color: #94a3b8;
    text-align: center;
  }
  .cashflow-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
  .cashflow-box { padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .cashflow-box h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; margin-bottom: 6px; }
  .cashflow-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .cashflow-total { border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 4px; font-weight: 700; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Financial Snapshot</h1>
  <span class="date">${date}</span>
</div>

<!-- Summary cards -->
<div class="summary-grid">
  <div class="summary-card">
    <div class="label">Net Wealth (excl. Super)</div>
    <div class="value">${fmtCur(data.netWealth)}</div>
  </div>
  <div class="summary-card">
    <div class="label">Monthly Cashflow</div>
    <div class="value ${metrics.monthlyCashflow >= 0 ? 'positive' : 'negative'}">${fmtCur(metrics.monthlyCashflow)}</div>
  </div>
  <div class="summary-card">
    <div class="label">Savings Rate</div>
    <div class="value">${metrics.savingsRate.toFixed(1)}%</div>
    <div class="tag ${savingsTag === 'Excellent' ? 'tag-green' : savingsTag === 'Moderate' ? 'tag-amber' : 'tag-red'}">${savingsTag}</div>
  </div>
  <div class="summary-card">
    <div class="label">Debt Ratio</div>
    <div class="value">${formatPercent(data.debtRatio)}</div>
    <div class="tag ${debtTag === 'Healthy' ? 'tag-green' : debtTag === 'Moderate' ? 'tag-amber' : 'tag-red'}">${debtTag}</div>
  </div>
</div>

<!-- Cashflow breakdown -->
<div class="cashflow-section">
  <div class="cashflow-box">
    <h3>Monthly Income</h3>
    ${metrics.baseIncome > 0 ? `<div class="cashflow-row"><span>Employment</span><span>${fmtCur(metrics.baseIncome)}</span></div>` : ''}
    ${metrics.rentalIncome > 0 ? `<div class="cashflow-row"><span>Rental Income</span><span>${fmtCur(metrics.rentalIncome)}</span></div>` : ''}
    ${metrics.interestIncome > 0 ? `<div class="cashflow-row"><span>Interest</span><span>${fmtCur(metrics.interestIncome)}</span></div>` : ''}
    ${metrics.dividendIncome > 0 ? `<div class="cashflow-row"><span>Dividends</span><span>${fmtCur(metrics.dividendIncome)}</span></div>` : ''}
    <div class="cashflow-row cashflow-total"><span>Total</span><span class="positive">${fmtCur(metrics.monthlyIncome)}</span></div>
  </div>
  <div class="cashflow-box">
    <h3>Monthly Expenses</h3>
    ${metrics.baseExpenses > 0 ? `<div class="cashflow-row"><span>Living Expenses</span><span>${fmtCur(metrics.baseExpenses)}</span></div>` : ''}
    ${metrics.mortgageExpenses > 0 ? `<div class="cashflow-row"><span>Loan Repayments</span><span>${fmtCur(metrics.mortgageExpenses)}</span></div>` : ''}
    ${metrics.propertyRunningCosts > 0 ? `<div class="cashflow-row"><span>Property Costs</span><span>${fmtCur(metrics.propertyRunningCosts)}</span></div>` : ''}
    <div class="cashflow-row cashflow-total"><span>Total</span><span class="negative">${fmtCur(metrics.monthlyExpenses)}</span></div>
  </div>
</div>`

  // Assets table
  if (data.assets.length > 0) {
    const assetTotal = data.assets.reduce((s, a) => s + a.currentValue, 0)
    html += `
<h2>Assets</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th class="text-right">Value</th><th class="text-right">Growth p.a.</th></tr></thead>
  <tbody>
    ${data.assets.map(a => `<tr><td>${a.name}</td><td>${catLabel(a.category)}</td><td class="text-right">${fmtCur(a.currentValue)}</td><td class="text-right">${(a.growthRatePA * 100).toFixed(1)}%</td></tr>`).join('\n    ')}
    <tr class="total-row"><td colspan="2">Total Assets (non-property)</td><td class="text-right">${fmtCur(assetTotal)}</td><td></td></tr>
  </tbody>
</table>`
  }

  // Properties table
  if (data.properties.length > 0) {
    const propTotal = data.properties.reduce((s, p) => s + p.currentValue, 0)
    html += `
<h2>Properties</h2>
<table>
  <thead><tr><th>Name</th><th>Type</th><th class="text-right">Value</th><th class="text-right">Weekly Rent</th><th class="text-right">Growth p.a.</th></tr></thead>
  <tbody>
    ${data.properties.map(p => `<tr><td>${p.name}</td><td>${catLabel(p.type)}</td><td class="text-right">${fmtCur(p.currentValue)}</td><td class="text-right">${p.weeklyRent ? fmtCur(p.weeklyRent) : '—'}</td><td class="text-right">${(p.growthRatePA * 100).toFixed(1)}%</td></tr>`).join('\n    ')}
    <tr class="total-row"><td colspan="2">Total Property Value</td><td class="text-right">${fmtCur(propTotal)}</td><td></td><td></td></tr>
  </tbody>
</table>`
  }

  // Liabilities table
  if (data.liabilities.length > 0) {
    const liaTotal = data.liabilities.reduce((s, l) => s + l.currentBalance, 0)
    html += `
<h2>Liabilities</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th class="text-right">Balance</th><th class="text-right">Interest Rate</th><th class="text-right">Repayment</th><th>Freq.</th></tr></thead>
  <tbody>
    ${data.liabilities.map(l => `<tr><td>${l.name}</td><td>${catLabel(l.category)}</td><td class="text-right">${fmtCur(l.currentBalance)}</td><td class="text-right">${(l.interestRatePA * 100).toFixed(2)}%</td><td class="text-right">${fmtCur(l.minimumRepayment)}</td><td>${l.repaymentFrequency}</td></tr>`).join('\n    ')}
    <tr class="total-row"><td colspan="2">Total Liabilities</td><td class="text-right">${fmtCur(liaTotal)}</td><td></td><td></td><td></td></tr>
  </tbody>
</table>`
  }

  // Income table
  if (data.incomes.length > 0) {
    html += `
<h2>Income Sources</h2>
<table>
  <thead><tr><th>Name</th><th>Category</th><th class="text-right">Monthly</th><th>Status</th></tr></thead>
  <tbody>
    ${data.incomes.map(i => `<tr><td>${i.name}</td><td>${catLabel(i.category)}</td><td class="text-right">${fmtCur(i.monthlyAmount)}</td><td>${i.isActive ? '✓ Active' : 'Inactive'}</td></tr>`).join('\n    ')}
  </tbody>
</table>`
  }

  // Expense budgets
  const livingBudgets = data.expenseBudgets.filter(b => !b.linkedPropertyId && !b.linkedAssetId)
  if (livingBudgets.length > 0) {
    const budgetTotal = livingBudgets.reduce((s, b) => s + b.monthlyBudget, 0)
    html += `
<h2>Living Expenses Budget</h2>
<table>
  <thead><tr><th>Category</th><th>Label</th><th class="text-right">Monthly</th></tr></thead>
  <tbody>
    ${livingBudgets.map(b => `<tr><td>${catLabel(b.category)}</td><td>${b.label}</td><td class="text-right">${fmtCur(b.monthlyBudget)}</td></tr>`).join('\n    ')}
    <tr class="total-row"><td colspan="2">Total Budget</td><td class="text-right">${fmtCur(budgetTotal)}</td></tr>
  </tbody>
</table>`
  }

  // Neg gearing
  if (metrics.negGearingBenefitPA > 0) {
    html += `
<h2>Tax Benefits</h2>
<table>
  <tbody>
    <tr><td>Negative Gearing Benefit (p.a.)</td><td class="text-right positive font-bold">${fmtCur(metrics.negGearingBenefitPA)}</td></tr>
    <tr><td>Total Deductible Losses (p.a.)</td><td class="text-right">${fmtCur(metrics.negGearingDeductiblePA)}</td></tr>
  </tbody>
</table>`
  }

  html += `
<div class="footer">
  Generated by Net Wealth Tracker • ${date} • This report is a point-in-time snapshot and not financial advice.
</div>
</body>
</html>`

  return html
}

export function downloadPdf(data: SnapshotData): void {
  const html = buildPdfHtml(data)

  // Open a new window with the styled HTML and trigger print
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    // Fallback: if popup blocked, download as HTML
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nwt-financial-snapshot-${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to render, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}
