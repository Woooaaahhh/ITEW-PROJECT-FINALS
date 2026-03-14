import type { ReactNode } from 'react'

type StatCardProps = {
  icon: string
  value: string | number
  description: string
  className?: string
}

export function StatCard({ icon, value, description, className = '' }: StatCardProps) {
  return (
    <div
      className={`spms-card spms-stat-card card h-100 border-0 ${className}`}
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
      <div className="card-body d-flex align-items-start justify-content-between gap-3">
        <div className="flex-grow-1 min-w-0">
          <div className="spms-muted small mb-1">{description}</div>
          <div className="fs-3 fw-bold text-body">{value}</div>
        </div>
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            background: 'rgba(37, 99, 235, .1)',
            color: 'var(--spms-primary)',
          }}
        >
          <i className={`bi ${icon} fs-5`} />
        </div>
      </div>
    </div>
  )
}
