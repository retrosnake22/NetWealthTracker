import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  Wallet,
  Home,
  TrendingUp,
  Receipt,
  LineChart,
  CreditCard,
  Menu,
  LogOut,
  Moon,
  Sun,
  ArrowUpRight,
  Sparkles,
  PiggyBank,
  Target,
  Car,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities, calculateMonthlyIncome, calculateMonthlyExpenses } from '@/lib/calculations'
import { formatCurrency } from '@/lib/format'

// ─── Nav structure with sections ───

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Balance Sheet',
    items: [
      {
        to: '/assets',
        icon: Wallet,
        label: 'Assets',
        expandable: true,
        subItems: [
          { to: '/assets?category=cash', category: 'cash', label: 'Cash & Savings', icon: PiggyBank },
          { to: '/assets?category=stocks', category: 'stocks', label: 'Stocks / ETFs', icon: TrendingUp },
          { to: '/assets?category=super', category: 'super', label: 'Superannuation', icon: Target },
          { to: '/assets?category=vehicles', category: 'vehicles', label: 'Vehicles', icon: Car },
          { to: '/assets?category=property', category: 'property', label: 'Property', icon: Home },
          { to: '/assets?category=other', category: 'other', label: 'Other', icon: Package },
        ],
      },
      { to: '/liabilities', icon: CreditCard, label: 'Liabilities' },
    ],
  },
  {
    label: 'Income Statement',
    items: [
      { to: '/income', icon: TrendingUp, label: 'Income' },
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/projections', icon: LineChart, label: 'Projections' },
    ],
  },
]

