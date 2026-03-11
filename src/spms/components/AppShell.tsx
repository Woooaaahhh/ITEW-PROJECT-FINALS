import { useEffect, useMemo, useState } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export type PageMeta = {
  title: string
  subtitle?: string
  right?: React.ReactNode
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const matches = useMatches()
  const meta = (matches[matches.length - 1]?.handle as PageMeta | undefined) ?? { title: 'SPMS' }

  const overlayClass = useMemo(() => `spms-overlay${mobileOpen ? ' show' : ''}`, [mobileOpen])

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
      <div className="spms-app">
        <Sidebar mobileOpen={mobileOpen} />
        <main className="spms-main">
          <header className="spms-topbar">
            <div className="container-fluid px-3 px-lg-4 py-3">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-outline-primary d-lg-none rounded-4 px-3"
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle sidebar"
                  >
                    <i className="bi bi-list" />
                  </button>
                  <div>
                    <div className="fw-bold spms-page-title">{meta.title}</div>
                    {meta.subtitle ? <div className="spms-muted small">{meta.subtitle}</div> : null}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 spms-no-print">{meta.right}</div>
              </div>
            </div>
          </header>

          <section className="spms-content">
            <div className="container-fluid">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </>
  )
}

