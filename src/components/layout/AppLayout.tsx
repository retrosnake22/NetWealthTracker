import { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { syncController, onSyncStatus } from '@/lib/syncEngine'
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
  Briefcase,
  BarChart3,
  Coins,
  ChevronRight,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { useThemeMode } from '@/hooks/useThemeMode'
import type { ThemeMode } from '@/hooks/useThemeMode'
import { NotificationBell } from '@/components/NotificationBell'

// ─── Nav structure with sections ───

// Badge color config — solid opaque backgrounds with white icons
type BadgeColor = { bg: string; activeBg: string }
const badgeColors: Record<string, BadgeColor> = {
  // Parents — solid opaque
  '/':            { bg: '#3b82f6', activeBg: '#2563eb' },   // blue
  '/assets':      { bg: '#10b981', activeBg: '#059669' },   // emerald
  '/liabilities': { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  '/income':      { bg: '#8b5cf6', activeBg: '#7c3aed' },   // violet
  '/expenses':    { bg: '#f59e0b', activeBg: '#d97706' },   // amber
  '/projections': { bg: '#06b6d4', activeBg: '#0891b2' },   // cyan
  // Asset sub-items
  'cash':         { bg: '#3b82f6', activeBg: '#2563eb' },   // blue
  'stocks':       { bg: '#22c55e', activeBg: '#16a34a' },   // green
  'super':        { bg: '#f97316', activeBg: '#ea580c' },   // orange
  'vehicles':     { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  'property':     { bg: '#a855f7', activeBg: '#9333ea' },   // purple
  // Liability sub-items
  'mortgage':     { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  'car_loan':     { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  'personal_loan': { bg: '#f59e0b', activeBg: '#d97706' },  // amber
  'credit_card':  { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  'hecs':         { bg: '#3b82f6', activeBg: '#2563eb' },   // blue
  // Income sub-items
  'salary':       { bg: '#6366f1', activeBg: '#4f46e5' },   // indigo
  'rental':       { bg: '#a855f7', activeBg: '#9333ea' },   // purple
  'dividends':    { bg: '#22c55e', activeBg: '#16a34a' },   // green
  'interest':     { bg: '#eab308', activeBg: '#ca8a04' },   // yellow
  // Expense sub-items
  'fixed':        { bg: '#6b7280', activeBg: '#4b5563' },   // gray
  'living':       { bg: '#f97316', activeBg: '#ea580c' },   // orange
  // Catch-all
  'other':        { bg: '#6b7280', activeBg: '#4b5563' },   // gray
}

const navSections = [
  {
    label: 'Overview',
    theme: 'section-blue',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Assets',
    theme: 'section-emerald',
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
    ],
  },
  {
    label: 'Liabilities',
    theme: 'section-rose',
    items: [
      {
        to: '/liabilities',
        icon: CreditCard,
        label: 'Liabilities',
        subItems: [
          { to: '/liabilities?category=mortgage', category: 'mortgage', label: 'Mortgages', icon: Landmark },
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
    label: 'Income',
    theme: 'section-purple',
    items: [
      {
        to: '/income',
        icon: TrendingUp,
        label: 'Income',
        subItems: [
          { to: '/income?category=salary', category: 'salary', label: 'Salary / Wages', icon: Briefcase },
          { to: '/income?category=rental', category: 'rental', label: 'Rental Income', icon: Home },
          { to: '/income?category=dividends', category: 'dividends', label: 'Dividends', icon: BarChart3 },
          { to: '/income?category=interest', category: 'interest', label: 'Interest', icon: Coins },
        ],
      },
    ],
  },
  {
    label: 'Expenses',
    theme: 'section-amber',
    items: [
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
    theme: 'section-cyan',
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
    if (itemPath === '/assets' || itemPath === '/liabilities' || itemPath === '/income') {
      return !searchParams.get('category')
    }

    return true
  }

  return (
    <nav className="flex-1 px-3 py-2 pb-6 space-y-1.5 overflow-y-auto min-h-0">
      {navSections.map((section) => (
        <div key={section.label} className={section.theme}>
          {/* Section card */}
          <div className="section-card">
            {/* Section header */}
            <div className="px-2 mb-1 pt-1">
              <p className="section-label text-[10px] font-bold uppercase tracking-widest">
                {section.label}
              </p>
            </div>

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const subItems = 'subItems' in item ? (item as any).subItems : undefined
                const hasSubItems = subItems && subItems.length > 0
                const parentActive = hasSubItems
                  ? location.pathname.startsWith(item.to)
                  : isItemActive(item.to, 'end' in item ? (item as any).end : false)
                const parentBadge = badgeColors[item.to] || badgeColors['/']

                return (
                  <div key={item.to}>
                    {/* Parent nav item */}
                    <NavLink
                      to={item.to}
                      end={'end' in item ? (item as any).end : undefined}
                      onClick={onNavigate}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        parentActive
                          ? 'section-active'
                          : 'text-muted-foreground hover:section-hover hover:translate-x-0.5'
                      }`}
                    >
                      {/* Solid opaque badge with white icon */}
                      <span
                        className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0"
                        style={{ backgroundColor: parentActive ? parentBadge.activeBg : parentBadge.bg }}
                      >
                        <item.icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="truncate flex-1">{item.label}</span>
                      {hasSubItems && (
                        <ChevronRight className={`h-3 w-3 transition-transform ${parentActive ? 'rotate-90 opacity-50' : 'text-muted-foreground/30'}`} />
                      )}
                    </NavLink>

                    {/* Sub-items with smaller solid badges */}
                    {hasSubItems && (
                      <div className="pl-4 pr-1 pb-0.5 space-y-0.5 mt-0.5">
                        {subItems.map((sub: any) => {
                          const subActive = isItemActive(sub.to)
                          const subBadge = badgeColors[sub.category] || badgeColors['other']
                          return (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={onNavigate}
                              className={`group flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                subActive
                                  ? 'section-active'
                                  : 'text-muted-foreground hover:section-hover hover:translate-x-0.5'
                              }`}
                            >
                              <span
                                className="flex items-center justify-center h-5 w-5 rounded-md shrink-0"
                                style={{ backgroundColor: subActive ? subBadge.activeBg : subBadge.bg }}
                              >
                                <sub.icon className="h-2.5 w-2.5 text-white" />
                              </span>
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
        </div>
      ))}
    </nav>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }, [name])

  return (
    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
      <span className="text-xs font-bold text-primary">{initials}</span>
    </div>
  )
}

function SidebarFooter() {
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [themeMode, setThemeMode] = useThemeMode()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const resetStore = useFinanceStore((s) => s.resetStore)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    return onSyncStatus((status, saved) => {
      setSyncStatus(status)
      setLastSaved(saved)
    })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
      const name =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        ''
      setDisplayName(name)
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
      {/* Cloud sync status */}
      <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
        {syncStatus === 'saving' ? (
          <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
        ) : syncStatus === 'saved' ? (
          <Cloud className="h-3.5 w-3.5 text-emerald-400" />
        ) : syncStatus === 'error' ? (
          <CloudOff className="h-3.5 w-3.5 text-red-400" />
        ) : (
          <Cloud className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <span className={`text-[10px] font-medium ${syncStatus === 'saving' ? 'text-blue-400' : syncStatus === 'saved' ? 'text-emerald-400' : syncStatus === 'error' ? 'text-red-400' : 'text-muted-foreground/50'}`}>
          {syncStatus === 'saving' ? 'Syncing...' : syncStatus === 'saved' ? `Saved ${lastSaved ? new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}` : syncStatus === 'error' ? 'Sync failed' : 'Connected'}
        </span>
      </div>

      {/* User profile card */}
      {email && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-lg bg-muted/30">
          <UserAvatar name={displayName} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{email}</p>
          </div>
        </div>
      )}

      <div className="h-px bg-border/30 mb-2" />

      <NavLink
        to="/setup"
        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-200"
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
    </div>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border/50 bg-sidebar h-screen sticky top-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.01] pointer-events-none" />
      
      <div className="relative flex flex-col h-full">
        <div className="p-5 pb-4 shrink-0">
          <BrandLogo />
        </div>
        <SidebarNav />
        <div className="shrink-0">
          <SidebarFooter />
        </div>
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
            <div className="flex flex-col h-full relative">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.01] pointer-events-none" />
              <div className="relative flex flex-col h-full">
                <div className="p-5 pb-4">
                  <BrandLogo />
                </div>
                <SidebarNav onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </div>
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
