import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { IncomePage } from '@/pages/IncomePage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ProjectionsPage } from '@/pages/ProjectionsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
