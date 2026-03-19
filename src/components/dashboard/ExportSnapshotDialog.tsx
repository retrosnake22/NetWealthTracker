import { FileSpreadsheet, FileText, Download, Share2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useFinanceStore } from '@/stores/useFinanceStore'
import {
  calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities,
  calculateDebtToAssetRatio, calculateDashboardMetrics,
} from '@/lib/calculations'
import { downloadCsv, downloadPdf, type SnapshotData } from '@/lib/exportSnapshot'

interface ExportSnapshotDialogProps {
  open: boolean
  onClose: () => void
}

export function ExportSnapshotDialog({ open, onClose }: ExportSnapshotDialogProps) {
  const { assets, properties, liabilities, incomes, expenseBudgets, expenseActuals, userProfile } = useFinanceStore()

  function getSnapshotData(): SnapshotData {
    const netWealthIncSuper = calculateNetWealth(assets, properties, liabilities)
    const superTotal = assets.filter(a => a.category === 'super').reduce((s, a) => s + a.currentValue, 0)
    const netWealth = netWealthIncSuper - superTotal
    const totalAssets = calculateTotalAssets(assets, properties)
    const totalLiabilities = calculateTotalLiabilities(liabilities)
    const debtRatio = calculateDebtToAssetRatio(assets, properties, liabilities)
    const metrics = calculateDashboardMetrics(
      incomes, expenseBudgets, properties, liabilities, assets, expenseActuals,
      userProfile?.budgetMode, userProfile?.estimatedMonthlyExpenses, userProfile?.expenseCalcSource
    )

    return {
      netWealth, netWealthIncSuper, totalAssets, totalLiabilities,
      metrics, debtRatio,
      assets, properties, liabilities, incomes, expenseBudgets,
    }
  }

  function handleCsvExport() {
    downloadCsv(getSnapshotData())
    onClose()
  }

  function handlePdfExport() {
    downloadPdf(getSnapshotData())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            Export Financial Snapshot
          </DialogTitle>
          <DialogDescription>
            Download your current financial position. Useful for sharing with a financial advisor or mortgage broker.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* CSV Option */}
          <button
            onClick={handleCsvExport}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 dark:border-white/10 p-4 text-left transition-all hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">CSV Spreadsheet</span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">.csv</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Open in Excel, Google Sheets, or Numbers. All data in tabular format.
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 mt-1 transition-colors" />
          </button>

          {/* PDF Option */}
          <button
            onClick={handlePdfExport}
            className="group flex items-start gap-4 rounded-xl border border-slate-200 dark:border-white/10 p-4 text-left transition-all hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">PDF Report</span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">.pdf</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Professional formatted report. Opens print dialog — choose "Save as PDF".
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 mt-1 transition-colors" />
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
