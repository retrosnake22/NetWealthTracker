import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import type { FinanceState } from '@/stores/useFinanceStore'
import type { Asset, AssetCategory, CashAsset, StockAsset } from '@/types/models'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
	cash: 'Cash & Savings',
	property: 'Property',
	stocks: 'Shares / Stocks',
	super: 'Superannuation',
	vehicles: 'Vehicles',
	other: 'Other',
}

interface AssetDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	editAsset?: Asset | null
}

export function AssetDialog({ open, onOpenChange, editAsset }: AssetDialogProps) {
	const store = useFinanceStore() as FinanceState
	const { addAsset, updateAsset, removeAsset, liabilities } = store

	const [form, setForm] = useState({
		name: '',
		value: '',
		category: 'cash' as AssetCategory,
		cashType: 'bank' as 'cash' | 'bank',
		bankName: '',
		interestRate: '',
		isOffset: false,
		linkedMortgageId: '',
		paysDividends: false,
		dividendYield: '4.00',
	})
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const mortgageLiabilities = useMemo(() =>
		liabilities.filter(l => l.category === 'mortgage' || l.category === 'home_loan'),
		[liabilities]
	)

	useEffect(() => {
		if (open && editAsset) {
			const cashAsset = editAsset as CashAsset
			const stockAsset = editAsset as StockAsset
			setForm({
				name: editAsset.name,
				value: editAsset.currentValue.toString(),
				category: editAsset.category,
				cashType: cashAsset.cashType ?? 'bank',
				bankName: cashAsset.bankName ?? '',
				interestRate: cashAsset.interestRatePA != null ? (cashAsset.interestRatePA * 100).toString() : '',
				isOffset: cashAsset.isOffset ?? false,
				linkedMortgageId: cashAsset.linkedMortgageId ?? '',
				paysDividends: stockAsset.paysDividends ?? false,
				dividendYield: stockAsset.dividendYieldPA != null ? (stockAsset.dividendYieldPA * 100).toFixed(2) : '4.00',
			})
		} else if (open) {
			setForm({
				name: '', value: '', category: 'cash',
				cashType: 'bank', bankName: '', interestRate: '',
				isOffset: false, linkedMortgageId: '',
				paysDividends: false, dividendYield: '4.00',
			})
		}
		setShowDeleteConfirm(false)
	}, [open, editAsset])

	const handleSave = () => {
		const value = parseFloat(form.value) || 0
		if (!form.name.trim() || value <= 0) return

		const base: Partial<Asset> = {
			name: form.name.trim(),
			currentValue: value,
			category: form.category,
			growthRatePA: 0,
		}

		if (form.category === 'cash') {
			Object.assign(base, {
				cashType: form.cashType,
				bankName: form.cashType === 'bank' ? form.bankName : undefined,
				interestRatePA: form.cashType === 'bank' ? (parseFloat(form.interestRate) || 0) / 100 : 0,
				isOffset: form.isOffset,
				linkedMortgageId: form.isOffset ? form.linkedMortgageId : undefined,
			})
		}

		if (form.category === 'stocks') {
			Object.assign(base, {
				paysDividends: form.paysDividends,
				dividendYieldPA: form.paysDividends ? (parseFloat(form.dividendYield) || 0) / 100 : undefined,
			})
		}

		if (editAsset) {
			updateAsset(editAsset.id, base)
		} else {
			addAsset(base as Asset)
		}
		onOpenChange(false)
	}

	const handleDelete = () => {
		if (editAsset) {
			removeAsset(editAsset.id)
			onOpenChange(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{editAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<Label>Name</Label>
						<Input
							placeholder="e.g. Savings Account"
							value={form.name}
							onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
						/>
					</div>

					<div>
						<Label>Category</Label>
						<Select
							value={form.category}
							onValueChange={(v: AssetCategory) => setForm(f => ({ ...f, category: v }))}
						>
							<SelectTrigger><SelectValue /></SelectTrigger>
							<SelectContent>
								{(Object.entries(CATEGORY_LABELS) as [AssetCategory, string][])
									.filter(([k]) => k !== 'property')
									.map(([k, v]) => (
										<SelectItem key={k} value={k}>{v}</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Current Value ($)</Label>
						<Input
							type="number"
							min="0"
							placeholder="0"
							value={form.value}
							onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
						/>
					</div>

					{/* Cash-specific fields */}
					{form.category === 'cash' && (
						<>
							<div>
								<Label>Cash Type</Label>
								<Select
									value={form.cashType}
									onValueChange={(v: 'cash' | 'bank') => setForm(f => ({ ...f, cashType: v }))}
								>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="cash">Cash (no interest)</SelectItem>
										<SelectItem value="bank">Bank Account (interest bearing)</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{form.cashType === 'bank' && (
								<>
									<div>
										<Label>Bank Name</Label>
										<Input
											placeholder="e.g. Commonwealth Bank"
											value={form.bankName}
											onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
										/>
									</div>
									<div>
										<Label>Interest Rate (% p.a.)</Label>
										<Input
											type="number"
											step="0.01"
											placeholder="3.00"
											value={form.interestRate}
											onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
										/>
									</div>
								</>
							)}

							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="isOffset"
									checked={form.isOffset}
									onChange={e => setForm(f => ({ ...f, isOffset: e.target.checked }))}
									className="rounded border-gray-300"
								/>
								<Label htmlFor="isOffset">This is a mortgage offset account</Label>
							</div>

							{form.isOffset && mortgageLiabilities.length > 0 && (
								<div>
									<Label>Linked Mortgage</Label>
									<Select
										value={form.linkedMortgageId}
										onValueChange={v => setForm(f => ({ ...f, linkedMortgageId: v }))}
									>
										<SelectTrigger><SelectValue placeholder="Select mortgage" /></SelectTrigger>
										<SelectContent>
											{mortgageLiabilities.map(m => (
												<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</>
					)}

					{/* Stocks-specific fields */}
					{form.category === 'stocks' && (
						<>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="paysDividends"
									checked={form.paysDividends}
									onChange={e => setForm(f => ({ ...f, paysDividends: e.target.checked }))}
									className="rounded border-gray-300"
								/>
								<Label htmlFor="paysDividends">Pays dividends</Label>
							</div>
							{form.paysDividends && (
								<div>
									<Label>Dividend Yield (% p.a.)</Label>
									<Input
										type="number"
										step="0.01"
										placeholder="4.00"
										value={form.dividendYield}
										onChange={e => setForm(f => ({ ...f, dividendYield: e.target.value }))}
									/>
								</div>
							)}
						</>
					)}

					{/* Delete confirmation */}
					{editAsset && showDeleteConfirm && (
						<div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
							<p className="text-sm text-red-700 dark:text-red-300 mb-2">Delete "{editAsset.name}"? This cannot be undone.</p>
							<div className="flex gap-2">
								<Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
								<Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
							</div>
						</div>
					)}

					<div className="flex justify-between pt-2">
						{editAsset ? (
							<Button variant="ghost" size="sm" className="text-red-600" onClick={() => setShowDeleteConfirm(true)}>
								<Trash2 className="w-4 h-4 mr-1" /> Delete
							</Button>
						) : <div />}
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
							<Button onClick={handleSave}>{editAsset ? 'Save' : 'Add'}</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
