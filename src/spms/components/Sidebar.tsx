import { NavLink } from 'react-router-dom'
import { AppIcon } from './AppIcon'
import avatarUrl from '../../assets/react.svg'

type SidebarProps = {
  mobileOpen: boolean
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Sidebar({ mobileOpen }: SidebarProps) {
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

  return (
    <aside
      id="spmsSidebar"
      className={cx('spms-sidebar d-flex flex-column', 'spms-sidebar-mobile d-lg-flex', mobileOpen && 'show')}
      aria-label="Sidebar navigation"
    >
      <div className="spms-brand">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <AppIcon />
            <div>
              <div className="fw-bold text-white lh-sm">Student Profiling</div>
              <small className="text-white-50">Management System</small>
            </div>
          </div>
          <span className="badge rounded-pill">SPMS</span>
        </div>
      </div>

      <nav className="spms-nav nav flex-column">
        <NavLink className={navClass} to="/" end>
          <i className="bi bi-grid-1x2" /> Dashboard
        </NavLink>
        <NavLink className={navClass} to="/students">
          <i className="bi bi-people" /> Students
        </NavLink>
        <NavLink className={navClass} to="/students/new">
          <i className="bi bi-person-plus" /> Add Student
        </NavLink>

        <div className="px-3 mt-2">
          <hr className="text-white-50" />
        </div>
        <a className="nav-link" href="javascript:void(0)">
          <i className="bi bi-gear" /> Settings
        </a>
      </nav>

      <div className="mt-auto spms-sidebar-footer">
        <div className="d-flex align-items-center gap-2">
          <img src={avatarUrl} className="rounded-4" width={42} height={42} alt="Admin" />
          <div className="min-w-0">
            <div className="fw-semibold text-white text-truncate">Registrar Admin</div>
            <small>School Office</small>
          </div>
        </div>
      </div>
    </aside>
  )
}

