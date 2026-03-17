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
// Matches mockup: sidebar-option-b---grouped-cards-with-gradient-accents.html

interface SubItem {
  to: string
  category: string
  label: string
  emoji: string
}

interface NavItem {
  to: string
  emoji: string
  label: string
  end?: boolean
  subItems?: SubItem[]
}

interface NavSection {
  label: string
  theme: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    theme: 's-blue',
    items: [
      { to: '/', emoji: '📊', label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Assets',
    theme: 's-emerald',
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
    theme: 's-rose',
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
    theme: 's-purple',
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
    theme: 's-amber',
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
    theme: 's-cyan',
    items: [
      { to: '/projections', emoji: '📉', label: 'Projections' },
      { to: '/what-if', emoji: '✨', label: 'What if...?' },
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
  '/what-if': { title: 'What if...?', subtitle: 'AI-powered financial scenarios' },
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

/* ─── Brand — mockup: .brand ─── */
function BrandLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 12px' }}>
      {/* mockup: .brand-icon — 38×38, border-radius: 12px */}
      <div
        style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
          boxShadow: '0 0 20px rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ArrowUpRight style={{ width: 16, height: 16, color: 'white' }} />
      </div>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }} className="text-foreground">NWT</h1>
        <p style={{ fontSize: 10, color: '#5a6e94', lineHeight: 1 }}>Net Wealth Tracker</p>
      </div>
    </div>
  )
}

/* ─── Sidebar Nav — translates mockup .nav-area exactly ─── */
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
    /* mockup: .nav-area — flex:1, padding: 4px 12px 12px, gap: 8px */
    <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      {navSections.map((section) => (
        /* mockup: .s-blue / .s-emerald / etc wrapper */
        <div key={section.label} className={section.theme}>
          {/* mockup: .section-card */}
          <div className="section-card">
            {/* mockup: .section-header — padding: 8px 8px 4px 12px */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 4px 12px' }}>
              {/* mockup: .section-header-label */}
              <span className="section-header-label" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, flex: 1 }}>
                {section.label}
              </span>
              {/* mockup: .section-count — only if has subItems */}
              {section.items[0]?.subItems && (
                <span className="section-count" style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                  {section.items[0].subItems.length}
                </span>
              )}
            </div>

            {/* Nav items */}
            {section.items.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0
              const parentActive = hasSubItems
                ? location.pathname.startsWith(item.to)
                : isItemActive(item.to, item.end)

              return (
                <div key={item.to}>
                  {/* mockup: .nav-item — gap:10px, padding: 8px 10px, border-radius: 8px, font-size: 13px, font-weight: 500 */}
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={`nav-item ${parentActive ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontSize: 13, fontWeight: parentActive ? 600 : 500,
                      textDecoration: 'none',
                    }}
                  >
                    {/* mockup: .icon-badge — 30×30, border-radius: 8px, font-size: 14px */}
                    <span
                      className="icon-badge"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, flexShrink: 0,
                      }}
                    >
                      {item.emoji}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {/* mockup: .chevron */}
                    {hasSubItems && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.3 }}>›</span>
                    )}
                  </NavLink>

                  {/* mockup: .sub-items — always visible, padding: 2px 6px 4px 42px */}
                  {hasSubItems && (
                    <div style={{ padding: '2px 6px 4px 42px' }}>
                      {item.subItems!.map((sub) => {
                        const subActive = isItemActive(sub.to)
                        return (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            onClick={onNavigate}
                            className={`sub-item ${subActive ? 'active' : ''}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '5px 10px', borderRadius: 6,
                              cursor: 'pointer', fontSize: 12,
                              fontWeight: subActive ? 600 : 500,
                              transition: 'all 0.15s',
                              textDecoration: 'none',
                            }}
                          >
                            {/* mockup: .sub-icon — font-size: 11px, width: 14px */}
                            <span style={{ fontSize: 11, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    /* mockup: .user-avatar — 32×32, border-radius: 8px */
    <div className="user-avatar-sidebar" style={{
      width: 32, height: 32, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700,
    }}>
      {initials}
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
    /* mockup: .footer — padding: 12px, border-top */
    <div className="sidebar-footer" style={{ padding: 12 }}>
      {/* mockup: .sync-row */}
      <div className="sync-row" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', fontSize: 10, fontWeight: 500 }}>
        {syncStatus === 'saving' ? (
          <Loader2 style={{ width: 10, height: 10 }} className="text-blue-400 animate-spin" />
        ) : syncStatus === 'saved' ? (
          <>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ color: '#34d399' }}>
              Saved {lastSaved ? new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </>
        ) : syncStatus === 'error' ? (
          <span className="text-red-400">Sync failed</span>
        ) : (
          <>
            <Cloud style={{ width: 10, height: 10 }} className="text-muted-foreground/50" />
            <span className="text-muted-foreground/50">Connected</span>
          </>
        )}
      </div>

      {/* mockup: .user-card */}
      {email && (
        <div className="user-card-sidebar" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10, marginTop: 6,
        }}>
          <UserAvatar name={displayName} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="user-name-sidebar" style={{ fontSize: 12, fontWeight: 600 }}>{displayName}</div>
            <div style={{ fontSize: 10, color: '#5a6e94', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          </div>
        </div>
      )}

      <div style={{ height: 1, margin: '8px 0' }} className="bg-border/30" />

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
    /* mockup: .sidebar — width: 260px, background, border */
    <aside className="hidden md:flex w-[260px] flex-col h-screen sticky top-0 sidebar-container">
      <BrandLogo />
      <SidebarNav />
      <div style={{ flexShrink: 0 }}>
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
          <SheetContent side="left" className="w-[260px] p-0 sidebar-container">
            <BrandLogo />
            <SidebarNav onNavigate={() => setOpen(false)} />
            <SidebarFooter />
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
