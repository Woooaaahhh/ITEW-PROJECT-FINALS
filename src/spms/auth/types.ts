export type UserRole = 'registrar' | 'faculty' | 'student'

export type AuthUser = {
  token: string
  role: UserRole
  name: string
  email: string
  /** Only set when role is student; links to student record id in IndexedDB */
  studentId?: string
}

export const ROLES: Record<UserRole, string> = {
  registrar: 'Registrar',
  faculty: 'Faculty',
  student: 'Student',
}
