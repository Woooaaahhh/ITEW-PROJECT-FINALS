export type ActivityItem = {
  text: string
  date: string
  icon?: string
}

type ActivityFeedProps = {
  items: ActivityItem[]
  emptyMessage?: string
}

export function ActivityFeed({ items, emptyMessage = 'No recent activity.' }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div
        className="spms-card card border-0"
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
      >
        <div className="card-body">
          <p className="spms-muted small mb-0">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="spms-card card border-0 overflow-hidden"
      style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
    >
      <div className="card-header bg-transparent border-bottom px-4 py-3">
        <h6 className="fw-semibold mb-0">Recent Activity</h6>
      </div>
      <div className="card-body py-0">
        <ul className="list-unstyled mb-0">
          {items.map((item, i) => (
            <li
              key={i}
              className={`d-flex align-items-start gap-3 py-3 ${i < items.length - 1 ? 'border-bottom border-secondary border-opacity-25' : ''}`}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: 'rgba(37, 99, 235, .1)',
                  color: 'var(--spms-primary)',
                }}
              >
                <i className={`bi ${item.icon ?? 'bi-activity'} small`} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <div className="small">{item.text}</div>
                <div className="spms-muted" style={{ fontSize: '.75rem' }}>{item.date}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
