/** Client-side routing (React Router): legacy URLs redirect with <Navigate> (no full page reload). */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getDefaultDashboardPath } from '../auth/authService'

/** Old /student/* URLs now resolve to the unified profile at /students/:id */
export function StudentLegacyProfileRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'student') return <Navigate to={getDefaultDashboardPath(user.role)} replace />
  const id = user.studentId
  if (!id) return <Navigate to="/student" replace />
  return <Navigate to={`/students/${id}`} replace />
}
