import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, RotateCcw, Lightbulb } from 'lucide-react'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const EXAMPLE_QUESTIONS = [
  'What if I sold one of my investment properties and used the equity to pay down my mortgage?',
  'What if I increased my salary sacrifice to super by $500/month?',
  'What if I refinanced all my loans to 5.5% interest?',
  'What if I reduced my living expenses by 20%?',
  'What if I bought another investment property worth $800K with 20% deposit?',
  'How long until I reach financial independence at my current rate?',
]

function buildFinancialContext(state: ReturnType<typeof useFinanceStore.getState>): string {
  const { assets, properties, liabilities, incomes, expenseBudgets, expenseActuals, projectionSettings, userProfile } = state

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalPropertyValue = properties.reduce((s, p) => s + p.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.currentBalance, 0)
  const netWealth = totalAssets + totalPropertyValue - totalLiabilities

  const sections: string[] = []

  // Summary
  sections.push(`=== FINANCIAL SUMMARY ===
Net Wealth: ${formatCurrency(netWealth)}
Total Assets (excl. property): ${formatCurrency(totalAssets)}
Total Property Value: ${formatCurrency(totalPropertyValue)}
Total Liabilities: ${formatCurrency(totalLiabilities)}
Profile Type: ${userProfile.profileType}
Budget Mode: ${userProfile.budgetMode}`)

  // Assets
  if (assets.length > 0) {
    sections.push(`\n=== ASSETS ===\n${assets.map(a =>
      `- ${a.name} (${a.category}): ${formatCurrency(a.currentValue)} | Growth: ${(a.growthRatePA * 100).toFixed(1)}%`
    ).join('\n')}`)
  }

  // Properties
  if (properties.length > 0) {
    sections.push(`\n=== PROPERTIES ===\n${properties.map(p => {
      const lines = [
        `- ${p.name} (${p.type}): ${formatCurrency(p.currentValue)} | Growth: ${(p.growthRatePA * 100).toFixed(1)}%`,
      ]
      if (p.weeklyRent) lines.push(`  Weekly Rent: ${formatCurrency(p.weeklyRent)} | Vacancy: ${p.vacancyRatePA ?? 0}%`)
      if (p.councilRatesPA) lines.push(`  Council Rates: ${formatCurrency(p.councilRatesPA)}/yr`)
      if (p.insurancePA) lines.push(`  Insurance: ${formatCurrency(p.insurancePA)}/yr`)
      if (p.strataPA) lines.push(`  Strata: ${formatCurrency(p.strataPA)}/yr`)
      if (p.landTaxPA) lines.push(`  Land Tax: ${formatCurrency(p.landTaxPA)}/yr`)
      if (p.propertyManagementPct) lines.push(`  Mgmt Fee: ${p.propertyManagementPct}%`)
      if (p.mortgageId) {
        const mortgage = liabilities.find(l => l.id === p.mortgageId)
        if (mortgage) lines.push(`  Linked Mortgage: ${mortgage.name} — ${formatCurrency(mortgage.currentBalance)} @ ${(mortgage.interestRatePA * 100).toFixed(2)}%`)
      }
      return lines.join('\n')
    }).join('\n')}`)
  }

  // Liabilities
  if (liabilities.length > 0) {
    sections.push(`\n=== LIABILITIES ===\n${liabilities.map(l =>
      `- ${l.name} (${l.category}): ${formatCurrency(l.currentBalance)} @ ${(l.interestRatePA * 100).toFixed(2)}% | Repayment: ${formatCurrency(l.minimumRepayment)}/${l.repaymentFrequency}${l.mortgageType ? ` | Type: ${l.mortgageType}` : ''}${l.isInvestmentPurpose ? ' | Investment purpose (deductible)' : ''}`
    ).join('\n')}`)
  }

  // Income
  if (incomes.length > 0) {
    const totalMonthlyIncome = incomes.filter(i => i.isActive).reduce((s, i) => s + i.monthlyAmount, 0)
    sections.push(`\n=== INCOME (Total: ${formatCurrency(totalMonthlyIncome)}/month) ===\n${incomes.map(i =>
      `- ${i.name} (${i.category}): ${formatCurrency(i.monthlyAmount)}/month${i.grossAnnualSalary ? ` | Gross: ${formatCurrency(i.grossAnnualSalary)}/yr` : ''}${!i.isActive ? ' [INACTIVE]' : ''}`
    ).join('\n')}`)
  }

  // Expenses
  if (expenseBudgets.length > 0) {
    const totalMonthlyExpenses = expenseBudgets.reduce((s, e) => s + e.monthlyBudget, 0)
    sections.push(`\n=== EXPENSE BUDGETS (Total: ${formatCurrency(totalMonthlyExpenses)}/month) ===\n${expenseBudgets.map(e =>
      `- ${e.label} (${e.category}): ${formatCurrency(e.monthlyBudget)}/month`
    ).join('\n')}`)
  }

  // Recent actuals summary
  if (expenseActuals.length > 0) {
    const months = [...new Set(expenseActuals.map(a => a.month))].sort().reverse().slice(0, 3)
    for (const month of months) {
      const monthActuals = expenseActuals.filter(a => a.month === month)
      const total = monthActuals.reduce((s, a) => s + a.actualAmount, 0)
      sections.push(`\nActual expenses ${month}: ${formatCurrency(total)}`)
    }
  }

  // Projection settings
  sections.push(`\n=== PROJECTION SETTINGS ===
Projection Years: ${projectionSettings.projectionYears}
Property Growth Override: ${projectionSettings.propertyGrowthOverride ? (projectionSettings.propertyGrowthOverride * 100).toFixed(1) + '%' : 'default'}
Stock Growth Override: ${projectionSettings.stockGrowthOverride ? (projectionSettings.stockGrowthOverride * 100).toFixed(1) + '%' : 'default'}`)

  if (projectionSettings.surplusAllocations.length > 0) {
    sections.push(`Surplus Allocations:\n${projectionSettings.surplusAllocations.map(a =>
      `  - ${a.targetName} (${a.targetType}): ${a.percentage}%`
    ).join('\n')}`)
  }

  return sections.join('\n')
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    // Match **bold**, then *italic*, then `code`
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
    let lastIndex = 0
    let match
    let key = 0
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      if (match[1]) parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>)
      else if (match[3]) parts.push(<em key={key++}>{match[4]}</em>)
      else if (match[5]) parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{match[6]}</code>)
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">{renderInline(line.slice(5))}</h4>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-foreground mt-5 mb-1.5">{renderInline(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-foreground mt-5 mb-2 pb-1 border-b border-border/30">{renderInline(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{renderInline(line.slice(2))}</h1>)
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-purple-400/50 pl-3 py-1 my-2 text-sm text-purple-300 dark:text-purple-300 bg-purple-500/5 rounded-r-md">
          {renderInline(line.slice(2))}
        </div>
      )
    }
    // Bullet list
    else if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} className="text-sm leading-relaxed">{renderInline(lines[i].replace(/^[-*] /, ''))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-outside ml-4 my-1.5 space-y-0.5">{items}</ul>)
      continue // skip i++ at bottom
    }
    // Numbered list
    else if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} className="text-sm leading-relaxed">{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-outside ml-4 my-1.5 space-y-0.5">{items}</ol>)
      continue
    }
    // Table (simple pipe table)
    else if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: string[] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i])
        i++
      }
      // Filter out separator rows (|---|---|)
      const dataRows = tableRows.filter(r => !r.match(/^\|[\s-:|]+\|$/))
      if (dataRows.length > 0) {
        const headerCells = dataRows[0].split('|').filter(c => c.trim()).map(c => c.trim())
        const bodyRows = dataRows.slice(1)
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  {headerCells.map((cell, ci) => (
                    <th key={ci} className="text-left py-1.5 px-2 font-semibold text-foreground text-xs">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => {
                  const cells = row.split('|').filter(c => c.trim()).map(c => c.trim())
                  return (
                    <tr key={ri} className="border-b border-border/20">
                      {cells.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-2 text-xs">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="border-border/30 my-3" />)
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="text-sm leading-relaxed my-1">{renderInline(line)}</p>)
    }

    i++
  }

  return <div className="space-y-0">{elements}</div>
}

export function WhatIfPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const askQuestion = async (question: string) => {
    if (!question.trim() || loading) return

    setError(null)
    const userMessage: Message = { role: 'user', content: question.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const state = useFinanceStore.getState()
      const financialContext = buildFinancialContext(state)

      // Use fetch directly for better error visibility
      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.access_token

      const res = await fetch(`${supabaseUrl}/functions/v1/what-if`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken ?? supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ question: question.trim(), financialContext }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || `Server error ${res.status}: ${res.statusText}`)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || 'No response generated.',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    askQuestion(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askQuestion(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/15">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">What if...?</h1>
              <p className="text-xs text-muted-foreground">
                Ask AI questions about your finances — powered by your real data
              </p>
            </div>
          </div>
          {hasMessages && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 mb-4">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Explore scenarios</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Ask any "what if" question about your finances. The AI analyses your
              actual assets, liabilities, income and expenses to give you personalised answers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className="flex items-start gap-2.5 text-left px-3.5 py-3 rounded-lg border border-border/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-xs text-muted-foreground hover:text-foreground group"
                >
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-purple-400/50 group-hover:text-purple-400 flex-shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-purple-500/20 text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <Card className="max-w-[90%] border-border/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-medium text-purple-400">AI Analysis</span>
                      </div>
                      <div className="text-sm leading-relaxed max-w-none text-muted-foreground">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <Card className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span className="text-sm text-muted-foreground">Analysing your finances...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border/40">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 rounded-xl border border-border/50 focus-within:border-purple-500/40 bg-muted/30 px-4 py-2 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What if I..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground/50 min-h-[36px] py-2"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-30 disabled:hover:bg-purple-500 transition-colors mb-0.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            AI analysis based on your NWT data • Not financial advice • Powered by GPT-4o-mini
          </p>
        </form>
      </div>
    </div>
  )
}
