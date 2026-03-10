import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { LiabilitiesPage } from '@/pages/LiabilitiesPage'
import { IncomePage } from '@/pages/IncomePage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ProjectionsPage } from '@/pages/ProjectionsPage'
import { SetupWizardPage } from '@/pages/SetupWizardPage'
import LoginPage from '@/pages/LoginPage'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  const wizardComplete = localStorage.getItem('nwt-wizard-complete')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizardPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={wizardComplete ? <DashboardPage /> : <Navigate to="/setup" replace />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/liabilities" element={<LiabilitiesPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
