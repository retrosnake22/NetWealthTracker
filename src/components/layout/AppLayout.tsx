import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// ─── Nav structure with sections ───

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Money Flow',
    items: [
      { to: '/assets', icon: Wallet, label: 'Assets' },
      { to: '/properties', icon: Home, label: 'Properties' },
      { to: '/liabilities', icon: CreditCard, label: 'Liabilities' },
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
  '/assets': { title: 'Assets', subtitle: 'Manage your cash, stocks, super & more' },
  '/properties': { title: 'Properties', subtitle: 'Track property values and equity' },
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
        <TrendingDown className="h-5 w-5 text-white rotate-180" />
      </div>
      <div>
        <h1 className="text-base font-bold tracking-tight text-foreground">NWT</h1>
        <p className="text-[10px] text-muted-foreground leading-none">Net Wealth Tracker</p>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
      {navSections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1.5">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                    )}
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
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
        <p className="text-[11px] text-muted-foreground/60 truncate px-3 pt-1">{email}</p>
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
      <SidebarFooter />
    </aside>
  )
}

function TopBar() {
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: '', subtitle: '' }

  return (
    <header className="sticky top-0 z-40 hidden md:flex items-center h-14 border-b border-border/50 bg-background/80 backdrop-blur-md px-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{page.title}</h1>
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
