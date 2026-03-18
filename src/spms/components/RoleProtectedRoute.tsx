import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { canAccessPath, getDefaultDashboardPath } from '../auth/authService'
import type { UserRole } from '../auth/types'

type RoleProtectedRouteProps = {
  children: React.ReactNode
  /** Roles that can access this route */
  allowedRoles: UserRole[]
}

/**
 * Protects routes by role. Redirects to login if not authenticated,
 * or to the user's default dashboard if role is not allowed.
 * For Student role, /students/:id is only allowed when :id === user.studentId.
 */
export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  const studentIdFromPath = useMemo(() => {
    const match = pathname.match(/^\/students\/([^/]+)/)
    return match ? match[1] : undefined
  }, [pathname])

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: pathname }} replace />
  }

  const allowed = canAccessPath(
    user.role,
    pathname,
    studentIdFromPath,
    user.studentId,
  )

  if (!allowed) {
    const to = getDefaultDashboardPath(user.role)
    return <Navigate to={to} replace />
  }

  const roleAllowed = allowedRoles.includes(user.role)
  if (!roleAllowed) {
    const to = getDefaultDashboardPath(user.role)
    return <Navigate to={to} replace />
  }

  if (user.role === 'student' && studentIdFromPath && user.studentId !== studentIdFromPath) {
    return <Navigate to="/student" replace />
  }

  return <>{children}</>
}
