import { useState, useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { syncController, onSyncStatus } from '@/lib/syncEngine'
import {
  Menu,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ArrowUpRight,
  Sparkles,
  Trash2,
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

// ─── Nav structure — Option B: Grouped Cards with Gradient Accents ───

const navSections = [
  {
    label: 'Overview',
    theme: 'section-blue',
    items: [
      { to: '/', emoji: '📊', label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Assets',
    theme: 'section-emerald',
    items: [
      {
        to: '/assets',
        emoji: '💰',
        label: 'All Assets',
        subItems: [
          { to: '/assets?category=cash', category: 'cash', label: 'Cash & Savings', emoji: '🏦' },
          { to: '/assets?category=stocks', category: 'stocks', label: 'Shares / Stocks', emoji: '📈' },
          { to: '/assets?category=super', category: 'super', label: 'Superannuation', emoji: '🎯' },
          { to: '/assets?category=vehicles', category: 'vehicles', label: 'Vehicles', emoji: '🚗' },
          { to: '/assets?category=property', category: 'property', label: 'Property', emoji: '🏠' },
          { to: '/assets?category=other', category: 'other', label: 'Other', emoji: '📦' },
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
        emoji: '💳',
        label: 'All Liabilities',
        subItems: [
          { to: '/liabilities?category=mortgage', category: 'mortgage', label: 'Mortgages', emoji: '🏛' },
          { to: '/liabilities?category=car_loan', category: 'car_loan', label: 'Car Loans', emoji: '🚗' },
          { to: '/liabilities?category=personal_loan', category: 'personal_loan', label: 'Personal Loans', emoji: '🤝' },
          { to: '/liabilities?category=credit_card', category: 'credit_card', label: 'Credit Cards', emoji: '💳' },
          { to: '/liabilities?category=hecs', category: 'hecs', label: 'HECS / Student', emoji: '🎓' },
          { to: '/liabilities?category=other', category: 'other', label: 'Other', emoji: '📦' },
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
        emoji: '📈',
        label: 'All Income',
        subItems: [
          { to: '/income?category=salary', category: 'salary', label: 'Salary / Wages', emoji: '💼' },
          { to: '/income?category=rental', category: 'rental', label: 'Rental Income', emoji: '🏠' },
          { to: '/income?category=dividends', category: 'dividends', label: 'Dividends', emoji: '📊' },
          { to: '/income?category=interest', category: 'interest', label: 'Interest', emoji: '🪙' },
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
        emoji: '🧾',
        label: 'All Expenses',
        subItems: [
          { to: '/expenses/fixed', category: 'fixed', label: 'Fixed Expenses', emoji: '🏢' },
          { to: '/expenses/living', category: 'living', label: 'Living Expenses', emoji: '🛒' },
        ],
      },
    ],
  },
  {
    label: 'Planning',
    theme: 'section-cyan',
    items: [
      { to: '/projections', emoji: '📉', label: 'Projections' },
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
      <div className="h-[38px] w-[38px] rounded-xl gradient-sapphire glow-sapphire flex items-center justify-center shrink-0">
        <ArrowUpRight className="h-4 w-4 text-white" />
      </div>
      <div>
        <h1 className="text-base font-extrabold tracking-tight text-foreground" style={{ letterSpacing: '-0.5px' }}>NWT</h1>
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
    <nav className="flex-1 px-3 py-1 pb-6 space-y-2 overflow-y-auto min-h-0">
      {navSections.map((section) => (
        <div key={section.label} className={section.theme}>
          {/* Section card */}
          <div className="section-card">
            {/* Section header row */}
            <div className="flex items-center gap-2.5 px-3 pt-2 pb-1">
              <span className="section-label text-[10px] font-bold uppercase tracking-wider flex-1">
                {section.label}
              </span>
              {/* Count badge — neutral/muted */}
              {section.items[0] && 'subItems' in section.items[0] && (section.items[0] as any).subItems && (
                <span className="section-count">
                  {(section.items[0] as any).subItems.length}
                </span>
              )}
            </div>

            {/* Nav items */}
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
                    className={`nav-item group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      parentActive
                        ? 'section-active font-semibold'
                        : 'nav-item-default hover:nav-item-hover'
                    }`}
                  >
                    {/* Translucent icon badge — rounded-lg, 30×30 */}
                    <span className="section-icon-badge flex items-center justify-center h-[30px] w-[30px] rounded-lg shrink-0 text-sm">
                      {'emoji' in item ? (item as any).emoji : ''}
                    </span>
                    <span className="truncate flex-1">{item.label}</span>
                    {/* Chevron for items with sub-items */}
                    {hasSubItems && (
                      <span className="text-[11px] opacity-30 ml-auto">›</span>
                    )}
                  </NavLink>

                  {/* Sub-items — always visible */}
                  {hasSubItems && (
                    <div className="sub-items-container" style={{ padding: '2px 6px 4px 42px' }}>
                      {subItems.map((sub: any) => {
                        const subActive = isItemActive(sub.to)
                        return (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            onClick={onNavigate}
                            className={`flex items-center gap-2 px-2.5 py-[5px] rounded-md text-xs transition-all duration-150 ${
                              subActive
                                ? 'sub-item-active font-semibold'
                                : 'sub-item-default hover:sub-item-hover font-medium'
                            }`}
                          >
                            <span className="text-[11px] w-3.5 flex items-center justify-center shrink-0">
                              {sub.emoji}
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
