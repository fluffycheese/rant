import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { PatchingProvider } from './contexts/PatchingContext.tsx'
import ProtectedRoute from './auth/ProtectedRoute.tsx'
import Layout from './components/Layout.tsx'
import LoginPage from './pages/LoginPage.tsx'
import RackViewPage from './pages/RackViewPage.tsx'
import TemplatesPage from './pages/TemplatesPage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import ProfileViewPage from './pages/ProfileViewPage.tsx'
import SiteViewPage from './pages/SiteViewPage.tsx'
import Dashboard from './components/Dashboard.tsx'
import { DemoBanner } from './components/DemoBanner.tsx'
import ScanDevicePage from './pages/ScanDevicePage.tsx'
import ScanPortPage from './pages/ScanPortPage.tsx'
import PrintRackLabelsPage from './pages/PrintRackLabelsPage.tsx'
import PrintSiteLabelsPage from './pages/PrintSiteLabelsPage.tsx'
export default function App() {
  return (
    <AuthProvider>
      <PatchingProvider>
        <BrowserRouter>
          <DemoBanner />
          <Routes>
            {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/scan/device/:id" element={<ScanDevicePage />} />
            <Route path="/scan/port/:id" element={<ScanPortPage />} />
            <Route path="/print/rack/:id" element={<PrintRackLabelsPage />} />
            <Route path="/print/site/:id" element={<PrintSiteLabelsPage />} />
            
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/racks/:rackId" element={<RackViewPage />} />
              <Route path="/sites/:siteId" element={<SiteViewPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profiles/:id" element={<ProfileViewPage />} />
              <Route path="/topology" element={<ProfileViewPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </PatchingProvider>
    </AuthProvider>
  )
}
