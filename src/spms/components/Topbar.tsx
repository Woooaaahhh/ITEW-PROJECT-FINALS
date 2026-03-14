import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../auth/types'

type TopbarProps = {
  title: string
  subtitle?: string
  /** Show search bar in header */
  showSearch?: boolean
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  /** Additional right-side content (e.g. Add Student button) */
  right?: React.ReactNode
  onToggleSidebar?: () => void
}

export function Topbar({
  title,
  subtitle,
  showSearch,
  searchPlaceholder = 'Search students...',
  onSearchChange,
  right,
  onToggleSidebar,
}: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearch(v)
    onSearchChange?.(v)
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const role = user?.role ?? 'registrar'

  return (
    <header className="spms-topbar">
      <div className="container-fluid px-3 px-lg-4 py-3">
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                className="btn btn-outline-secondary d-lg-none rounded-3 px-3"
                onClick={onToggleSidebar}
                aria-label="Toggle sidebar"
              >
                <i className="bi bi-list" />
              </button>
            )}
            <div>
              <h1 className="fs-5 fw-bold mb-0 spms-page-title">{title}</h1>
              {subtitle && <p className="spms-muted small mb-0">{subtitle}</p>}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {showSearch && (
              <div className="input-group d-none d-md-flex" style={{ width: 220 }}>
                <span className="input-group-text bg-white border-end-0 rounded-start-3">
                  <i className="bi bi-search text-secondary" />
                </span>
                <input
                  type="search"
                  className="form-control rounded-end-3 border-start-0"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={handleSearch}
                />
              </div>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary rounded-3 position-relative"
              aria-label="Notifications"
            >
              <i className="bi bi-bell" />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary" style={{ fontSize: 10 }}>
                0
              </span>
            </button>

            <div className="dropdown position-relative" ref={dropdownRef}>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <img src={avatarUrl} alt="" width={28} height={28} className="rounded-circle" />
                <span className="d-none d-sm-inline text-start" style={{ maxWidth: 120 }}>{user?.name ?? 'User'}</span>
                <i className="bi bi-chevron-down small" />
              </button>
              <ul
                className={`dropdown-menu dropdown-menu-end shadow rounded-3 border-0 py-2 ${dropdownOpen ? 'show' : ''}`}
                style={{ minWidth: 200, zIndex: 1060 }}
              >
                <li className="px-3 py-2">
                  <div className="fw-semibold">{user?.name ?? 'User'}</div>
                  <div className="spms-muted small">{user?.email}</div>
                  <div className="spms-muted small">{ROLES[role]}</div>
                </li>
                <li><hr className="dropdown-divider my-2" /></li>
                <li>
                  <button type="button" className="dropdown-item rounded-2" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-left me-2" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>

            {right}
          </div>
        </div>
      </div>
    </header>
  )
}
