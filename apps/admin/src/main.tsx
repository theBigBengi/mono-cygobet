/**
 * Application Entry Point
 * 
 * Sets up the React app with all required providers:
 * 1. BrowserRouter - React Router for client-side routing
 * 2. AdminAuthProvider - Authentication context (must wrap routes)
 * 3. QueryProvider - React Query for data fetching
 * 
 * Provider order matters:
 * - Router must be outermost (for navigation)
 * - Auth must wrap QueryProvider (auth state needed for API calls)
 * - QueryProvider wraps App (for data fetching)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './providers/query-provider'
import { AdminAuthProvider } from './auth'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Auth provider wraps everything so all routes can access auth state */}
      <AdminAuthProvider>
        <QueryProvider>
          <App />
        </QueryProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
