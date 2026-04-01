import type { AuthUser, UserRole } from './types'
import axios from 'axios'

const STORAGE_KEY = 'spms_auth'

export function getStoredAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AuthUser
    if (!data?.token || !data?.role) return null
    // Backward-compat: old builds used role = "registrar"
    if ((data as unknown as { role?: string })?.role === 'registrar') {
      ;(data as unknown as { role: UserRole }).role = 'admin'
    }
    return data
  } catch {
    return null
  }
}

export function setStoredAuth(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY)
}

type ApiLoginResponse = {
  token: string
  user: { user_id: number; username: string; email: string; role: UserRole }
}

/** Real login via backend API. */
export async function login(identifier: string, password: string): Promise<AuthUser> {
  let data: ApiLoginResponse
  try {
    const res = await axios.post<ApiLoginResponse>('/api/login', { identifier, password })
    data = res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      // If there's no response, it's usually a network/server issue (API not running).
      if (!err.response) {
        throw new Error('Cannot reach API server. Start it with: npm run dev:all (or npm run dev:api)')
      }
      // Vite dev proxy returns 5xx when the target (API) is down (ECONNREFUSED).
      if (err.response.status >= 500) {
        throw new Error('API server is not running. Start it with: npm run dev:all (or npm run dev:api)')
      }
      const message = (err.response?.data as { message?: string } | undefined)?.message
      throw new Error(message || 'Invalid username/email or password')
    }
    throw new Error('Login failed. Please try again.')
  }

  const role = data.user.role
  const email = data.user.email
  const name = data.user.username

  let studentId: string | undefined
  if (role === 'student') {
    try {
      const { listStudents } = await import('../db/students')
      const list = await listStudents()
      const found = list.find((s) => (s.email ?? '').toLowerCase() === (email ?? '').toLowerCase())
      studentId = found?.id ?? list[0]?.id
    } catch {
      studentId = undefined
    }
  }

  return {
    token: data.token,
    role,
    name,
    email,
    studentId,
  }
}

export function logout(): void {
  clearStoredAuth()
}

/** Routes that each role can access (path prefix or exact). */
export function getAllowedPaths(role: UserRole): string[] {
  switch (role) {
    case 'admin':
      return ['/', '/registrar', '/students', '/reports']
    case 'faculty':
      return ['/', '/faculty', '/faculty/violations', '/faculty/skills', '/faculty/sports', '/faculty/academic', '/students', '/reports']
    case 'student':
      return ['/', '/student', '/student/academic', '/student/skills', '/student/violations', '/students']
    default:
      return ['/']
  }
}

export function getDefaultDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/registrar'
    case 'faculty':
      return '/faculty'
    case 'student':
      return '/student'
    default:
      return '/'
  }
}

/** Whether the role can access this path (and optionally a specific student id for student role). */
export function canAccessPath(
  role: UserRole,
  pathname: string,
  studentIdFromPath?: string,
  authStudentId?: string,
): boolean {
  const path = pathname.replace(/\/$/, '') || '/'

  if (role === 'admin') {
    return true
  }

  if (role === 'faculty') {
    if (path === '/registrar' || path === '/student' || path.startsWith('/students/new'))
      return false
    if (path.startsWith('/students/') && path.endsWith('/edit')) return false
    if (path.startsWith('/sections')) return false
    return (
      path === '/' ||
      path === '/faculty' ||
      path === '/faculty/violations' ||
      path === '/faculty/skills' ||
      path === '/faculty/sports' ||
      path === '/faculty/academic' ||
      path === '/reports' ||
      path === '/students' ||
      path.startsWith('/students/')
    )
  }

  if (role === 'student') {
    if (path === '/registrar' || path === '/faculty' || path === '/students' || path === '/reports') return false
    if (path.startsWith('/students/new')) return false
    if (path.startsWith('/students/') && path.endsWith('/edit')) return false
    if (path.startsWith('/students/')) {
      if (!studentIdFromPath || !authStudentId) return false
      return studentIdFromPath === authStudentId
    }
    return (
      path === '/' ||
      path === '/student' ||
      path === '/student/academic' ||
      path === '/student/skills' ||
      path === '/student/violations'
    )
  }

  return false
}
