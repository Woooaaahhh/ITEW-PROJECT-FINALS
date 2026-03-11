import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function countByYear(students: Student[]) {
  const out: Record<string, number> = { '1st': 0, '2nd': 0, '3rd': 0, '4th': 0, Other: 0 }
  for (const s of students) {
    const y = (s.yearLevel ?? '').toString()
    if (y in out) out[y] += 1
    else out.Other += 1
  }
  return out
}

export function DashboardPage() {
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
  const byYear = useMemo(() => countByYear(students), [students])
  const lastUpdated = useMemo(() => students[0]?.updatedAt, [students])
  const recent = useMemo(() => students.slice(0, 5), [students])

  const kpis = useMemo(
    () => [
      { label: 'Total Students', value: total, icon: 'bi-people-fill', hint: 'Profiles stored in IndexedDB' },
      { label: 'With Email', value: students.filter((s) => !!s.email).length, icon: 'bi-envelope', hint: 'Reachable records' },
      { label: 'With Section', value: students.filter((s) => !!s.section).length, icon: 'bi-diagram-3', hint: 'Assigned section' },
      { label: 'Recently Updated', value: lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '—', icon: 'bi-clock-history', hint: 'Latest activity' },
    ],
    [lastUpdated, students, total],
  )

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        {kpis.map((k) => (
          <div className="col-12 col-md-6 col-xl-3" key={k.label}>
            <div className="spms-card card h-100">
              <div className="card-body">
                <div className="spms-kpi">
                  <div>
                    <div className="value">{loading ? '…' : k.value}</div>
                    <div className="label">{k.label}</div>
                    <div className="spms-muted small">{k.hint}</div>
                  </div>
                  <div className="icon">
                    <i className={`bi ${k.icon}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <div className="spms-card card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">Students by Year Level</div>
              <span className="spms-chip">
                <i className="bi bi-bar-chart" /> Summary
              </span>
            </div>
            <div className="card-body">
              {(['1st', '2nd', '3rd', '4th'] as const).map((y) => {
                const count = byYear[y] ?? 0
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div className="mb-3" key={y}>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div className="fw-semibold">{y} Year</div>
                      <div className="spms-muted small">
                        {count} ({pct}%)
                      </div>
                    </div>
                    <div className="progress" style={{ height: 10, borderRadius: 999 }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
              {byYear.Other ? (
                <div className="spms-muted small">Other year levels: {byYear.Other}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="spms-card card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">Quick Actions</div>
              <span className="spms-chip">
                <i className="bi bi-lightning-charge" /> Student Management
              </span>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/students/new" className="btn btn-primary rounded-4 py-3 text-start">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold">Add Student</div>
                      <div className="small opacity-75">Create a new student profile</div>
                    </div>
                    <i className="bi bi-chevron-right" />
                  </div>
                </Link>
                <Link to="/students" className="btn btn-outline-primary rounded-4 py-3 text-start">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold">View Student List</div>
                      <div className="small spms-muted">Search and edit profiles</div>
                    </div>
                    <i className="bi bi-chevron-right" />
                  </div>
                </Link>
              </div>
              <div className="spms-muted small mt-3">
                Dashboard is limited to the current milestone: Student Profile Management.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="spms-card card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="fw-bold">Recently Updated Students</div>
          <Link to="/students" className="btn btn-outline-primary rounded-4 btn-sm px-3">
            View all <i className="bi bi-arrow-right ms-1" />
          </Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table spms-table table-hover mb-0 align-middle">
              <thead className="border-bottom">
                <tr>
                  <th className="ps-3">Student</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th className="text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="ps-3 py-4" colSpan={4}>
                      <div className="spms-muted">Loading...</div>
                    </td>
                  </tr>
                ) : null}
                {!loading && recent.length === 0 ? (
                  <tr>
                    <td className="ps-3 py-4" colSpan={4}>
                      <div className="spms-muted">No students yet. Add one to get started.</div>
                    </td>
                  </tr>
                ) : null}
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-3">
                      <div className="fw-semibold">{fullName(s)}</div>
                      <div className="spms-muted small">{s.email || '—'}</div>
                    </td>
                    <td>{s.yearLevel || '—'}</td>
                    <td>{s.section || '—'}</td>
                    <td className="text-end pe-3">
                      <Link to={`/students/${s.id}`} className="btn btn-sm btn-primary rounded-4 px-3">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

