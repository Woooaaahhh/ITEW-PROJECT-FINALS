export type UserRole = 'admin' | 'faculty' | 'student'

export type AuthUser = {
  token: string
  role: UserRole
  name: string
  email: string
  /** Only set when role is student; links to student record id in IndexedDB */
  studentId?: string
}

export const ROLES: Record<UserRole, string> = {
  admin: 'Admin',
  faculty: 'Faculty',
  student: 'Student',
}