// ─── Page title mapping ───

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your financial overview at a glance' },
  '/assets': { title: 'Assets', subtitle: 'Manage your cash, stocks, super, vehicles & property' },
  '/liabilities': { title: 'Liabilities', subtitle: 'Mortgages, loans and debts' },
  '/income': { title: 'Income', subtitle: 'Your income sources' },
  '/expenses': { title: 'Expenses', subtitle: 'Budget and track spending' },
  '/projections': { title: 'Projections', subtitle: 'Model your future wealth' },
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('nwt-dark-mode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('nwt-dark-mode', String(dark))
  }, [dark])

  return [dark, setDark] as const
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="h-9 w-9 rounded-xl gradient-emerald glow-emerald flex items-center justify-center">
        <ArrowUpRight className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-base font-bold tracking-tight text-foreground">NWT</h1>
        <p className="text-[10px] text-muted-foreground leading-none">Net Wealth Tracker</p>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const [expandedNav, setExpandedNav] = useState<string | null>('/assets')
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const toggleExpand = (to: string) => {
    setExpandedNav((prev) => (prev === to ? null : to))
  }

  // Check if a nav item is active based on pathname + query params
  const isItemActive = (itemTo: string, end?: boolean) => {
    const [itemPath, itemSearch] = itemTo.split('?')
    const currentPath = location.pathname

    if (itemPath !== currentPath) return false

    // For items with query params (sub-items), match the category
    if (itemSearch) {
      const itemParams = new URLSearchParams(itemSearch)
      const itemCategory = itemParams.get('category')
      const currentCategory = searchParams.get('category')
      return itemCategory === currentCategory
    }

    // For parent items without query params: active only if NO category is selected
    if (end) return true
    // For "/assets" parent: only active when no category filter
    if (itemPath === '/assets') {
      return !searchParams.get('category')
    }

    return true
  }

  return (
    <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isExpandable = 'expandable' in item && item.expandable
              const subItems = 'subItems' in item ? (item as any).subItems : undefined
              const isExpanded = expandedNav === item.to
              const parentActive = isItemActive(item.to, 'end' in item ? (item as any).end : false)

              return (
                <div key={item.to}>
                  {isExpandable ? (
                    /* Expandable parent row */
                    <div className="flex items-center rounded-lg overflow-hidden">
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        className={`group relative flex items-center gap-3 pl-3 pr-2 py-2 text-sm font-medium transition-all duration-150 flex-1 min-w-0 ${
                          parentActive
                            ? 'bg-emerald-subtle text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {parentActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                        )}
                        <item.icon className={`h-4 w-4 shrink-0 ${parentActive ? 'text-primary' : ''}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      {/* Chevron toggle */}
                      <button
                        onClick={() => toggleExpand(item.to)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 mr-1"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  ) : (
                    /* Regular nav item */
                    <NavLink
                      to={item.to}
                      end={'end' in item ? (item as any).end : undefined}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-emerald-subtle text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                          )}
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  )}

                  {/* Sub-items with smooth expand/collapse animation */}
                  {isExpandable && subItems && (
                    <div
                      className="overflow-hidden transition-all duration-200 ease-in-out"
                      style={{
                        maxHeight: isExpanded ? `${subItems.length * 40}px` : '0px',
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div className="pl-4 pr-1 pb-0.5 space-y-0.5">
                        {subItems.map((sub: any) => {
                          const subActive = isItemActive(sub.to)
                          return (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={onNavigate}
                              className={`group relative flex items-center gap-2.5 pl-3 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                                subActive
                                  ? 'bg-emerald-subtle text-primary'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              }`}
                            >
                              <sub.icon className={`h-3.5 w-3.5 shrink-0 ${subActive ? 'text-primary' : ''}`} />
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function NetWealthMini() {
  const { assets, properties, liabilities, incomes, expenseBudgets } = useFinanceStore()
  const netWealth = calculateNetWealth(assets, properties, liabilities)
  const totalAssets = calculateTotalAssets(assets, properties)
  const totalLiabilities = calculateTotalLiabilities(liabilities)
  const monthlySurplus = calculateMonthlyIncome(incomes) - calculateMonthlyExpenses(expenseBudgets)

  // Simple sparkline points (simulate recent trend based on surplus direction)
  const sparkPoints = Array.from({ length: 7 }, (_, i) => {
    const base = netWealth - monthlySurplus * (6 - i)
    return Math.max(0, base)
  })
  const sparkMin = Math.min(...sparkPoints)
  const sparkMax = Math.max(...sparkPoints)
  const sparkRange = sparkMax - sparkMin || 1
  const sparkPath = sparkPoints
    .map((v, i) => {
      const x = (i / 6) * 100
      const y = 28 - ((v - sparkMin) / sparkRange) * 24
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  return (
    <div className="mx-3 mb-2 p-3 rounded-lg border border-primary/20 bg-emerald-subtle relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] gradient-emerald" />
      <div className="flex items-center justify-between pl-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Net Wealth</p>
          <p className={`text-lg font-bold tabular-nums ${netWealth >= 0 ? 'text-primary' : 'text-red-500'}`}>
            {formatCurrency(netWealth)}
          </p>
        </div>
        <svg width="64" height="28" viewBox="0 0 100 28" className="opacity-60">
          <path d={sparkPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex items-center gap-3 pl-2 mt-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          <span className="text-emerald-500">▲</span> {formatCurrency(totalAssets)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          <span className="text-red-400">▼</span> {formatCurrency(totalLiabilities)}
        </span>
      </div>
      {monthlySurplus !== 0 && (
        <p className={`text-[10px] pl-2 mt-1 font-medium tabular-nums ${monthlySurplus > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {monthlySurplus > 0 ? '+' : ''}{formatCurrency(monthlySurplus)}/mo
        </p>
      )}
    </div>
  )
}

function SidebarFooter() {
  const [email, setEmail] = useState<string | null>(null)
  const [dark, setDark] = useDarkMode()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="px-3 pb-4 space-y-1">
      <div className="h-px bg-border mb-3" />
      <NavLink
        to="/setup"
        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Setup Wizard
      </NavLink>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground rounded-lg h-9"
        onClick={() => setDark(!dark)}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {dark ? 'Light Mode' : 'Dark Mode'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground rounded-lg h-9"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
      {email && (
        <p className="text-[11px] text-muted-foreground/60 truncate px-3 pt-1" title={email}>{email}</p>
      )}
    </div>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-sidebar">
      <div className="p-5 pb-4">
        <BrandLogo />
      </div>
      <SidebarNav />
      <NetWealthMini />
      <SidebarFooter />
    </aside>
  )
}

function TopBar() {
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: '', subtitle: '' }

  return (
    <header className="sticky top-0 z-40 hidden md:flex items-center h-14 border-b border-border/50 bg-background/80 backdrop-blur-md px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{page.title}</h1>
        {page.subtitle && (
          <span className="text-sm text-muted-foreground hidden lg:inline">&mdash; {page.subtitle}</span>
        )}
      </div>
    </header>
  )
}

function MobileHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: 'NWT', subtitle: '' }

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 h-14">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 bg-sidebar">
            <div className="flex flex-col h-full">
              <div className="p-5 pb-4">
                <BrandLogo />
              </div>
              <SidebarNav onNavigate={() => setOpen(false)} />
              <NetWealthMini />
              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-base font-semibold">{page.title}</h1>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <DesktopSidebar />
      <MobileHeader />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 pt-18 md:p-8 md:pt-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
