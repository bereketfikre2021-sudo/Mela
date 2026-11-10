import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import './locales/i18n'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

// Route admin panel separately — zero shared state with the customer app.
// The admin app needs BrowserRouter here; the customer App provides its own.
if (window.location.pathname.startsWith('/admin')) {
  import('./admin/AdminApp').then(({ AdminApp }) => {
    createRoot(rootElement).render(
      <StrictMode>
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </StrictMode>
    )
  })
} else {
  import('./App').then(({ App }) => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}
