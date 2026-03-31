import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { StatCard } from '../components/StatCard'
import { StudentTable } from '../components/StudentTable'

export function FacultyDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const total = students.length
  // Placeholder counts until violations/skills data is implemented
  const withViolations = 0
  const withSkills = 0
  const lastUpdated = students[0]?.updatedAt
    ? new Date(students[0].updatedAt).toLocaleDateString(undefined, { dateStyle: 'short' })
    : '—'

  const quickActions = [
    { to: '/students', icon: 'bi-people', label: 'View Student List', desc: 'Browse all students' },
    { to: '/faculty/violations', icon: 'bi-exclamation-triangle', label: 'Violations', desc: 'Record behavior incidents' },
    { to: '/faculty/achievements', icon: 'bi-journal-bookmark', label: 'Achievements', desc: 'Record non-academic wins' },
    { to: '/faculty/skills', icon: 'bi-award', label: 'Assign Student Skill', desc: 'Add student skill' },
  ]

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-9">
        <section className="mb-4">
          <h6 className="text-secondary fw-semibold mb-3">Overview</h6>
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-people-fill"
                value={loading ? '—' : total}
                description="Total Students"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-exclamation-triangle"
                value={loading ? '—' : withViolations}
                description="Students With Violations"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-award"
                value={loading ? '—' : withSkills}
                description="Students With Skills"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-clock-history"
                value={lastUpdated}
                description="Recently Updated Records"
              />
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h6 className="text-secondary fw-semibold mb-3">Quick Actions</h6>
          <div className="row g-3">
            {quickActions.map((a) => (
              <div key={a.to} className="col-6 col-lg-4">
                <Link
                  to={a.to}
                  className="spms-card card border-0 text-decoration-none text-body h-100 d-block"
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
                  <div className="card-body text-center py-4">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
                      style={{ width: 44, height: 44, background: 'rgba(37, 99, 235, .1)', color: 'var(--spms-primary)' }}
                    >
                      <i className={`bi ${a.icon} fs-5`} />
                    </div>
                    <div className="fw-semibold small">{a.label}</div>
                    <div className="spms-muted" style={{ fontSize: '.75rem' }}>{a.desc}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h6 className="text-secondary fw-semibold mb-3">Student Records</h6>
          <StudentTable students={students} loading={loading} showStatusColumn />
        </section>
      </div>

      <div className="col-12 col-xl-3">
        <div
          className="spms-card card border-0 sticky-top"
          style={{ top: 80, zIndex: 1010, borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
        >
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Quick Actions</h6>
            <div className="d-grid gap-2">
              <Link to="/faculty/violations" className="btn btn-primary rounded-3 py-2 text-start">
                <i className="bi bi-exclamation-triangle me-2" />
                Record violation
              </Link>
              <Link to="/faculty/achievements" className="btn btn-outline-primary rounded-3 py-2 text-start">
                <i className="bi bi-journal-bookmark me-2" />
                Record achievement
              </Link>
              <Link to="/faculty/skills" className="btn btn-outline-primary rounded-3 py-2 text-start">
                <i className="bi bi-award me-2" />
                Add Student Skill
              </Link>
              <Link to="/students" className="btn btn-outline-secondary rounded-3 py-2 text-start">
                <i className="bi bi-person-badge me-2" />
                View Student Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
