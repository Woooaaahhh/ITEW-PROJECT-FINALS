import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { AuthUser } from './types'
import { getStoredAuth, setStoredAuth, clearStoredAuth, login as doLogin, logout as doLogout } from './authService'

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<AuthUser>
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => getStoredAuth())

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u)
    if (u) setStoredAuth(u)
    else clearStoredAuth()
  }, [])

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    const u = await doLogin(identifier, password)
    setUserState(u)
    setStoredAuth(u)
    return u
  }, [])

  const logout = useCallback(() => {
    doLogout()
    setUserState(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
      setUser,
    }),
    [user, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
