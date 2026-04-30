/** SPA entry: mounts the React app; client-side routing (no full reload) is wired in App via React Router. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import { AuthProvider } from './spms/auth/AuthContext'
import App from './App.tsx'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
