import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import AssetsPage from '@/pages/AssetsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { LiabilitiesPage } from '@/pages/LiabilitiesPage'
import { IncomePage } from '@/pages/IncomePage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ProjectionsPage } from '@/pages/ProjectionsPage'
import { SetupWizardPage } from '@/pages/SetupWizardPage'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { loadFromCloud, createDebouncedSave } from '@/lib/syncEngine'

const debouncedSave = createDebouncedSave(2000)

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  // Load cloud data when user logs in
  useEffect(() => {
    if (!session?.user?.id) {
      // Clean up store subscription on logout
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
      return
    }

    const userId = session.user.id

    // Clear store before loading new user's data
    useFinanceStore.getState().resetStore()

    // Load from cloud, then subscribe to changes
    setSyncing(true)
    loadFromCloud(userId).then((cloudData) => {
      if (cloudData) {
        useFinanceStore.getState().hydrateFromCloud(cloudData)
      }
      setSyncing(false)

      // Subscribe to future store changes → save to cloud
      unsubRef.current = useFinanceStore.subscribe((state) => {
        debouncedSave(userId, state)
      })
    })

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [session?.user?.id])

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

  // Allow reset-password page even without session (Supabase handles the token via URL hash)
  const isResetPassword = window.location.pathname === '/reset-password'

  if (!session && !isResetPassword) {
    return <LoginPage />
  }

  if (!session && isResetPassword) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Syncing your data...</p>
      </div>
    )
  }

  const wizardComplete = localStorage.getItem(`nwt-wizard-complete-${session?.user?.id}`)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizardPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
