import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
// Initialises translations synchronously, before the first render.
import './i18n'
import { queryClient } from './api/queryClient'
import { AuthProvider, ProtectedRoute } from './auth'
import { Layout } from './Layout'
import { AccountDeletionPage } from './pages/AccountDeletionPage'
import { AppPage } from './pages/AppPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TimetablePage } from './pages/TimetablePage'

// UI prototype (throwaway, see src/prototype/README.md): its own full-screen shell, outside Layout.
const Prototype = lazy(() => import('./prototype/day-spine'))

/** Renders the app (started by `main.tsx` when the URL isn't a sign-in answer). */
export function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="prototype/*"
                element={
                  <Suspense fallback={null}>
                    <Prototype />
                  </Suspense>
                }
              />
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route
                  path="app"
                  element={
                    <ProtectedRoute>
                      <AppPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="timetable"
                  element={
                    <ProtectedRoute>
                      <TimetablePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="account-deletion" element={<AccountDeletionPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
