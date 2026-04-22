import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import AssetsPage from '@/pages/AssetsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { LiabilitiesPage } from '@/pages/LiabilitiesPage'
import { IncomePage } from '@/pages/IncomePage'
import { FixedExpensesPage } from '@/pages/FixedExpensesPage'
import { LivingExpensesPage } from '@/pages/LivingExpensesPage'
import { ProjectionsPage } from '@/pages/ProjectionsPage'
import { WhatIfPage } from '@/pages/WhatIfPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SetupWizardPage } from '@/pages/SetupWizardPage'
import LoginPage from '@/pages/LoginPage'
// ResetPasswordPage no longer needed — OAuth-only auth
// import ResetPasswordPage from '@/pages/ResetPasswordPage'
import { useFinanceStore } from '@/stores/useFinanceStore'
import { loadFromCloud, createDebouncedSave, registerDebouncedCancel, registerDebouncedFlush, registerStoreUnsubscribe, setSyncPaused, syncController } from '@/lib/syncEngine'

const debouncedSave = createDebouncedSave(2000)
// Register the cancel + flush fns so the sync controller can manage pending saves
registerDebouncedCancel(debouncedSave.cancel)
registerDebouncedFlush(debouncedSave.flush)

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Must be called before any early returns (Rules of Hooks)
  const storeSetupComplete = useFinanceStore((s) => s.userProfile.setupComplete)

  // Load cloud data when user logs in
  useEffect(() => {
    if (!session?.user?.id) {
      // Clean up store subscription on logout
      registerStoreUnsubscribe(null)
      return
    }

    const userId = session.user.id

    // Clear store before loading new user's data
    useFinanceStore.getState().resetStore()

    // Ensure sync is enabled (may have been paused by a reset before reload)
    setSyncPaused(false)

    // Load from cloud, then subscribe to changes
    setSyncing(true)
    loadFromCloud(userId).then((cloudData) => {
      if (cloudData) {
        useFinanceStore.getState().hydrateFromCloud(cloudData)
      }
      setSyncing(false)

      // Subscribe to future store changes → save to cloud
      const unsub = useFinanceStore.subscribe((state) => {
        debouncedSave.save(userId, state)
      })
      registerStoreUnsubscribe(unsub)
    })

    return () => {
      debouncedSave.cancel()
      registerStoreUnsubscribe(null)
    }
  }, [session?.user?.id])

  // Flush pending saves when user leaves the page or switches tabs
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush any pending debounced save immediately
      syncController.flushPendingSave()
    }

    const handleVisibilityChange = () => {
      // When tab becomes hidden (user switched tabs/minimised), flush immediately
      if (document.visibilityState === 'hidden') {
        syncController.flushPendingSave()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

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

  // Migrate: if localStorage says wizard complete but cloud doesn't know yet, sync it up
  useEffect(() => {
    if (session?.user?.id) {
      const localFlag = localStorage.getItem(`nwt-wizard-complete-${session.user.id}`)
      if (localFlag && !storeSetupComplete) {
        useFinanceStore.getState().setSetupComplete(true)
      }
    }
  }, [session?.user?.id, storeSetupComplete])

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

  if (syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Syncing your data...</p>
      </div>
    )
  }

  // Check cloud-synced flag first, fall back to localStorage
  const localStorageFlag = localStorage.getItem(`nwt-wizard-complete-${session?.user?.id}`)
  const wizardComplete = storeSetupComplete || !!localStorageFlag

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
          <Route path="/expenses" element={<Navigate to="/expenses/living" replace />} />
          <Route path="/expenses/fixed" element={<FixedExpensesPage />} />
          <Route path="/expenses/living" element={<LivingExpensesPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
          <Route path="/what-if" element={<WhatIfPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
