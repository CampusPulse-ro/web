import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
// Initialises translations synchronously, before the first render.
import './i18n'
import { queryClient } from './api/queryClient'
import { AuthProvider, ProtectedRoute } from './auth'
import { Layout } from './Layout'
import { AccountDeletionPage } from './pages/AccountDeletionPage'
import { AccountPage } from './pages/AccountPage'
import { AppPage } from './pages/AppPage'
import { DeadlinesPage } from './pages/DeadlinesPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { SignInPage } from './pages/SignInPage'
import { TimetablePage } from './pages/TimetablePage'

/** Renders the app (started by `main.tsx` when the URL isn't a sign-in answer). */
export function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
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
                <Route
                  path="deadlines"
                  element={
                    <ProtectedRoute>
                      <DeadlinesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="account"
                  element={
                    <ProtectedRoute>
                      <AccountPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="sign-in" element={<SignInPage />} />
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
