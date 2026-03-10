# Net Wealth Tracker (NWT) — Architecture Document

## Tech Stack
- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix primitives)
- **State**: Zustand 5 with `persist` middleware (localStorage)
- **Charts**: Recharts 3
- **Auth**: Supabase Auth (@supabase/supabase-js)
- **Icons**: Lucide React
- **Font**: Geist Variable (via @fontsource-variable)
- **Linting**: ESLint 9 with React Hooks + React Refresh plugins

## Project Structure
```
src/
├── App.tsx                 # Root: auth gate + routing
├── main.tsx                # React DOM entry
├── index.css               # Tailwind config + CSS variables (light/dark)
├── components/
│   ├── dashboard/          # MetricCard, WealthChart, AssetBreakdown
│   ├── forms/              # (empty — future form components)
│   ├── layout/             # AppLayout (shell + sidebar + mobile nav)
│   └── ui/                 # shadcn/ui primitives (button, card, dialog, etc.)
├── hooks/                  # (empty — future custom hooks)
├── lib/
│   ├── calculations.ts     # Financial math: equity, yield, cashflow, projections
│   ├── format.ts           # Currency/percent/compact formatters + ID generation
│   ├── supabase.ts         # Supabase client init
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── DashboardPage.tsx   # Summary metrics + charts
│   ├── AssetsPage.tsx      # CRUD for non-property assets
│   ├── PropertiesPage.tsx  # CRUD for properties + linked mortgages
│   ├── IncomePage.tsx       # CRUD for income sources
│   ├── ExpensesPage.tsx     # CRUD for expense budgets
│   ├── ProjectionsPage.tsx  # Projection chart + settings
│   ├── LiabilitiesPage.tsx  # CRUD for standalone liabilities
│   └── LoginPage.tsx        # Auth (email/password + Google OAuth)
├── stores/
│   └── useFinanceStore.ts  # Zustand store: all financial data + CRUD actions
└── types/
    └── models.ts           # TypeScript interfaces for all domain entities
```

## Routing
- React Router DOM v7, `BrowserRouter`
- Auth gate in `App.tsx`: no session → `<LoginPage />`, session → `<BrowserRouter>` with routes
- All authenticated routes wrapped in `<AppLayout>` (sidebar + main content area)

## State Management
- Single Zustand store (`useFinanceStore`) with persist middleware
- Storage key: `nwt-finance-store` (localStorage)
- All CRUD operations are synchronous, in-memory
- Future: sync to Supabase per-user

## Styling Conventions
- Tailwind utility classes throughout
- shadcn/ui components in `src/components/ui/`
- CSS custom properties for theming (light + dark via `.dark` class)
- Color tokens: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--destructive`, etc.
- Chart colors: `--chart-1` through `--chart-5`
- Accent colors: emerald-500 (positive), red-500 (negative)

## Design Patterns
- **Page components**: each page manages its own CRUD dialog state
- **Form state**: `useState` with string fields, parsed to numbers on save
- **Calculations**: pure functions in `lib/calculations.ts`, no side effects
- **Formatting**: centralised in `lib/format.ts` (AUD locale)
- **ID generation**: `crypto.randomUUID()`

## Deployment
- Not yet configured
- Vite build output: `dist/`
- Candidate platforms: Vercel, Netlify, or Firebase Hosting

## Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
