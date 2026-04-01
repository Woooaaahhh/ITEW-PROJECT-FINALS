import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

type Crumb = {
  label: string
  to?: string
  icon?: string
}

function dashboardPathForRole(role: string | undefined) {
  if (role === 'faculty') return '/faculty'
  if (role === 'student') return '/student'
  return '/registrar'
}

function buildCrumbs(pathname: string, role: string | undefined): Crumb[] {
  const dashboardPath = dashboardPathForRole(role)

  if (pathname === '/registrar' || pathname === '/faculty' || pathname === '/student' || pathname === '/') {
    return [{ label: 'Dashboard', icon: 'bi bi-grid-1x2' }]
  }

  if (pathname === '/students') {
    return [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Student List', icon: 'bi bi-people' },
    ]
  }

  if (pathname.startsWith('/students/') && pathname.endsWith('/edit')) {
    return [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Student List', to: '/students', icon: 'bi bi-people' },
      { label: 'Student Profile', to: pathname.replace(/\/edit$/, ''), icon: 'bi bi-person-badge' },
      { label: 'Edit Profile', icon: 'bi bi-pencil-square' },
    ]
  }

  if (pathname.startsWith('/students/')) {
    if (role === 'student') {
      return [
        { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
        { label: 'Student Profile', icon: 'bi bi-person-badge' },
      ]
    }
    return [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Student List', to: '/students', icon: 'bi bi-people' },
      { label: 'Student Profile', icon: 'bi bi-person-badge' },
    ]
  }

  const known: Record<string, Crumb[]> = {
    '/reports': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Reports', icon: 'bi bi-file-earmark-bar-graph' },
    ],
    '/faculty/violations': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Violations', icon: 'bi bi-exclamation-triangle' },
    ],
    '/faculty/skills': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Skills', icon: 'bi bi-award' },
    ],
    '/faculty/sports': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Sports', icon: 'bi bi-dribbble' },
    ],
    '/faculty/academic': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Academic', icon: 'bi bi-mortarboard' },
    ],
    '/student/academic': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Academic History', icon: 'bi bi-journal-text' },
    ],
    '/student/skills': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Skills', icon: 'bi bi-award' },
    ],
    '/student/violations': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Violations', icon: 'bi bi-exclamation-triangle' },
    ],
    '/users': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Faculty', icon: 'bi bi-person-badge' },
    ],
    '/sections': [
      { label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' },
      { label: 'Sections', icon: 'bi bi-diagram-3' },
    ],
  }

  return known[pathname] ?? [{ label: 'Dashboard', to: dashboardPath, icon: 'bi bi-grid-1x2' }]
}

export function BreadcrumbNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const crumbs = buildCrumbs(pathname, user?.role)

  return (
    <nav aria-label="breadcrumb" className="spms-breadcrumb-wrap">
      <ol className="breadcrumb spms-breadcrumb mb-0">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li
              key={`${crumb.label}-${idx}`}
              className={`breadcrumb-item${isLast ? ' active' : ''}`}
              aria-current={isLast ? 'page' : undefined}
            >
              {isLast || !crumb.to ? (
                <span className="d-inline-flex align-items-center gap-1">
                  {crumb.icon ? <i className={crumb.icon} /> : null}
                  <span>{crumb.label}</span>
                </span>
              ) : (
                <Link to={crumb.to} className="d-inline-flex align-items-center gap-1 text-decoration-none">
                  {crumb.icon ? <i className={crumb.icon} /> : null}
                  <span>{crumb.label}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
