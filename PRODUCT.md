# Net Wealth Tracker (NWT) — Product Document

## Vision
A personal finance dashboard for Australian households to track net wealth, manage property portfolios, budget income/expenses, and project long-term financial outcomes.

## Target User
Australian individuals or couples who want a clear, real-time picture of their net wealth — including property equity, superannuation, stocks, cash, and liabilities.

## Core Features

### Dashboard
- Net wealth summary (assets – liabilities)
- Monthly cashflow (income – expenses)
- Savings rate & debt-to-asset ratio
- Asset breakdown pie chart
- Wealth projection chart

### Assets Management
- Track cash, stocks/ETFs, superannuation, vehicles, and other assets
- Per-asset growth rate assumptions
- Offset account linking for mortgage calculations

### Properties
- Primary residence and investment property tracking
- Integrated mortgage management (balance, rate, repayments)
- Investment property P&L: rent, vacancy, rates, insurance, strata, management fees, land tax, maintenance
- Net yield and cashflow calculations

### Liabilities
- Mortgages, personal loans, car loans, credit cards, HECS, other
- Interest rate and repayment tracking
- Linked to properties for equity calculations

### Income
- Multiple income sources with categories (salary, rental, dividends, interest, side hustle)
- Active/inactive toggle for scenario modelling

### Expenses
- Monthly budget by category (27+ Australian-relevant categories)
- Budget vs actual tracking (model exists, UI pending)

### Projections
- Compound growth projection engine (asset growth, liability amortisation, surplus allocation)
- Configurable projection period (1–50 years)
- Surplus allocation to assets or extra debt repayments

## Currency & Locale
- Australian Dollar (AUD)
- Australian financial conventions (superannuation, HECS, council rates, etc.)

## Authentication
- Supabase Auth (email/password + Google OAuth)
- Session-based routing (unauthenticated → login page)

## Data Storage
- Currently: Zustand with localStorage persistence (`nwt-finance-store`)
- Future: Supabase database sync per user

## Non-Goals (Current Phase)
- Multi-currency support
- Tax calculation engine
- Bank feed integration
- Mobile native app
