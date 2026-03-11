type TopbarProps = {
  title: string
  subtitle?: string
  onToggleSidebar: () => void
  right?: React.ReactNode
}

export function Topbar({ title, subtitle, onToggleSidebar, right }: TopbarProps) {
  return (
    <header className="spms-topbar">
      <div className="container-fluid px-3 px-lg-4 py-3">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-primary d-lg-none rounded-4 px-3"
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <i className="bi bi-list" />
            </button>
            <div>
              <div className="fw-bold spms-page-title">{title}</div>
              {subtitle ? <div className="spms-muted small">{subtitle}</div> : null}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 spms-no-print">{right}</div>
        </div>
      </div>
    </header>
  )
}

