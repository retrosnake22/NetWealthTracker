import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Home, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { FinanceState } from '@/stores/useFinanceStore'
import type { Asset, Property, AssetCategory, MortgageType } from '@/types/models'
import { formatCurrency } from '@/lib/format'
import { PropertyPnL, calculatePropertyPnL } from '@/components/properties/PropertyPnL'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
	cash: 'Cash & Savings',
	property: 'Property',
	stocks: 'Shares / Stocks',
	super: 'Superannuation',
	vehicles: 'Vehicles',
	other: 'Other',
}

const CATEGORY_ICONS: Record<AssetCategory, string> = {
	cash: '💰',
	property: '🏠',
	stocks: '📈',
	super: '🎯',
	vehicles: '🚗',
	other: '📦',
}

// Color accents per category for the visual refresh
const CATEGORY_COLORS: Record<string, { border: string; badge: string; badgeText: string; total: string; darkTotal: string }> = {
	cash:     { border: 'border-l-amber-400',  badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',  badgeText: '', total: 'text-amber-600', darkTotal: 'dark:text-amber-400' },
	stocks:   { border: 'border-l-violet-500',  badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300', badgeText: '', total: 'text-violet-600', darkTotal: 'dark:text-violet-400' },
	super:    { border: 'border-l-pink-500',    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',     badgeText: '', total: 'text-pink-600', darkTotal: 'dark:text-pink-400' },
	vehicles: { border: 'border-l-orange-500',  badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', badgeText: '', total: 'text-orange-600', darkTotal: 'dark:text-orange-400' },
	other:    { border: 'border-l-slate-400',   badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',    badgeText: '', total: 'text-slate-600', darkTotal: 'dark:text-slate-400' },
	property: { border: 'border-l-teal-500',    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',     badgeText: '', total: 'text-teal-600', darkTotal: 'dark:text-teal-400' },
}

/** Format a cashflow value with parentheses for negatives */
const fmtCashflow = (v: number) => v < 0 ? `(${formatCurrency(Math.abs(v))})` : formatCurrency(v)

// Mortgage calculation helpers (same as wizard)
function calcMortgageMonthly(balance: number, annualRate: number, type: MortgageType, termYears: number): number {
	if (type === 'interest_only') return (balance * annualRate) / 12
	if (annualRate === 0) return balance / (termYears * 12)
	const r = annualRate / 12
	const n = termYears * 12
	return balance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function autoCalcRepayment(balance: string, rate: string, type: MortgageType, term: string): string {
	const bal = parseFloat(balance) || 0
	const r = (parseFloat(rate) || 0) / 100
	const t = parseInt(term) || 30
	if (bal <= 0) return ''
	return Math.round(calcMortgageMonthly(bal, r, type, t)).toString()
}

export default function AssetsPage() {
	const store = useFinanceStore() as FinanceState
	const { assets, properties, liabilities, incomes, expenseBudgets, addAsset, updateAsset, removeAsset, addProperty, updateProperty, removeProperty, updateLiability, addLiability, removeLiability, addExpenseBudget, removeExpenseBudget, } = store

	// Clean up orphaned car loan liabilities and expenses on mount
	useEffect(() => {
		const state = useFinanceStore.getState()
		const assetIds = new Set(state.assets.map(a => a.id))
		const assetNames = new Set(state.assets.map(a => a.name))
		// Clean orphan car_loan liabilities (name-based match to deleted vehicles)
		for (const l of state.liabilities) {
			if (l.category === 'car_loan') {
				const vehicleName = l.name.replace(/ Car Loan$/, '')
				if (!assetNames.has(vehicleName)) {
					state.removeLiability(l.id)
				}
			}
		}
		// Clean orphan vehicle-linked expense budgets
		for (const b of state.expenseBudgets) {
			if (b.linkedAssetId && !assetIds.has(b.linkedAssetId)) {
				state.removeExpenseBudget(b.id)
			}
		}
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	// Find gross salary for negative gearing calc
	const grossSalary = useMemo(() => {
		const salaryItem = incomes.find(i => i.category === 'salary' && i.isActive)
		return salaryItem ? salaryItem.monthlyAmount * 12 : 0
	}, [incomes])
	const [searchParams] = useSearchParams()
	const categoryFilter = searchParams.get('category') as AssetCategory | 'property' | null

	// P&L expand state
	const [expandedPnL, setExpandedPnL] = useState<Set<string>>(new Set())
	const togglePnL = (id: string) => {
		setExpandedPnL(prev => {
			const next = new Set(prev)
			next.has(id) ? next.delete(id) : next.add(id)
			return next
		})
	}

	// Asset editing
	const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
	const [showAddAsset, setShowAddAsset] = useState(false)
	const [assetForm, setAssetForm] = useState({
		name: '', value: '', category: 'cash' as AssetCategory,
		isOffset: false, linkedMortgageId: '',
		vehicleFinancing: 'owned' as 'owned' | 'car_loan' | 'lease',
		loanBalance: '', loanRate: '', loanRepayment: '', loanTerm: '5',
		leasePayment: '',
		cashType: 'bank' as 'cash' | 'bank',
		bankName: '',
		interestRate: '',
		hasMarginLoan: false,
		marginLoanBalance: '',
		marginLoanRate: '',
		marginLoanTerm: '5',
		paysDividends: false,
		dividendYield: '4.00',
	})

	// Property editing
	const [editingProperty, setEditingProperty] = useState<Property | null>(null)
	const [showAddProperty, setShowAddProperty] = useState(false)
	const [propForm, setPropForm] = useState({
		name: '', type: 'primary_residence' as 'primary_residence' | 'investment',
		currentValue: '', weeklyRent: '', vacancyRatePA: '',
		councilRatesPA: '', waterRatesPA: '', insurancePA: '',
		strataPA: '', maintenanceBudgetPA: '', propertyManagementPct: '', landTaxPA: '',
		linkedMortgageId: '',
		hasMortgage: false,
		mortgageBalance: '',
		interestRate: '',
		mortgageType: 'principal_and_interest' as MortgageType,
		loanTermYears: '30',
		repayment: '',
		repaymentOverridden: false,
	})

	const filteredAssets = useMemo(() => {
		if (!categoryFilter || categoryFilter === 'property') return assets
		return assets.filter(a => a.category === categoryFilter)
	}, [assets, categoryFilter])

	const showProperties = !categoryFilter || categoryFilter === 'property'
	const showAssets = categoryFilter !== 'property'

	const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
	const totalProperties = properties.reduce((s, p) => s + p.currentValue, 0)
	const totalPropertyDebt = properties.reduce((s, p) => {
		const mortgage = liabilities.find(l => l.id === p.mortgageId)
		return s + (mortgage?.currentBalance ?? 0)
	}, 0)
	const totalEquity = totalProperties - totalPropertyDebt

	// Get mortgage-type liabilities for linking
	const mortgageLiabilities = useMemo(() =>
		liabilities.filter(l => l.category === 'mortgage' || l.category === 'home_loan'),
		[liabilities]
	)

	// Find mortgage for a property (check both directions)
	const findMortgage = (p: Property) => {
		if (p.mortgageId) {
			const m = liabilities.find(l => l.id === p.mortgageId)
			if (m) return m
		}
		return liabilities.find(l => l.linkedPropertyId === p.id)
	}

	// Auto-calc repayment when mortgage fields change
	const updateMortgageField = (updates: Partial<typeof propForm>) => {
		setPropForm(prev => {
			const merged = { ...prev, ...updates }
			if (!merged.repaymentOverridden && merged.mortgageBalance && merged.interestRate) {
				merged.repayment = autoCalcRepayment(merged.mortgageBalance, merged.interestRate, merged.mortgageType, merged.loanTermYears)
			}
			return merged
		})
	}

	// Calculate total offset balance for a mortgage
	const getOffsetBalance = (mortgageId: string): number => {
		return assets
			.filter(a => a.category === 'cash' && (a as any).isOffset && (a as any).linkedMortgageId === mortgageId)
			.reduce((sum, a) => sum + a.currentValue, 0)
	}

	// Auto-calculate monthly repayment using standard amortization formula
	function calcMonthlyRepayment(balance: number, annualRate: number, termYears: number): number {
		if (balance <= 0 || termYears <= 0) return 0
		if (annualRate <= 0) return balance / (termYears * 12) // No interest — just principal / months
		const monthlyRate = annualRate / 12
		const numPayments = termYears * 12
		return balance * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
	}

	// --- Asset handlers ---
	function openAddAsset() {
		setAssetForm({
			name: '', value: '',
			category: (categoryFilter && categoryFilter !== 'property' ? categoryFilter : 'cash') as AssetCategory,
			isOffset: false, linkedMortgageId: '',
			vehicleFinancing: 'owned' as 'owned' | 'car_loan' | 'lease',
			loanBalance: '', loanRate: '', loanRepayment: '', loanTerm: '5',
			leasePayment: '',
			cashType: 'bank' as 'cash' | 'bank',
			bankName: '',
			interestRate: '',
			hasMarginLoan: false,
			marginLoanBalance: '',
			marginLoanRate: '',
			marginLoanTerm: '5',
			paysDividends: false,
			dividendYield: '4.00',
		})
		setEditingAsset(null)
		setShowAddAsset(true)
	}
	function openEditAsset(a: Asset) {
		// Populate loan fields from linked liability if it's a car loan
		// Try linked ID first, then fallback to name-based matching
		const linkedLiabilityId = (a as any).linkedLiabilityId
		let linkedLiability = linkedLiabilityId ? liabilities.find(l => l.id === linkedLiabilityId) : null
		if (!linkedLiability && a.category === 'vehicles') {
			linkedLiability = liabilities.find(l => l.category === 'car_loan' && l.name === `${a.name} Car Loan`) ?? null
		}
		// Populate margin loan fields for stocks
		let marginLoanLiability = null
		if (a.category === 'stocks') {
			if (linkedLiabilityId) {
				marginLoanLiability = liabilities.find(l => l.id === linkedLiabilityId) ?? null
			}
			if (!marginLoanLiability) {
				marginLoanLiability = liabilities.find(l => l.category === 'personal_loan' && l.name === `${a.name} Loan`) ?? null
			}
		}
		setAssetForm({
			name: a.name, value: String(a.currentValue), category: a.category,
			isOffset: (a as any).isOffset ?? false,
			linkedMortgageId: (a as any).linkedMortgageId ?? '',
			vehicleFinancing: (a as any).financingType ?? (linkedLiability ? 'car_loan' : 'owned'),
			loanBalance: linkedLiability ? String(linkedLiability.currentBalance) : '',
			loanRate: linkedLiability ? (linkedLiability.interestRatePA * 100).toFixed(2) : '',
			loanRepayment: linkedLiability ? String(linkedLiability.minimumRepayment) : '',
			loanTerm: linkedLiability?.loanTermYears ? String(linkedLiability.loanTermYears) : '5',
			leasePayment: String((a as any).leaseMonthlyPayment ?? ''),
			cashType: (a as any).cashType || 'bank',
			bankName: (a as any).bankName || '',
			interestRate: (a as any).cashType === 'cash' ? '0' : (a.growthRatePA * 100).toFixed(2),
			hasMarginLoan: !!marginLoanLiability,
			marginLoanBalance: marginLoanLiability ? String(marginLoanLiability.currentBalance) : '',
			marginLoanRate: marginLoanLiability ? (marginLoanLiability.interestRatePA * 100).toFixed(2) : '',
			marginLoanTerm: marginLoanLiability?.loanTermYears ? String(marginLoanLiability.loanTermYears) : '5',
			paysDividends: (a as any).paysDividends ?? false,
			dividendYield: (a as any).dividendYieldPA ? ((a as any).dividendYieldPA * 100).toFixed(2) : '4.00',
		})
		setEditingAsset(a)
		setShowAddAsset(true)
	}
	function saveAsset() {
		const data: any = {
			name: assetForm.name,
			currentValue: parseFloat(assetForm.value) || 0,
			growthRatePA: editingAsset?.growthRatePA ?? 0,
			category: assetForm.category,
		}
		// Add offset and cash type fields for cash assets
		if (assetForm.category === 'cash') {
			data.cashType = assetForm.cashType
			data.bankName = assetForm.cashType === 'bank' ? assetForm.bankName : undefined
			data.growthRatePA = assetForm.cashType === 'cash' ? 0 : (parseFloat(assetForm.interestRate) || 0) / 100
			data.isOffset = assetForm.isOffset
			data.linkedMortgageId = assetForm.isOffset ? (assetForm.linkedMortgageId || undefined) : undefined
		} else {
			data.isOffset = false
			data.linkedMortgageId = undefined
		}

		// Add dividend fields for stock assets
		if (assetForm.category === 'stocks') {
			data.paysDividends = assetForm.paysDividends
			data.dividendYieldPA = assetForm.paysDividends ? (parseFloat(assetForm.dividendYield) || 0) / 100 : 0
		}

		// Save the asset first
		let assetId = editingAsset?.id
		if (editingAsset) {
			updateAsset(editingAsset.id, data)
		} else {
			addAsset(data)
			const newAssets = useFinanceStore.getState().assets
			assetId = newAssets[newAssets.length - 1]?.id
		}

		// Handle vehicle financing
		if (assetForm.category === 'vehicles' && assetId) {
			const financing = assetForm.vehicleFinancing
			const assetName = assetForm.name
			const oldLinkedLiabilityId = editingAsset ? (editingAsset as any).linkedLiabilityId : undefined
			const oldLinkedExpenseId = editingAsset ? (editingAsset as any).linkedExpenseId : undefined

			// Helper: find car loan liability (by linked ID or name match)
			const findLinkedLiability = () => {
				if (oldLinkedLiabilityId) {
					const byId = liabilities.find(l => l.id === oldLinkedLiabilityId)
					if (byId) return byId
				}
				// Fallback: match by name pattern (handles pre-existing data without linked IDs)
				return liabilities.find(l =>
					l.category === 'car_loan' &&
					(l.name === `${editingAsset?.name} Car Loan` || l.name === `${assetName} Car Loan`)
				)
			}

			// Helper: find car loan expense (by linked ID, linkedAssetId, or label match)
			const findLinkedExpense = () => {
				if (oldLinkedExpenseId) {
					const byId = expenseBudgets.find(b => b.id === oldLinkedExpenseId)
					if (byId) return byId
				}
				return expenseBudgets.find(b =>
					b.linkedAssetId === assetId ||
					b.label === `${editingAsset?.name} Car Loan Repayment` ||
					b.label === `${assetName} Car Loan Repayment`
				)
			}

			// Helper: find lease expense
			const findLinkedLeaseExpense = () => {
				if (oldLinkedExpenseId) {
					const byId = expenseBudgets.find(b => b.id === oldLinkedExpenseId)
					if (byId) return byId
				}
				return expenseBudgets.find(b =>
					b.linkedAssetId === assetId ||
					b.label === `${editingAsset?.name} Lease Payment` ||
					b.label === `${assetName} Lease Payment`
				)
			}

			// --- Clean up when NOT car_loan anymore ---
			if (financing !== 'car_loan') {
				const linkedLiab = findLinkedLiability()
				if (linkedLiab) removeLiability(linkedLiab.id)
				const linkedExp = findLinkedExpense()
				if (linkedExp) removeExpenseBudget(linkedExp.id)
			}

			// --- Clean up when NOT lease anymore ---
			if (financing !== 'lease') {
				const leaseExp = findLinkedLeaseExpense()
				if (leaseExp) removeExpenseBudget(leaseExp.id)
			}

			if (financing === 'car_loan') {
				const loanBalance = parseFloat(assetForm.loanBalance) || 0
				const loanRateDecimal = (parseFloat(assetForm.loanRate) || 0) / 100
				const loanTermYears = parseFloat(assetForm.loanTerm) || 5
				const monthlyRepayment = calcMonthlyRepayment(loanBalance, loanRateDecimal, loanTermYears)
				const roundedRepayment = Math.round(monthlyRepayment * 100) / 100

				// Check if liability already exists (editing existing car loan)
				const existingLiability = findLinkedLiability()

				if (existingLiability) {
					updateLiability(existingLiability.id, {
						name: `${assetName} Car Loan`,
						currentBalance: loanBalance,
						interestRatePA: loanRateDecimal,
						minimumRepayment: roundedRepayment,
						loanTermYears: loanTermYears,
					})
					// Update or create expense budget
					const existingExpense = findLinkedExpense()
					if (existingExpense) {
						store.updateExpenseBudget(existingExpense.id, {
							label: `${assetName} Car Loan Repayment`,
							monthlyBudget: roundedRepayment,
						})
					} else {
						addExpenseBudget({
							category: 'transport',
							label: `${assetName} Car Loan Repayment`,
							monthlyBudget: roundedRepayment,
							linkedAssetId: assetId,
						})
						const newBudgets = useFinanceStore.getState().expenseBudgets
						const newExpense = newBudgets[newBudgets.length - 1]
						if (newExpense) updateAsset(assetId, { linkedExpenseId: newExpense.id } as any)
					}
					updateAsset(assetId, {
						financingType: 'car_loan',
						linkedLiabilityId: existingLiability.id,
					} as any)
				} else {
					// Create a new car loan liability
					addLiability({
						name: `${assetName} Car Loan`,
						category: 'car_loan',
						currentBalance: loanBalance,
						interestRatePA: loanRateDecimal,
						minimumRepayment: roundedRepayment,
						repaymentFrequency: 'monthly',
						loanTermYears: loanTermYears,
					})
					const newLiabilities = useFinanceStore.getState().liabilities
					const newLiability = newLiabilities[newLiabilities.length - 1]

					// Create expense budget for the car loan repayment
					addExpenseBudget({
						category: 'transport',
						label: `${assetName} Car Loan Repayment`,
						monthlyBudget: roundedRepayment,
						linkedAssetId: assetId,
					})
					const newBudgets = useFinanceStore.getState().expenseBudgets
					const newExpense = newBudgets[newBudgets.length - 1]

					if (newLiability) {
						updateAsset(assetId, {
							financingType: 'car_loan',
							linkedLiabilityId: newLiability.id,
							linkedExpenseId: newExpense?.id,
						} as any)
					}
				}
			} else if (financing === 'lease') {
				const existingLeaseExpense = findLinkedLeaseExpense()
				if (existingLeaseExpense) {
					store.updateExpenseBudget(existingLeaseExpense.id, {
						label: `${assetName} Lease Payment`,
						monthlyBudget: parseFloat(assetForm.leasePayment) || 0,
					})
					updateAsset(assetId, {
						financingType: 'lease',
						linkedExpenseId: existingLeaseExpense.id,
						leaseMonthlyPayment: parseFloat(assetForm.leasePayment) || 0,
					} as any)
				} else {
					addExpenseBudget({
						category: 'transport',
						label: `${assetName} Lease Payment`,
						monthlyBudget: parseFloat(assetForm.leasePayment) || 0,
						linkedAssetId: assetId,
					})
					const newBudgets = useFinanceStore.getState().expenseBudgets
					const newBudget = newBudgets[newBudgets.length - 1]
					if (newBudget) {
						updateAsset(assetId, {
							financingType: 'lease',
							linkedExpenseId: newBudget.id,
							leaseMonthlyPayment: parseFloat(assetForm.leasePayment) || 0,
						} as any)
					}
				}
			} else {
				// Owned — clear all financing links on the asset
				updateAsset(assetId, {
					financingType: 'owned',
					linkedLiabilityId: undefined,
					linkedExpenseId: undefined,
					leaseMonthlyPayment: undefined,
				} as any)
			}
		}

		// Handle stocks margin loan
		if (assetForm.category === 'stocks' && assetId) {
			const assetName = assetForm.name
			const oldLinkedLiabilityId = editingAsset ? (editingAsset as any).linkedLiabilityId : undefined

			// Helper: find existing margin loan liability (by linked ID or name match)
			const findMarginLoanLiability = () => {
				if (oldLinkedLiabilityId) {
					const byId = liabilities.find(l => l.id === oldLinkedLiabilityId)
					if (byId) return byId
				}
				return liabilities.find(l =>
					l.category === 'personal_loan' &&
					(l.name === `${editingAsset?.name} Loan` || l.name === `${assetName} Loan`)
				)
			}

			if (!assetForm.hasMarginLoan) {
				// Remove margin loan if it exists
				const existingMarginLoan = findMarginLoanLiability()
				if (existingMarginLoan) removeLiability(existingMarginLoan.id)
				updateAsset(assetId, { linkedLiabilityId: undefined, hasMarginLoan: false } as any)
			} else {
				const marginBalance = parseFloat(assetForm.marginLoanBalance) || 0
				const marginRateDecimal = (parseFloat(assetForm.marginLoanRate) || 0) / 100
				const marginTermYears = parseFloat(assetForm.marginLoanTerm) || 5
				const marginRepayment = calcMonthlyRepayment(marginBalance, marginRateDecimal, marginTermYears)
				const roundedMarginRepayment = Math.round(marginRepayment * 100) / 100

				const existingMarginLoan = findMarginLoanLiability()
				if (existingMarginLoan) {
					updateLiability(existingMarginLoan.id, {
						name: `${assetName} Loan`,
						currentBalance: marginBalance,
						interestRatePA: marginRateDecimal,
						minimumRepayment: roundedMarginRepayment,
						loanTermYears: marginTermYears,
					})
					updateAsset(assetId, { linkedLiabilityId: existingMarginLoan.id, hasMarginLoan: true } as any)
				} else {
					// Create a new margin loan liability
					addLiability({
						name: `${assetName} Loan`,
						category: 'personal_loan',
						currentBalance: marginBalance,
						interestRatePA: marginRateDecimal,
						minimumRepayment: roundedMarginRepayment,
						repaymentFrequency: 'monthly',
						loanTermYears: marginTermYears,
					})
					const newLiabilities = useFinanceStore.getState().liabilities
					const newMarginLoan = newLiabilities[newLiabilities.length - 1]
					if (newMarginLoan) {
						updateAsset(assetId, { linkedLiabilityId: newMarginLoan.id, hasMarginLoan: true } as any)
					}
				}
			}
		}

		setShowAddAsset(false)
		setEditingAsset(null)
	}

	// --- Property handlers ---
	function openAddProperty() {
		setPropForm({
			name: '', type: 'primary_residence', currentValue: '', weeklyRent: '', vacancyRatePA: '',
			councilRatesPA: '', waterRatesPA: '', insurancePA: '',
			strataPA: '', maintenanceBudgetPA: '', propertyManagementPct: '', landTaxPA: '',
			linkedMortgageId: '',
			hasMortgage: false, mortgageBalance: '', interestRate: '',
			mortgageType: 'principal_and_interest' as MortgageType, loanTermYears: '30',
			repayment: '', repaymentOverridden: false,
		})
		setEditingProperty(null)
		setShowAddProperty(true)
	}
	function openEditProperty(p: Property) {
		const mortgage = p.mortgageId ? liabilities.find(l => l.id === p.mortgageId) : findMortgage(p)
		setPropForm({
			name: p.name,
			type: p.type,
			currentValue: String(p.currentValue),
			weeklyRent: String(p.weeklyRent ?? ''),
			vacancyRatePA: String(p.vacancyRatePA ?? ''),
			councilRatesPA: String((p.councilRatesPA ?? 0) / 4 || ''),
			waterRatesPA: String((p.waterRatesPA ?? 0) / 4 || ''),
			insurancePA: String(p.insurancePA ?? ''),
			strataPA: String((p.strataPA ?? 0) / 4 || ''),
			maintenanceBudgetPA: String(p.maintenanceBudgetPA ?? ''),
			propertyManagementPct: String(p.propertyManagementPct ?? ''),
			landTaxPA: String(p.landTaxPA ?? ''),
			linkedMortgageId: mortgage?.id ?? '',
			hasMortgage: !!mortgage,
			mortgageBalance: mortgage ? String(mortgage.currentBalance) : '',
			interestRate: mortgage ? (mortgage.interestRatePA * 100).toFixed(2) : '',
			mortgageType: mortgage?.mortgageType ?? 'principal_and_interest',
			loanTermYears: mortgage?.loanTermYears ? String(mortgage.loanTermYears) : '30',
			repayment: mortgage ? String(mortgage.minimumRepayment) : '',
			repaymentOverridden: false,
		})
		setEditingProperty(p)
		setShowAddProperty(true)
	}
	function saveProperty() {
		const data: any = {
			name: propForm.name,
			type: propForm.type,
			currentValue: parseFloat(propForm.currentValue) || 0,
			growthRatePA: editingProperty?.growthRatePA ?? 0.07,
			weeklyRent: parseFloat(propForm.weeklyRent) || 0,
			vacancyRatePA: parseFloat(propForm.vacancyRatePA) || 0,
			councilRatesPA: (parseFloat(propForm.councilRatesPA) || 0) * 4,
			waterRatesPA: (parseFloat(propForm.waterRatesPA) || 0) * 4,
			insurancePA: parseFloat(propForm.insurancePA) || 0,
			strataPA: (parseFloat(propForm.strataPA) || 0) * 4,
			maintenanceBudgetPA: parseFloat(propForm.maintenanceBudgetPA) || 0,
			propertyManagementPct: parseFloat(propForm.propertyManagementPct) || 0,
			landTaxPA: parseFloat(propForm.landTaxPA) || 0,
		}

		let propertyId = editingProperty?.id
		if (propertyId) {
			updateProperty(propertyId, data)
		} else {
			addProperty(data)
			const newProps = useFinanceStore.getState().properties
			propertyId = newProps[newProps.length - 1]?.id
		}

		// Handle mortgage: create, update, or remove
		const existingMortgageId = editingProperty?.mortgageId || propForm.linkedMortgageId
		if (propForm.hasMortgage) {
			const mortBal = parseFloat(propForm.mortgageBalance) || 0
			const mortRate = (parseFloat(propForm.interestRate) || 0) / 100
			const mortRepayment = parseFloat(propForm.repayment) || 0
			const mortTerm = parseInt(propForm.loanTermYears) || 30

			if (existingMortgageId) {
				// Update existing mortgage
				updateLiability(existingMortgageId, {
					currentBalance: mortBal,
					interestRatePA: mortRate,
					minimumRepayment: mortRepayment,
					mortgageType: propForm.mortgageType,
					loanTermYears: mortTerm,
					linkedPropertyId: propertyId,
				})
				if (propertyId) updateProperty(propertyId, { mortgageId: existingMortgageId })
			} else {
				// Create new mortgage
				addLiability({
					name: `${propForm.name} Mortgage`,
					category: 'mortgage',
					currentBalance: mortBal,
					interestRatePA: mortRate,
					minimumRepayment: mortRepayment,
					repaymentFrequency: 'monthly',
					mortgageType: propForm.mortgageType,
					loanTermYears: mortTerm,
					linkedPropertyId: propertyId,
				})
				const newLiabs = useFinanceStore.getState().liabilities
				const newMort = newLiabs[newLiabs.length - 1]
				if (newMort && propertyId) updateProperty(propertyId, { mortgageId: newMort.id })
			}
		} else if (!propForm.hasMortgage && existingMortgageId) {
			// Remove mortgage if user unchecked it
			removeLiability(existingMortgageId)
			if (propertyId) updateProperty(propertyId, { mortgageId: undefined })
		}

		setShowAddProperty(false)
		setEditingProperty(null)
	}

	// Helper to format the mortgage summary
	const getMortgageSummary = (mortgageId: string) => {
		const m = liabilities.find(l => l.id === mortgageId)
		if (!m) return null
		const freq = m.repaymentFrequency === 'weekly' ? '/wk' : m.repaymentFrequency === 'fortnightly' ? '/fn' : '/mo'
		return {
			name: m.name,
			balance: m.currentBalance,
			rate: m.interestRatePA * 100,
			repayment: m.minimumRepayment,
			freq,
		}
	}

	// Delete asset with cleanup of linked liabilities and expenses
	const handleDeleteAsset = (assetId: string) => {
		const asset = assets.find(a => a.id === assetId) as any
		if (asset) {
			// Clean up linked liability (by ID and by name)
			if (asset.linkedLiabilityId) {
				removeLiability(asset.linkedLiabilityId)
			}
			// Fallback: find car loan liability by name
			const linkedLiab = liabilities.find(l =>
				l.category === 'car_loan' && l.name === `${asset.name} Car Loan`
			)
			if (linkedLiab && linkedLiab.id !== asset.linkedLiabilityId) {
				removeLiability(linkedLiab.id)
			}

			// Clean up linked expense (by ID and by name)
			if (asset.linkedExpenseId) {
				removeExpenseBudget(asset.linkedExpenseId)
			}
			// Fallback: find car loan repayment or lease expense by name
			const linkedExps = expenseBudgets.filter(e =>
				e.linkedAssetId === assetId ||
				e.label === `${asset.name} Car Loan Repayment` ||
				e.label === `${asset.name} Lease`
			)
			for (const exp of linkedExps) {
				if (exp.id !== asset.linkedExpenseId) {
					removeExpenseBudget(exp.id)
				}
			}
		}
		removeAsset(assetId)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className='flex items-center justify-end gap-2'>
				{showAssets && (
					<Button onClick={openAddAsset} size="sm">
						<Plus className="h-4 w-4 mr-1" /> Add Asset
					</Button>
				)}
				{showProperties && (
					<Button onClick={openAddProperty} size="sm">
						<Home className="h-4 w-4 mr-1" /> Add Property
					</Button>
				)}
			</div>

			{/* Summary Strip */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
				<div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#1e3a5f] to-[#3b82f6] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
					<div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
					<p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Total Assets</p>
					<p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-blue-400'>
						{formatCurrency(categoryFilter === 'property' ? totalProperties : categoryFilter ? filteredAssets.reduce((s, a) => s + a.currentValue, 0) : totalAssets + totalProperties)}
					</p>
				</div>
				<div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#5b21b6] to-[#8b5cf6] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
					<div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
					<p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Financial Assets</p>
					<p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-white'>{formatCurrency(totalAssets)}</p>
				</div>
				<div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#0f766e] to-[#14b8a6] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
					<div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
					<p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Properties</p>
					<p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-white'>{formatCurrency(totalProperties)}</p>
				</div>
				<div className="rounded-xl p-5 text-white bg-gradient-to-br from-[#065f46] to-[#10b981] dark:bg-none dark:bg-white/[0.06] dark:border dark:border-white/10 dark:backdrop-blur-sm relative overflow-hidden">
					<div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 dark:bg-white/5" />
					<p className='text-[13px] font-medium opacity-85 dark:text-slate-400 dark:opacity-100'>Total Equity</p>
					<p className='text-[26px] font-extrabold tabular-nums tracking-tight mt-1 dark:text-emerald-400'>{formatCurrency(totalEquity)}</p>
				</div>
			</div>

			{/* Financial Assets — grouped by category */}
			{showAssets && filteredAssets.length > 0 && (() => {
				const categoryOrder: AssetCategory[] = ['cash', 'stocks', 'super', 'vehicles', 'other']
				const grouped = categoryOrder
					.map(cat => ({
						category: cat,
						label: CATEGORY_LABELS[cat],
						icon: CATEGORY_ICONS[cat],
						items: filteredAssets.filter(a => a.category === cat),
						subtotal: filteredAssets.filter(a => a.category === cat).reduce((s, a) => s + a.currentValue, 0),
					}))
					.filter(g => g.items.length > 0)

				return grouped.map(group => {
				const colors = CATEGORY_COLORS[group.category] ?? CATEGORY_COLORS.other
				return (
					<div key={group.category} className={`rounded-xl bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none border-l-4 ${colors.border} overflow-hidden`}>
						<div className="flex items-center justify-between px-5 py-4">
							<div className="flex items-center gap-2.5">
								<span className="text-[22px]">{group.icon}</span>
								<span className="font-bold text-[15px] text-slate-900 dark:text-white">{group.label}</span>
								<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>{group.items.length}</span>
							</div>
							<span className={`font-extrabold text-lg tabular-nums ${colors.total} ${colors.darkTotal}`}>{formatCurrency(group.subtotal)}</span>
						</div>
						<div className="border-t border-slate-100 dark:border-white/[0.06]">
							{group.items.map(a => {
								const isOffset = a.category === 'cash' && (a as any).isOffset
								const offsetMortgage = isOffset && (a as any).linkedMortgageId
									? liabilities.find(l => l.id === (a as any).linkedMortgageId)
									: null
								return (
									<div key={a.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-white/[0.04] last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
										<div>
											<p className="font-medium text-slate-900 dark:text-slate-200">
												{a.name}
												{isOffset && (
													<Shield className="inline h-3.5 w-3.5 ml-1.5 text-blue-400" />
												)}
											</p>
											{isOffset && offsetMortgage && (
												<p className="text-xs text-blue-500 dark:text-blue-400">Offset on {offsetMortgage.name}</p>
											)}
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatCurrency(a.currentValue)}</span>
											<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAsset(a)}>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteAsset(a.id)}>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				)
			})
			})()}

			{/* Properties */}
			{showProperties && properties.length > 0 && (() => {
				const colors = CATEGORY_COLORS.property
				// Compute portfolio-level totals for the header
				const totalPropertyEquity = properties.reduce((sum, p) => {
					const m = findMortgage(p)
					return sum + p.currentValue - (m?.currentBalance ?? 0)
				}, 0)
				const totalCashflowPA = properties.reduce((sum, p) => {
					const inv = p.type === 'investment'
					const m = findMortgage(p)
					const ob = m ? getOffsetBalance(m.id) : 0
					const r = calculatePropertyPnL(p, m, ob)
					if (!r) return sum
					const cf = inv ? r.netCashflowPA : -(r.totalExpensesPA + (r.mortgageRepaymentPA > 0 ? r.mortgageRepaymentPA : r.interestWithoutOffsetPA))
					return sum + cf
				}, 0)
				const totalCashflowMo = totalCashflowPA / 12
				return (
					<div className={`rounded-xl bg-white dark:bg-white/[0.04] shadow-sm dark:shadow-none border-l-4 ${colors.border} overflow-hidden`}>
						<div className="flex items-center justify-between px-5 py-4">
							<div className="flex items-center gap-2.5">
								<span className="text-[22px]">🏠</span>
								<div>
									<div className="flex items-center gap-2">
										<span className="font-bold text-[15px] text-slate-900 dark:text-white">Properties</span>
										<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>{properties.length}</span>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										Total Equity: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(totalPropertyEquity)}</span>
									</p>
								</div>
							</div>
							<div className="text-right">
								<span className={`font-extrabold text-lg tabular-nums ${colors.total} ${colors.darkTotal}`}>{formatCurrency(totalProperties)}</span>
								<p className="text-xs tabular-nums mt-0.5">
									<span className="text-muted-foreground">Cashflow </span>
									<span className={totalCashflowMo >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
										{fmtCashflow(totalCashflowMo)}/mo
									</span>
									<span className="text-muted-foreground"> · </span>
									<span className={totalCashflowPA >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
										{fmtCashflow(totalCashflowPA)}/yr
									</span>
								</p>
							</div>
						</div>
						<div className="border-t border-slate-100 dark:border-white/[0.06]">
							{properties.map(p => {
								const isInvestment = p.type === 'investment'
								const isExpanded = expandedPnL.has(p.id)
								const mortgage = findMortgage(p)
								const offsetBalance = mortgage ? getOffsetBalance(mortgage.id) : 0
								const equity = p.currentValue - (mortgage?.currentBalance ?? 0)
								const pnl = calculatePropertyPnL(p, mortgage, offsetBalance)
								const cashflowPA = pnl ? (isInvestment ? pnl.netCashflowPA : -(pnl.totalExpensesPA + (pnl.mortgageRepaymentPA > 0 ? pnl.mortgageRepaymentPA : pnl.interestWithoutOffsetPA))) : 0
								const monthlyCost = cashflowPA / 12
								const yearlyCost = cashflowPA
								return (
									<div key={p.id} className="px-5 py-3 border-b border-slate-50 dark:border-white/[0.04] last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="text-xl">🏠</span>
												<div>
													<p className="font-medium text-slate-900 dark:text-slate-200">{p.name}</p>
													<p className="text-xs text-muted-foreground">
														{isInvestment ? 'Investment' : 'Primary Residence'}
														{(p.weeklyRent ?? 0) > 0 && ` · ${p.weeklyRent}/wk rent`}
														{mortgage && <> · <span className="text-emerald-600 dark:text-emerald-400 font-medium">Equity: {formatCurrency(equity)}</span></>}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												{pnl && (
													<span className="text-xs tabular-nums mr-3">
														<span className="text-muted-foreground">Cashflow </span>
														<span className={monthlyCost >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
															{fmtCashflow(monthlyCost)}/mo
														</span>
														<span className="text-muted-foreground"> · </span>
														<span className={yearlyCost >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
															{fmtCashflow(yearlyCost)}/yr
														</span>
													</span>
												)}
												<span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatCurrency(p.currentValue)}</span>
												<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePnL(p.id)} title={isInvestment ? "P&L Breakdown" : "Holding Costs"}>
													{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
												</Button>
												<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProperty(p)}>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
																if (p.mortgageId) {
																	// Remove linked offset accounts' mortgage reference
																	assets.forEach(a => {
																		if ((a as any).linkedMortgageId === p.mortgageId) {
																			updateAsset(a.id, { linkedMortgageId: '' } as any)
																		}
																	})
																	// Remove the linked mortgage
																	removeLiability(p.mortgageId)
																}
																removeProperty(p.id)
															}}>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
										{isExpanded && (
											<div className="mt-3 ml-9">
												<PropertyPnL property={p} mortgage={mortgage} offsetBalance={offsetBalance} grossSalary={grossSalary} />
											</div>
										)}
									</div>
								)
							})}
						</div>
					</div>
				)
			})()}

			{/* Empty states */}
			{showAssets && filteredAssets.length === 0 && (
				<div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 py-10 text-center">
					<p className="text-muted-foreground">No assets yet</p>
					<Button onClick={openAddAsset} size="sm" className="mt-3">
						<Plus className="h-4 w-4 mr-1" /> Add Your First Asset
					</Button>
				</div>
			)}
			{showProperties && properties.length === 0 && (
				<div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 py-10 text-center">
					<p className="text-muted-foreground">No properties yet</p>
					<Button onClick={openAddProperty} size="sm" className="mt-3">
						<Home className="h-4 w-4 mr-1" /> Add Your First Property
					</Button>
				</div>
			)}

			{/* Add/Edit Asset Dialog */}
			<Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Name</Label>
							<Input value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Savings Account" />
						</div>
						<div>
							<Label>Category</Label>
							<Select value={assetForm.category} onValueChange={v => setAssetForm(f => ({ ...f, category: v as AssetCategory, isOffset: v !== 'cash' ? false : f.isOffset, linkedMortgageId: v !== 'cash' ? '' : f.linkedMortgageId }))}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									{Object.entries(CATEGORY_LABELS).map(([k, v]) => (
										<SelectItem key={k} value={k}>{CATEGORY_ICONS[k as AssetCategory]} {v}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Current Value ($)</Label>
							<Input type="number" value={assetForm.value} onChange={e => setAssetForm(f => ({ ...f, value: e.target.value }))} />
						</div>

						{/* Cash Type Section — only for cash assets */}
						{assetForm.category === 'cash' && (
							<div className="space-y-3">
								<div>
									<Label className="text-sm font-medium">Account Type</Label>
									<div className="flex gap-2 mt-1.5">
										{(['cash', 'bank'] as const).map(t => (
											<button
												key={t}
												type="button"
												onClick={() => setAssetForm(f => ({ ...f, cashType: t, interestRate: t === 'bank' ? '' : '0' }))}
												className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
													assetForm.cashType === t
														? 'border-primary bg-primary/10 text-primary'
														: 'border-input hover:border-primary/30 text-muted-foreground'
												}`}
											>
												{t === 'cash' ? '💵 Cash' : '🏦 Bank Account'}
											</button>
										))}
									</div>
								</div>
								{assetForm.cashType === 'bank' && (
									<>
										<div>
											<Label>Bank Name</Label>
											<Input
												value={assetForm.bankName}
												onChange={e => setAssetForm(f => ({ ...f, bankName: e.target.value }))}
												placeholder="e.g. Commonwealth Bank"
											/>
										</div>
										<div>
											<Label>Interest Rate (% p.a.)</Label>
											<Input
												type="number" step="0.01" min="0" max="20"
												value={assetForm.interestRate}
												onChange={e => setAssetForm(f => ({ ...f, interestRate: e.target.value }))}
										placeholder="e.g. 5.0"
											/>
											<p className="text-xs text-muted-foreground mt-1">
												Interest will be included in your income calculations
											</p>
										</div>
									</>
								)}
								{assetForm.cashType === 'cash' && (
									<p className="text-xs text-muted-foreground">
										No interest is calculated for physical cash holdings.
									</p>
								)}
							</div>
						)}

						{/* Offset Account Section — only for cash assets */}
						{assetForm.category === 'cash' && (
							<div className="border-t pt-4">
								<div className="flex items-center justify-between mb-3">
									<div>
										<h4 className="font-semibold text-sm">Offset Account</h4>
										<p className="text-xs text-muted-foreground">Reduces interest on a linked mortgage</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={assetForm.isOffset}
										onClick={() => setAssetForm(f => ({ ...f, isOffset: !f.isOffset, linkedMortgageId: !f.isOffset ? f.linkedMortgageId : '' }))}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${assetForm.isOffset ? 'bg-blue-500' : 'bg-muted'}`}
									>
										<span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${assetForm.isOffset ? 'translate-x-5' : 'translate-x-0'}`} />
									</button>
								</div>

								{assetForm.isOffset && (
									<div className="space-y-3">
										{mortgageLiabilities.length > 0 ? (
											<>
												<Select
													value={assetForm.linkedMortgageId || '_none'}
													onValueChange={v => setAssetForm(f => ({ ...f, linkedMortgageId: v === '_none' ? '' : v }))}
												>
													<SelectTrigger><SelectValue placeholder="Select mortgage to offset..." /></SelectTrigger>
													<SelectContent>
														<SelectItem value="_none">Select a mortgage...</SelectItem>
														{mortgageLiabilities.map(m => (
															<SelectItem key={m.id} value={m.id}>
																{m.name} — {formatCurrency(m.currentBalance)} @ {(m.interestRatePA * 100).toFixed(2)}%
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												{assetForm.linkedMortgageId && (() => {
													const m = liabilities.find(l => l.id === assetForm.linkedMortgageId)
													if (!m) return null
													const offsetAmount = parseFloat(assetForm.value) || 0
													const effectiveBalance = Math.max(0, m.currentBalance - offsetAmount)
													const interestWithout = m.currentBalance * m.interestRatePA
													const interestWith = effectiveBalance * m.interestRatePA
													const annualSaving = interestWithout - interestWith
													return (
														<div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
															<div className="flex justify-between">
																<span className="text-muted-foreground">Mortgage Balance</span>
																<span className="font-medium">{formatCurrency(m.currentBalance)}</span>
															</div>
															<div className="flex justify-between">
																<span className="text-muted-foreground">Less Offset</span>
																<span className="font-medium text-blue-400">-{formatCurrency(offsetAmount)}</span>
															</div>
															<Separator className="my-2" />
															<div className="flex justify-between">
																<span className="text-muted-foreground">Effective Balance</span>
																<span className="font-semibold">{formatCurrency(effectiveBalance)}</span>
															</div>
															<div className="flex justify-between">
																<span className="text-muted-foreground">Interest Saving</span>
																<span className="font-semibold text-emerald-400">{formatCurrency(annualSaving)}/yr</span>
															</div>
														</div>
													)
												})()}
											</>
										) : (
											<p className="text-sm text-muted-foreground">
												No mortgages found. Add one in Liabilities first.
											</p>
										)}
									</div>
								)}
							</div>
						)}

						{/* Vehicle Financing Section — only for vehicle assets */}
						{assetForm.category === 'vehicles' && (
							<div className="border-t pt-4">
								<div className="mb-3">
									<h4 className="font-semibold text-sm">Vehicle Financing</h4>
									<p className="text-xs text-muted-foreground">How is this vehicle financed?</p>
								</div>

								{/* Financing type selector — radio-style buttons */}
								<div className="flex gap-2 mb-4">
									{(['owned', 'car_loan', 'lease'] as const).map(option => (
										<button
											key={option}
											type="button"
											onClick={() => setAssetForm(f => ({ ...f, vehicleFinancing: option }))}
											className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
												assetForm.vehicleFinancing === option
													? 'bg-blue-500 border-blue-500 text-white'
													: 'border-input bg-background text-foreground hover:bg-muted'
											}`}
										>
											{option === 'owned' ? 'Owned' : option === 'car_loan' ? 'Car Loan' : 'Lease'}
										</button>
									))}
								</div>

								{/* Car Loan fields */}
								{assetForm.vehicleFinancing === 'car_loan' && (() => {
									const bal = parseFloat(assetForm.loanBalance) || 0
									const rate = (parseFloat(assetForm.loanRate) || 0) / 100
									const term = parseFloat(assetForm.loanTerm) || 5
									const autoRepayment = calcMonthlyRepayment(bal, rate, term)
									return (
										<div className="space-y-3">
											<p className="text-xs text-muted-foreground">
												A car loan liability and monthly expense will be created automatically
											</p>
											<div>
												<Label>Loan Balance ($)</Label>
												<Input
													type="number"
													value={assetForm.loanBalance}
													onChange={e => setAssetForm(f => ({ ...f, loanBalance: e.target.value }))}
													placeholder="e.g. 25000"
												/>
											</div>
											<div>
												<Label>Interest Rate (% p.a.)</Label>
												<Input
													type="number"
													step="0.01"
													value={assetForm.loanRate}
													onChange={e => setAssetForm(f => ({ ...f, loanRate: e.target.value }))}
													placeholder="e.g. 6.5"
												/>
											</div>
											<div>
												<Label>Loan Term (years)</Label>
												<Input
													type="number"
													step="1"
													min="1"
													max="10"
													value={assetForm.loanTerm}
													onChange={e => setAssetForm(f => ({ ...f, loanTerm: e.target.value }))}
													placeholder="e.g. 5"
												/>
											</div>
											{autoRepayment > 0 && (
												<div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Calculated Monthly Repayment</span>
														<span className="font-semibold text-blue-400">{formatCurrency(autoRepayment)}</span>
													</div>
													<p className="text-xs text-muted-foreground">
														Based on {formatCurrency(bal)} over {term} years at {(rate * 100).toFixed(1)}% p.a.
													</p>
												</div>
											)}
										</div>
									)
								})()}

								{/* Lease fields */}
								{assetForm.vehicleFinancing === 'lease' && (
									<div className="space-y-3">
										<div>
											<Label>Monthly Lease Payment ($)</Label>
											<Input
												type="number"
												value={assetForm.leasePayment}
												onChange={e => setAssetForm(f => ({ ...f, leasePayment: e.target.value }))}
												placeholder="e.g. 650"
											/>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Stocks Dividends Section — only for stock assets */}
						{assetForm.category === 'stocks' && (
							<div className="border-t pt-4">
								<div className="flex items-center justify-between mb-3">
									<div>
										<h4 className="font-semibold text-sm">Dividends</h4>
										<p className="text-xs text-muted-foreground">Does this investment pay dividends?</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={assetForm.paysDividends}
										onClick={() => setAssetForm(f => ({ ...f, paysDividends: !f.paysDividends }))}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${assetForm.paysDividends ? 'bg-blue-500' : 'bg-muted'}`}
									>
										<span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${assetForm.paysDividends ? 'translate-x-5' : 'translate-x-0'}`} />
									</button>
								</div>
								{assetForm.paysDividends && (
									<div className="space-y-3">
										<div>
											<Label>Estimated Dividend Yield (% p.a.)</Label>
											<Input
												type="number"
												step="0.1"
												min="0"
												max="100"
												value={assetForm.dividendYield}
												onChange={e => setAssetForm(f => ({ ...f, dividendYield: e.target.value }))}
												placeholder="e.g. 4.0"
											/>
										</div>
										{parseFloat(assetForm.dividendYield) > 0 && parseFloat(assetForm.value) > 0 && (
											<div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
												<div className="flex justify-between">
													<span className="text-muted-foreground">Estimated Annual Dividends</span>
													<span className="font-semibold text-violet-400">{formatCurrency((parseFloat(assetForm.value) || 0) * (parseFloat(assetForm.dividendYield) || 0) / 100)}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">Monthly Income</span>
													<span className="font-semibold text-violet-400">{formatCurrency((parseFloat(assetForm.value) || 0) * (parseFloat(assetForm.dividendYield) || 0) / 100 / 12)}</span>
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													This will appear as dividend income on your Income page
												</p>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Stocks Loan Section — only for stock assets */}
						{assetForm.category === 'stocks' && (
							<div className="border-t pt-4">
								<div className="flex items-center justify-between mb-3">
									<div>
										<h4 className="font-semibold text-sm">Loan</h4>
										<p className="text-xs text-muted-foreground">Add a loan against this stock investment</p>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={assetForm.hasMarginLoan}
										onClick={() => setAssetForm(f => ({ ...f, hasMarginLoan: !f.hasMarginLoan }))}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${assetForm.hasMarginLoan ? 'bg-blue-500' : 'bg-muted'}`}
									>
										<span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${assetForm.hasMarginLoan ? 'translate-x-5' : 'translate-x-0'}`} />
									</button>
								</div>
								{assetForm.hasMarginLoan && (() => {
									const bal = parseFloat(assetForm.marginLoanBalance) || 0
									const rate = (parseFloat(assetForm.marginLoanRate) || 0) / 100
									const term = parseFloat(assetForm.marginLoanTerm) || 5
									const autoRepayment = calcMonthlyRepayment(bal, rate, term)
									return (
										<div className="space-y-3">
											<p className="text-xs text-muted-foreground">
												A loan liability will be created automatically
											</p>
											<div>
												<Label>Loan Balance ($)</Label>
												<Input
													type="number"
													value={assetForm.marginLoanBalance}
													onChange={e => setAssetForm(f => ({ ...f, marginLoanBalance: e.target.value }))}
													placeholder="e.g. 50000"
												/>
											</div>
											<div>
												<Label>Interest Rate (% p.a.)</Label>
												<Input
													type="number"
													step="0.01"
													value={assetForm.marginLoanRate}
													onChange={e => setAssetForm(f => ({ ...f, marginLoanRate: e.target.value }))}
													placeholder="e.g. 7.5"
												/>
											</div>
											<div>
												<Label>Loan Term (years)</Label>
												<Input
													type="number"
													step="1"
													min="1"
													max="30"
													value={assetForm.marginLoanTerm}
													onChange={e => setAssetForm(f => ({ ...f, marginLoanTerm: e.target.value }))}
													placeholder="e.g. 5"
												/>
											</div>
											{autoRepayment > 0 && (
												<div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
													<div className="flex justify-between">
														<span className="text-muted-foreground">Calculated Monthly Repayment</span>
														<span className="font-semibold text-blue-400">{formatCurrency(autoRepayment)}</span>
													</div>
													<p className="text-xs text-muted-foreground">
														Based on {formatCurrency(bal)} over {term} years at {(rate * 100).toFixed(1)}% p.a.
													</p>
												</div>
											)}
										</div>
									)
								})()}
							</div>
						)}

						<div className="flex gap-2 justify-end">
							<Button variant="outline" onClick={() => setShowAddAsset(false)}>Cancel</Button>
							<Button onClick={saveAsset} disabled={!assetForm.name || !assetForm.value}>
								{editingAsset ? 'Save Changes' : 'Add Asset'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Add/Edit Property Dialog */}
			<Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingProperty?.id ? 'Edit Property' : 'Add Property'}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>Property Name</Label>
							<Input value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 123 Main Street" />
						</div>
						<div>
							<Label>Type</Label>
							<Select value={propForm.type} onValueChange={v => setPropForm(f => ({ ...f, type: v as any }))}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="primary_residence">Primary Residence</SelectItem>
									<SelectItem value="investment">Investment Property</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Estimated Value ($)</Label>
							<Input type="number" value={propForm.currentValue} onChange={e => setPropForm(f => ({ ...f, currentValue: e.target.value }))} />
						</div>
						{propForm.type === 'investment' && (
							<>
								<div>
									<Label>Weekly Rent ($)</Label>
									<Input type="number" value={propForm.weeklyRent} onChange={e => setPropForm(f => ({ ...f, weeklyRent: e.target.value }))} />
								</div>
								<div>
									<Label>Vacancy Rate (%)</Label>
									<Input type="number" step="0.1" value={propForm.vacancyRatePA} onChange={e => setPropForm(f => ({ ...f, vacancyRatePA: e.target.value }))} placeholder="e.g. 3 for 3%" />
								</div>
							</>
						)}

						{/* Running Costs */}
						<div className="border-t pt-4">
							<h4 className="font-semibold text-sm mb-3">Running Costs</h4>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs">Council Rates ($/qtr)</Label>
									<Input type="number" value={propForm.councilRatesPA} onChange={e => setPropForm(f => ({ ...f, councilRatesPA: e.target.value }))} />
								</div>
								<div>
									<Label className="text-xs">Water Rates ($/qtr)</Label>
									<Input type="number" value={propForm.waterRatesPA} onChange={e => setPropForm(f => ({ ...f, waterRatesPA: e.target.value }))} />
								</div>
								<div>
									<Label className="text-xs">Strata / Body Corp ($/qtr)</Label>
									<Input type="number" value={propForm.strataPA} onChange={e => setPropForm(f => ({ ...f, strataPA: e.target.value }))} />
								</div>
								<div>
									<Label className="text-xs">Building Insurance ($/yr)</Label>
									<Input type="number" value={propForm.insurancePA} onChange={e => setPropForm(f => ({ ...f, insurancePA: e.target.value }))} />
								</div>
								<div>
									<Label className="text-xs">Maintenance ($/yr)</Label>
									<Input type="number" value={propForm.maintenanceBudgetPA} onChange={e => setPropForm(f => ({ ...f, maintenanceBudgetPA: e.target.value }))} />
								</div>
								{propForm.type === 'investment' && (
									<>
										<div>
											<Label className="text-xs">Property Mgmt (%)</Label>
											<Input type="number" step="0.1" value={propForm.propertyManagementPct} onChange={e => setPropForm(f => ({ ...f, propertyManagementPct: e.target.value }))} />
										</div>
										<div>
											<Label className="text-xs">Land Tax ($/yr)</Label>
											<Input type="number" value={propForm.landTaxPA} onChange={e => setPropForm(f => ({ ...f, landTaxPA: e.target.value }))} />
										</div>
									</>
								)}
							</div>
						</div>

						{/* Mortgage Section */}
						<div className="border-t pt-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={propForm.hasMortgage}
									onChange={e => setPropForm(f => ({ ...f, hasMortgage: e.target.checked }))}
									className="rounded"
								/>
								<span className="text-sm font-medium">This property has a mortgage</span>
							</label>

							{propForm.hasMortgage && (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
									<div className="space-y-1.5">
										<Label className="text-xs">Mortgage Balance</Label>
										<Input
											type="number"
											value={propForm.mortgageBalance}
											onChange={e => updateMortgageField({ mortgageBalance: e.target.value })}
											placeholder="0"
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">Mortgage Type</Label>
										<Select value={propForm.mortgageType} onValueChange={(v: MortgageType) => updateMortgageField({ mortgageType: v })}>
											<SelectTrigger><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="principal_and_interest">Principal & Interest</SelectItem>
												<SelectItem value="interest_only">Interest Only</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">Loan Term (years)</Label>
										<Input
											type="number"
											value={propForm.loanTermYears}
											onChange={e => updateMortgageField({ loanTermYears: e.target.value })}
											placeholder="30"
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">Interest Rate (%)</Label>
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
									<div className="space-y-1.5 sm:col-span-2">
										<Label className="text-xs">
											Min. Monthly Repayment
											{!propForm.repaymentOverridden && propForm.repayment ? ' (auto-calculated)' : ''}
										</Label>
										<Input
											type="number"
											value={propForm.repayment}
											onChange={e => setPropForm(f => ({ ...f, repayment: e.target.value, repaymentOverridden: true }))}
											placeholder="0"
										/>
										{propForm.repaymentOverridden && propForm.mortgageBalance && propForm.interestRate && (
											<button
												className="text-xs text-primary hover:underline"
												onClick={() => {
													const calc = autoCalcRepayment(propForm.mortgageBalance, propForm.interestRate, propForm.mortgageType, propForm.loanTermYears)
													setPropForm(f => ({ ...f, repayment: calc, repaymentOverridden: false }))
												}}
											>
												Reset to auto-calculated
											</button>
										)}
									</div>
								</div>
							)}
						</div>

						<div className="flex gap-2 justify-end pt-2">
							<Button variant="outline" onClick={() => setShowAddProperty(false)}>Cancel</Button>
							<Button onClick={saveProperty} disabled={!propForm.name || !propForm.currentValue}>
								{editingProperty?.id ? 'Save Changes' : 'Add Property'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
