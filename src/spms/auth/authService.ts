import type { AuthUser, UserRole } from './types'

const STORAGE_KEY = 'spms_auth'

export function getStoredAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AuthUser
    if (!data?.token || !data?.role) return null
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

/** Mock login: validates credentials and returns user with role. Replace with real API call. */
export async function login(identifier: string, password: string): Promise<AuthUser> {
  await new Promise((r) => setTimeout(r, 600))

  const id = identifier.trim().toLowerCase()
  const pwd = password

  // Demo credentials (replace with backend validation)
  if (id === 'registrar@spms.edu' && pwd === 'reg123') {
    return {
      token: `tk_reg_${Date.now()}`,
      role: 'registrar',
      name: 'Registrar Admin',
      email: 'registrar@spms.edu',
    }
  }
  if (id === 'faculty@spms.edu' && pwd === 'faculty123') {
    return {
      token: `tk_fac_${Date.now()}`,
      role: 'faculty',
      name: 'Faculty User',
      email: 'faculty@spms.edu',
    }
  }
  if (id === 'student@spms.edu' && pwd === 'student123') {
    let studentId: string | undefined
    try {
      const { listStudents } = await import('../db/students')
      const list = await listStudents()
      const found = list.find((s) => (s.email ?? '').toLowerCase() === 'student@spms.edu')
      studentId = found?.id ?? list[0]?.id
    } catch {
      studentId = undefined
    }
    return {
      token: `tk_stu_${Date.now()}`,
      role: 'student',
      name: 'Student User',
      email: 'student@spms.edu',
      studentId: studentId ?? 'demo-student-id',
    }
  }

  throw new Error('Invalid email/username or password.')
}

export function logout(): void {
  clearStoredAuth()
}

/** Routes that each role can access (path prefix or exact). */
export function getAllowedPaths(role: UserRole): string[] {
  switch (role) {
    case 'registrar':
      return ['/', '/registrar', '/students', '/reports']
    case 'faculty':
      return ['/', '/faculty', '/students']
    case 'student':
      return ['/', '/student', '/students']
    default:
      return ['/']
  }
}

export function getDefaultDashboardPath(role: UserRole): string {
  switch (role) {
    case 'registrar':
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

  if (role === 'registrar') {
    return true
  }

  if (role === 'faculty') {
    if (path === '/registrar' || path === '/student' || path.startsWith('/students/new'))
      return false
    if (path.startsWith('/students/') && path.endsWith('/edit')) return false
    return (
      path === '/' ||
      path === '/faculty' ||
      path.startsWith('/faculty/') ||
      path === '/students' ||
      path.startsWith('/students/')
    )
  }

  if (role === 'student') {
    if (path === '/registrar' || path === '/faculty' || path === '/students' || path === '/reports') return false
    if (path.startsWith('/students/new')) return false
    if (path.startsWith('/students/') && path.endsWith('/edit')) return false
    if (path.startsWith('/students/')) {
      const id = studentIdFromPath ?? path.replace('/students/', '').replace(/\/edit$/, '')
      return id === authStudentId
    }
    return path === '/' || path === '/student'
  }

  return false
}
