type SkillCardProps = {
  name: string
  levelOrDescription: string
  dateAdded: string
  icon?: string
}

export function SkillCard({ name, levelOrDescription, dateAdded, icon = 'bi-award' }: SkillCardProps) {
  return (
    <div
      className="spms-card card border-0 h-100"
      style={{
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(15, 23, 42, .06)',
        transition: 'box-shadow .2s ease, transform .2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(15, 23, 42, .1)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, .06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div className="card-body">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
          style={{
            width: 40,
            height: 40,
            background: 'rgba(37, 99, 235, .1)',
            color: 'var(--spms-primary)',
          }}
        >
          <i className={`bi ${icon}`} />
        </div>
        <div className="fw-semibold mb-1">{name}</div>
        <div className="spms-muted small mb-2">{levelOrDescription}</div>
        <div className="spms-muted" style={{ fontSize: '.75rem' }}>{dateAdded}</div>
      </div>
    </div>
  )
}
