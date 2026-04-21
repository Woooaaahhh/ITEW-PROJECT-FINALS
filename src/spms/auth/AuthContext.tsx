/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from './types'
import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  login as doLogin,
  logout as doLogout,
} from './authService'
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

  // If the backend rejects the stored JWT (common in dev after restarts),
  // automatically clear auth and send the user back to login.
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      (err: unknown) => {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status
          const message = (err.response?.data as { message?: string } | undefined)?.message
          const url = String(err.config?.url || '')
          const isAuthCall = url.includes('/api/login') || url.includes('/api/user')
          if (!isAuthCall && status === 401 && (message === 'Invalid token' || message === 'Missing token')) {
            doLogout()
            setUserState(null)
            delete axios.defaults.headers.common.Authorization
            // Avoid React Router hook usage here; this runs outside route components.
            window.location.assign('/login')
          }
        }
        return Promise.reject(err)
      },
    )
    return () => axios.interceptors.response.eject(interceptorId)
  }, [])

  // Ensure axios has auth header on initial load/refresh.
  useEffect(() => {
    if (user?.token) axios.defaults.headers.common.Authorization = `Bearer ${user.token}`
    else delete axios.defaults.headers.common.Authorization
  }, [user])

  // After refresh, stored auth may still have a wrong `studentId` from an old client bug; sync from API.
  useEffect(() => {
    if (!user?.token || user.role !== 'student') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await axios.get<{ user: { student_id?: number | null } }>('/api/user')
        const sid = res.data.user?.student_id
        if (cancelled || sid == null || Number.isNaN(Number(sid))) return
        const nextId = String(sid)
        setUserState((prev) => {
          if (!prev?.token || prev.role !== 'student') return prev
          if (prev.studentId === nextId) return prev
          const updated = { ...prev, studentId: nextId }
          setStoredAuth(updated)
          return updated
        })
      } catch {
        /* invalid session or offline */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.token, user?.role])

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
