import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
// Initialises translations synchronously, before the first render.
import './i18n'
import { Layout } from './Layout'
import { AccountDeletionPage } from './pages/AccountDeletionPage'
import { AppPage } from './pages/AppPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="app" element={<AppPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="account-deletion" element={<AccountDeletionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
