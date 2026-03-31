import { useEffect, useMemo, useState } from 'react'
import { Outlet, useMatches, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BreadcrumbNav } from './BreadcrumbNav'

export type PageMeta = {
  title: string
  subtitle?: string
  right?: React.ReactNode
  showSearch?: boolean
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const matches = useMatches()
  const meta = (matches[matches.length - 1]?.handle as PageMeta | undefined) ?? { title: 'SPMS' }

  const headerRight =
    location.pathname === '/students' && user?.role !== 'admin' ? null : meta.right

  const overlayClass = useMemo(() => `spms-overlay${mobileOpen ? ' show' : ''}`, [mobileOpen])
  const showSearch = meta.showSearch === true

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 992) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <div className={overlayClass} onClick={() => setMobileOpen(false)} />
      <div className={`spms-app${desktopSidebarHidden ? ' sidebar-hidden' : ''}`}>
        <Sidebar mobileOpen={mobileOpen} desktopHidden={desktopSidebarHidden} />
        <main className="spms-main">
          <Topbar
            title={meta.title}
            subtitle={meta.subtitle}
            showSearch={showSearch}
            searchPlaceholder="Search students..."
            right={headerRight}
            onToggleSidebar={() => {
              if (window.innerWidth >= 992) {
                setDesktopSidebarHidden((v) => !v)
                setMobileOpen(false)
                return
              }
              setMobileOpen((v) => !v)
            }}
          />

          <section className="spms-content">
            <div className="container-fluid">
              <BreadcrumbNav />
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

