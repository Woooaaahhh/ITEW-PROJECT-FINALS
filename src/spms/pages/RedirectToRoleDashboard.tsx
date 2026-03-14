import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultDashboardPath } from '../auth/authService'

/** Redirects / to the role-specific dashboard. */
export function RedirectToRoleDashboard() {
  const { user } = useAuth()
  const to = user ? getDefaultDashboardPath(user.role) : '/login'
  return <Navigate to={to} replace />
}