import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './providers/query-provider'
import { AdminAuthProvider } from './auth/useAdminAuth'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <QueryProvider>
          <App />
        </QueryProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
