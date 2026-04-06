import { NavLink } from 'react-router-dom'
import { AppIcon } from './AppIcon'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../auth/types'

type SidebarProps = {
  mobileOpen: boolean
  desktopHidden: boolean
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Sidebar({ mobileOpen, desktopHidden }: SidebarProps) {
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`
  const { user } = useAuth()
  const role = user?.role ?? 'admin'
  const isStudent = role === 'student'

  return (
    <aside
      id="spmsSidebar"
      className={cx(
        'spms-sidebar d-flex flex-column',
        'spms-sidebar-mobile d-lg-flex',
        mobileOpen && 'show',
        desktopHidden && 'spms-sidebar-desktop-hidden',
      )}
      aria-label="Sidebar navigation"
    >
      <div className="spms-brand">
        <div className="d-flex align-items-center gap-2">
          <AppIcon />
          <div className="min-w-0">
            <div className="fw-bold text-white lh-tight" style={{ fontSize: '.9rem' }}>
              Student Profiling
            </div>
            <div className="text-white-50" style={{ fontSize: '.7rem' }}>
              Management System
            </div>
          </div>
        </div>
      </div>

      <nav className="spms-nav nav flex-column">
        <NavLink className={navClass} to={role === 'admin' ? '/registrar' : role === 'faculty' ? '/faculty' : '/student'} end>
          <i className="bi bi-grid-1x2" /> Dashboard
        </NavLink>
        {isStudent && (
          <NavLink className={navClass} to="/student/medical">
            <i className="bi bi-heart-pulse" /> Medical
          </NavLink>
        )}
        {!isStudent && (
          <>
            <NavLink className={navClass} to="/students">
              <i className="bi bi-people" /> Students
            </NavLink>
            {role === 'faculty' && (
              <>
                <NavLink className={navClass} to="/faculty/violations">
                  <i className="bi bi-exclamation-triangle" /> Violations
                </NavLink>
                <NavLink className={navClass} to="/faculty/achievements">
                  <i className="bi bi-journal-bookmark" /> Achievements
                </NavLink>
                <NavLink className={navClass} to="/faculty/skills">
                  <i className="bi bi-award" /> Skills
                </NavLink>
                <NavLink className={navClass} to="/faculty/sports">
                  <i className="bi bi-dribbble" /> Sports
                </NavLink>
                <NavLink className={navClass} to="/faculty/academic">
                  <i className="bi bi-mortarboard" /> Academic
                </NavLink>
                <NavLink className={navClass} to="/faculty/medical">
                  <i className="bi bi-heart-pulse" /> Medical review
                </NavLink>
              </>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/registrar/records">
                <i className="bi bi-clipboard-check" /> Behavior records
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/users">
                <i className="bi bi-person-badge" /> Faculty
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/sections">
                <i className="bi bi-diagram-3" /> Sections
              </NavLink>
            )}
            {(role === 'admin' || role === 'faculty') && (
              <NavLink className={navClass} to="/reports">
                <i className="bi bi-file-earmark-bar-graph" /> Reports
              </NavLink>
            )}
          </>
        )}
      </nav>

      <div className="mt-auto spms-sidebar-footer">
        <div className="d-flex align-items-center gap-2">
          <img src={avatarUrl} className="rounded-3" width={40} height={40} alt="" />
          <div className="min-w-0">
            <div className="fw-semibold text-white text-truncate" style={{ fontSize: '.85rem' }}>{user?.name ?? 'User'}</div>
            {role === 'student' ? null : <small className="text-white-50">{ROLES[role]}</small>}
          </div>
        </div>
      </div>
    </aside>
  )
}
