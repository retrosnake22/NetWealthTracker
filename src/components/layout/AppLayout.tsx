import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { syncController } from '@/lib/syncEngine'
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
  Monitor,
  ArrowUpRight,
  Sparkles,
  PiggyBank,
  Target,
  Car,
  Package,
  Trash2,
  Building2,
  ShoppingCart,
  GraduationCap,
  Landmark,
  HandCoins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { calculateNetWealth, calculateTotalAssets, calculateTotalLiabilities, calculateMonthlyIncome, calculateMonthlyExpenses } from '@/lib/calculations'
import { formatCurrency } from '@/lib/format'
import { useThemeMode } from '@/hooks/useThemeMode'
import type { ThemeMode } from '@/hooks/useThemeMode'
import { NotificationBell } from '@/components/NotificationBell'

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
        subItems: [
          { to: '/assets?category=cash', category: 'cash', label: 'Cash & Savings', icon: PiggyBank },
          { to: '/assets?category=stocks', category: 'stocks', label: 'Shares / Stocks', icon: TrendingUp },
          { to: '/assets?category=super', category: 'super', label: 'Superannuation', icon: Target },
          { to: '/assets?category=vehicles', category: 'vehicles', label: 'Vehicles', icon: Car },
          { to: '/assets?category=property', category: 'property', label: 'Property', icon: Home },
          { to: '/assets?category=other', category: 'other', label: 'Other', icon: Package },
        ],
      },
      {
        to: '/liabilities',
        icon: CreditCard,
        label: 'Liabilities',
        subItems: [
          { to: '/liabilities?category=mortgage', category: 'mortgage', label: 'Mortgages', icon: Landmark },
          { to: '/liabilities?category=home_loan', category: 'home_loan', label: 'Home Loans', icon: Home },
          { to: '/liabilities?category=car_loan', category: 'car_loan', label: 'Car Loans', icon: Car },
          { to: '/liabilities?category=personal_loan', category: 'personal_loan', label: 'Personal Loans', icon: HandCoins },
          { to: '/liabilities?category=credit_card', category: 'credit_card', label: 'Credit Cards', icon: CreditCard },
          { to: '/liabilities?category=hecs', category: 'hecs', label: 'HECS / Student', icon: GraduationCap },
          { to: '/liabilities?category=other', category: 'other', label: 'Other', icon: Package },
        ],
      },
    ],
  },
  {
    label: 'Income Statement',
    items: [
      { to: '/income', icon: TrendingUp, label: 'Income' },
      {
        to: '/expenses',
        icon: Receipt,
        label: 'Expenses',
        subItems: [
          { to: '/expenses/fixed', category: 'fixed', label: 'Fixed Expenses', icon: Building2 },
          { to: '/expenses/living', category: 'living', label: 'Living Expenses', icon: ShoppingCart },
        ],
      },
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
  '/assets': { title: 'Assets', subtitle: 'Manage your cash, shares, super, vehicles & property' },
  '/liabilities': { title: 'Liabilities', subtitle: 'Mortgages, loans and debts' },
  '/income': { title: 'Income', subtitle: 'Your income sources' },
  '/expenses': { title: 'Expenses', subtitle: 'Budget and track spending' },
  '/expenses/fixed': { title: 'Fixed Expenses', subtitle: 'Property and committed costs' },
  '/expenses/living': { title: 'Living Expenses', subtitle: 'Budget and track daily spending' },
  '/projections': { title: 'Projections', subtitle: 'Model your future wealth' },
}

// ─── User profile hook ───

function useFirstName() {
  const [firstName, setFirstName] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        ''
      setFirstName(displayName.split(' ')[0])
    })
  }, [])

  return firstName
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="h-9 w-9 rounded-xl gradient-sapphire glow-sapphire flex items-center justify-center">
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
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const isItemActive = (itemTo: string, end?: boolean) => {
    const [itemPath, itemSearch] = itemTo.split('?')
    const currentPath = location.pathname

    if (itemPath !== currentPath) return false

    if (itemSearch) {
      const itemParams = new URLSearchParams(itemSearch)
      const itemCategory = itemParams.get('category')
      const currentCategory = searchParams.get('category')
      return itemCategory === currentCategory
    }

    if (end) return true
    if (itemPath === '/assets') {
      return !searchParams.get('category')
    }
    if (itemPath === '/liabilities') {
      return !searchParams.get('category')
    }

    return true
  }

  return (
    <nav className="flex-1 px-3 py-2 pb-6 space-y-5 overflow-y-auto min-h-0">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-3 mb-1.5">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const subItems = 'subItems' in item ? (item as any).subItems : undefined
              const hasSubItems = subItems && subItems.length > 0
              const parentActive = hasSubItems
                ? location.pathname.startsWith(item.to)
                : isItemActive(item.to, 'end' in item ? (item as any).end : false)

              return (
                <div key={item.to}>
                  {/* Parent nav item */}
                  <NavLink
                    to={item.to}
                    end={'end' in item ? (item as any).end : undefined}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      parentActive
                        ? 'bg-sapphire-subtle text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {parentActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 ${parentActive ? 'text-primary' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>

                  {/* Always-visible subcategories */}
                  {hasSubItems && (
                    <div className="pl-4 pr-1 pb-0.5 space-y-0.5 mt-0.5">
                      {subItems.map((sub: any) => {
                        const subActive = isItemActive(sub.to)
                        return (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            onClick={onNavigate}
                            className={`group relative flex items-center gap-2.5 pl-3 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                              subActive
                                ? 'bg-sapphire-subtle text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <sub.icon className={`h-3.5 w-3.5 shrink-0 ${subActive ? 'text-primary' : ''}`} />
                            {sub.label}
                          </Link>
                        )
                      })}
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
    <div className="mx-3 mb-2 p-3 rounded-lg border border-primary/20 bg-sapphire-subtle relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] gradient-sapphire" />
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
          <span className="text-blue-400">▲</span> {formatCurrency(totalAssets)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          <span className="text-red-400">▼</span> {formatCurrency(totalLiabilities)}
        </span>
      </div>
      {monthlySurplus !== 0 && (
        <p className={`text-[10px] pl-2 mt-1 font-medium tabular-nums ${monthlySurplus > 0 ? 'text-blue-400' : 'text-red-400'}`}>
          {monthlySurplus > 0 ? '+' : ''}{formatCurrency(monthlySurplus)}/mo
        </p>
      )}
    </div>
  )
}

function SidebarFooter() {
  const [email, setEmail] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useThemeMode()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const resetStore = useFinanceStore((s) => s.resetStore)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

  const handleResetAccount = async () => {
    syncController.pauseSync()
    await new Promise((r) => setTimeout(r, 600))

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const emptyData = {
        assets: [],
        properties: [],
        liabilities: [],
        incomes: [],
        expenseBudgets: [],
        expenseActuals: [],
        projectionSettings: {
          surplusAllocations: [],
          projectionYears: 20,
          defaultGrowthRates: {
            cash: 0.045,
            property: 0.07,
            stocks: 0.08,
            super: 0.07,
            vehicles: -0.10,
            other: 0.03,
          },
          propertyGrowthOverride: 0.07,
          stockGrowthOverride: 0.07,
        },
      }
      const { error } = await supabase
        .from('user_finance_data')
        .upsert({
          user_id: user.id,
          data: emptyData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (error) {
        console.error('[reset] Failed to clear cloud data:', error.message)
      }
      localStorage.removeItem(`nwt-wizard-complete-${user.id}`)
    }

    resetStore()
    localStorage.removeItem('nwt-finance-store')

    setShowResetConfirm(false)
    window.location.reload()
  }

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
        onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'dark' : 'light')}
      >
        {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : themeMode === 'light' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        {themeMode === 'dark' ? 'Light Mode' : themeMode === 'light' ? 'Dark Mode' : 'System (Auto)'}
      </Button>
      {!showResetConfirm ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-red-400 rounded-lg h-9"
          onClick={() => setShowResetConfirm(true)}
        >
          <Trash2 className="h-4 w-4" />
          Reset Account
        </Button>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
          <p className="text-xs text-red-400 font-medium">Delete all data? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={handleResetAccount}>
              Confirm Reset
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
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
    <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-sidebar h-screen sticky top-0">
      <div className="p-5 pb-4 shrink-0">
        <BrandLogo />
      </div>
      <SidebarNav />
      <div className="shrink-0">
        <NetWealthMini />
        <SidebarFooter />
      </div>
    </aside>
  )
}

function TopBar() {
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: '', subtitle: '' }
  const firstName = useFirstName()
  const isDashboard = location.pathname === '/'
  const [themeMode, setThemeMode] = useThemeMode()

  const title = isDashboard && firstName
    ? `Welcome back, ${firstName}`
    : page.title

  const subtitle = isDashboard && firstName
    ? 'Your financial overview at a glance'
    : page.subtitle

  const themeOptions: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'auto', icon: Monitor, label: 'Auto' },
  ]

  return (
    <header className="sticky top-0 z-40 hidden md:flex items-center h-14 border-b border-border/50 bg-background/80 backdrop-blur-md px-8">
      <div className="flex items-center gap-3 flex-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <span className="text-sm text-muted-foreground hidden lg:inline">&mdash; {subtitle}</span>
        )}
      </div>
      <NotificationBell />
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 ml-2">
        {themeOptions.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setThemeMode(value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              themeMode === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>
    </header>
  )
}

function MobileHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: 'NWT', subtitle: '' }
  const firstName = useFirstName()
  const isDashboard = location.pathname === '/'
  const [themeMode, setThemeMode] = useThemeMode()

  const title = isDashboard && firstName
    ? `Welcome back, ${firstName}`
    : page.title

  const nextTheme = (): ThemeMode => {
    if (themeMode === 'light') return 'dark'
    if (themeMode === 'dark') return 'auto'
    return 'light'
  }

  const ThemeIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Monitor

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
        <h1 className="text-base font-semibold flex-1">{title}</h1>
        <NotificationBell />
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setThemeMode(nextTheme())}>
          <ThemeIcon className="h-4 w-4" />
        </Button>
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
