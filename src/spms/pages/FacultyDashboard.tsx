/** Client-side routing (React Router): faculty dashboard links via <Link> (no full page reload). */
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatCard } from '../components/StatCard'
import { loadFacultyDashboardStatsFast, loadFacultyDashboardAnalytics, type FacultyDashboardData } from '../dashboards/fastDashboardAnalytics'
import { formatStudentRecordDate } from './studentRecordViewUtils'

const FACULTY = {
  accent: '#4f46e5',
  accentSoft: 'rgba(79, 70, 229, 0.12)',
  gradient: 'linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #6366f1 100%)',
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`spms-card card border-0 h-100 ${className}`}
      style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(15, 23, 42, .07)' }}
    >
      <div className="card-body d-flex flex-column">
        <div className="mb-2">
          <h6 className="fw-bold mb-0 text-body">{title}</h6>
          {subtitle ? <p className="spms-muted small mb-0 mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex-grow-1" style={{ minHeight: 280 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function FacultyDashboard() {
  const [statsData, setStatsData] = useState<Partial<FacultyDashboardData> | null>(null)
  const [analyticsData, setAnalyticsData] = useState<Omit<FacultyDashboardData, 'totalStudents' | 'approvedMedical' | 'studentsWithViolations' | 'pendingMedicalCount'> | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  // Load basic stats immediately
  useEffect(() => {
    let alive = true
    ;(async () => {
      setStatsLoading(true)
      setError(null)
      try {
        const stats = await loadFacultyDashboardStatsFast()
        if (alive) {
          setStatsData(stats)
          setStatsLoading(false)
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
          setStatsLoading(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Load detailed analytics after stats are loaded
  useEffect(() => {
    if (!statsLoading && statsData) {
      let alive = true
      ;(async () => {
        setAnalyticsLoading(true)
        try {
          const analytics = await loadFacultyDashboardAnalytics()
          if (alive) {
            setAnalyticsData(analytics)
            setAnalyticsLoading(false)
          }
        } catch (err) {
          if (alive) {
            console.error('Failed to load analytics:', err)
            setAnalyticsLoading(false)
          }
        }
      })()
      return () => {
        alive = false
      }
    }
  }, [statsLoading, statsData])

  // Combine data for display
  const d: FacultyDashboardData | null = statsData && analyticsData ? {
    ...statsData,
    ...analyticsData,
  } as FacultyDashboardData : null

  const isLoading = statsLoading || analyticsLoading

  return (
    <div className="d-flex flex-column gap-4">
      <div
        className="text-white rounded-4 overflow-hidden position-relative"
        style={{
          background: FACULTY.gradient,
          boxShadow: '0 12px 40px rgba(49, 46, 129, .35)',
        }}
      >
        <div className="position-absolute top-0 end-0 opacity-25 d-none d-md-block" aria-hidden style={{ fontSize: 180, lineHeight: 1, transform: 'translate(10%, -20%)' }}>
          <i className="bi bi-easel" />
        </div>
        <div className="p-4 p-md-5 position-relative">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <p className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ letterSpacing: '.12em' }}>
                Faculty workspace
              </p>
              <h1 className="h3 fw-bold mb-2">Monitoring &amp; decisions</h1>
              <p className="text-white text-opacity-90 mb-0 small" style={{ maxWidth: 520 }}>
                Live view of clearance, academics, and skills — prioritize reviews without hunting through menus.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <Link
                to="/medical"
                className="btn btn-light btn-sm rounded-pill px-3 fw-semibold shadow-sm"
                style={{ color: FACULTY.accent }}
              >
                <i className="bi bi-heart-pulse me-1" />
                Medical queue
              </Link>
              <Link to="/faculty/academic" className="btn btn-outline-light btn-sm rounded-pill px-3 border-white border-opacity-40">
                Academics
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="h6 text-secondary fw-semibold mb-3">Summary</h2>
        <div className="row g-3">
          <div className="col-6 col-xl-3">
            <StatCard
              icon="bi-people-fill"
              value={statsLoading ? '—' : (statsData?.totalStudents ?? 0)}
              description="Total students"
              iconBg={FACULTY.accentSoft}
              iconColor={FACULTY.accent}
            />
          </div>
          <div className="col-6 col-xl-3">
            <StatCard
              icon="bi-heart-pulse-fill"
              value={statsLoading ? '—' : (statsData?.approvedMedical ?? 0)}
              description="Approved medical"
              iconBg="rgba(16, 185, 129, 0.15)"
              iconColor="#059669"
            />
          </div>
          <div className="col-6 col-xl-3">
            <StatCard
              icon="bi-exclamation-triangle-fill"
              value={statsLoading ? '—' : (statsData?.studentsWithViolations ?? 0)}
              description="Students with violations"
              iconBg="rgba(245, 158, 11, 0.18)"
              iconColor="#d97706"
            />
          </div>
          <div className="col-6 col-xl-3">
            <StatCard
              icon="bi-hourglass-split"
              value={statsLoading ? '—' : (statsData?.pendingMedicalCount ?? 0)}
              description="Medical pending review"
              iconBg="rgba(234, 179, 8, 0.2)"
              iconColor="#ca8a04"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="h6 text-secondary fw-semibold mb-3">Qualification insights</h2>
        <div className="row g-3">
          {[
            {
              label: 'Programming track',
              value: d?.qualifiedProgramming ?? 0,
              hint: 'At least one programming skill assigned',
              icon: 'bi-code-slash',
            },
            {
              label: 'Sports try-out ready',
              value: d?.qualifiedSportsTryout ?? 0,
              hint: 'Cleared medically + sport on file',
              icon: 'bi-trophy',
            },
            {
              label: 'Academic competitions',
              value: d?.qualifiedAcademic ?? 0,
              hint: 'At least one academic-category skill',
              icon: 'bi-journal-richtext',
            },
          ].map((q) => (
            <div key={q.label} className="col-12 col-md-4">
              <div
                className="spms-card card border-0 h-100"
                style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
              >
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 48, height: 48, background: FACULTY.accentSoft, color: FACULTY.accent }}
                    >
                      <i className={`bi ${q.icon} fs-5`} />
                    </div>
                    <div className="min-w-0">
                      <div className="spms-muted small">{q.label}</div>
                      <div className="fs-3 fw-bold">{analyticsLoading ? '—' : q.value}</div>
                      <div className="spms-muted small text-truncate">{q.hint}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h6 text-secondary fw-semibold mb-3">Analytics</h2>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <ChartCard title="Academic performance overview" subtitle="Latest-term GWA distribution (Philippine scale).">
              {analyticsLoading || !d ? (
                <div className="spms-muted small d-flex align-items-center justify-content-center h-100">Loading chart…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={undefined}>
                  <BarChart data={d.gwaDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                    <Tooltip />
                    <Bar dataKey="count" name="Students" fill={FACULTY.accent} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="col-12 col-lg-6">
            <ChartCard title="Top students by latest GWA" subtitle="Lower GWA is stronger. Includes skill assignment count.">
              {analyticsLoading || !d ? (
                <div className="spms-muted small d-flex align-items-center justify-content-center h-100">Loading…</div>
              ) : d.topByGwa.length === 0 ? (
                <p className="spms-muted small mb-0">No academic records yet — add terms under Faculty → Academic.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="spms-muted small">
                      <tr>
                        <th>Student</th>
                        <th className="text-end">GWA</th>
                        <th className="text-end">Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.topByGwa.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <Link to={`/students/${row.id}`} className="fw-semibold text-decoration-none">
                              {row.name}
                            </Link>
                          </td>
                          <td className="text-end font-monospace">{row.gwa.toFixed(2)}</td>
                          <td className="text-end">{row.skillCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      </section>

      <section>
        <h2 className="h6 text-secondary fw-semibold mb-3">Medical — pending approval</h2>
        <div
          className="spms-card card border-0"
          style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(15, 23, 42, .07)' }}
        >
          <div className="card-body p-0">
            {isLoading || !d ? (
              <div className="p-4 spms-muted small">Loading…</div>
            ) : d.pendingMedicalRows.length === 0 ? (
              <div className="p-4 spms-muted small mb-0">No submissions waiting for review. Great job staying on top of the queue.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Student</th>
                      <th>Submitted</th>
                      <th className="text-end pe-4">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.pendingMedicalRows.map((row) => (
                      <tr key={row.id}>
                        <td className="ps-4">
                          <Link to={`/students/${row.id}#medical-clearance`} className="fw-semibold text-decoration-none">
                            {row.name}
                          </Link>
                        </td>
                        <td className="spms-muted small">
                          {row.submittedAt ? formatStudentRecordDate(row.submittedAt.slice(0, 10)) : '—'}
                        </td>
                        <td className="text-end pe-4">
                          <Link to="/medical" className="btn btn-sm btn-outline-primary rounded-pill">
                            Review in Medical
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
