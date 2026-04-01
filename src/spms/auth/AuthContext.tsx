/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from './types'
import { getStoredAuth, setStoredAuth, clearStoredAuth, login as doLogin, logout as doLogout } from './authService'
import axios from 'axios'

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<AuthUser>
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const u = getStoredAuth()
    if (u?.token) axios.defaults.headers.common.Authorization = `Bearer ${u.token}`
    else delete axios.defaults.headers.common.Authorization
    return u
  })

  // Ensure axios has auth header on initial load/refresh.
  useEffect(() => {
    if (user?.token) axios.defaults.headers.common.Authorization = `Bearer ${user.token}`
    else delete axios.defaults.headers.common.Authorization
  }, [user])

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u)
    if (u) setStoredAuth(u)
    else clearStoredAuth()
    if (u?.token) axios.defaults.headers.common.Authorization = `Bearer ${u.token}`
    else delete axios.defaults.headers.common.Authorization
  }, [])

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    const u = await doLogin(identifier, password)
    setUserState(u)
    setStoredAuth(u)
    axios.defaults.headers.common.Authorization = `Bearer ${u.token}`
    return u
  }, [])

  const logout = useCallback(() => {
    doLogout()
    setUserState(null)
    delete axios.defaults.headers.common.Authorization
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
