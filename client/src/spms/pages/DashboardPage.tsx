/** Client-side routing (React Router): dashboard links via <Link> (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../auth/types'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function countByYear(students: Student[]) {
  const out: Record<string, number> = { '1st': 0, '2nd': 0, '3rd': 0, '4th': 0 }
  for (const s of students) {
    const y = (s.yearLevel ?? '').toString()
    if (y in out) out[y] += 1
  }
  return out
}

export function DashboardPage() {
  const { user } = useAuth()
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

  const role = user?.role ?? 'admin'
  const byYear = useMemo(() => countByYear(students), [students])
  const recent = useMemo(() => students.slice(0, 5), [students])
  const total = students.length
  const canAddStudent = role === 'admin'
  const isStudent = role === 'student'
  const studentId = user?.role === 'student' ? user.studentId : undefined

  if (isStudent) {
    return (
      <div className="d-flex flex-column gap-3">
        <p className="spms-muted mb-0">
          Welcome, <span className="fw-semibold text-body">{user?.name}</span> · {ROLES[role]}
        </p>
        {studentId ? (
          <div className="spms-card card">
            <div className="card-body text-center py-5">
              <p className="mb-3">View your profile and academic information.</p>
              <Link to={`/students/${studentId}`} className="btn btn-primary rounded-4 px-4">
                <i className="bi bi-person-badge me-2" />
                My Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="spms-card card">
            <div className="card-body">
              <p className="spms-muted small mb-0">
                Your account is not linked to a student record. Contact the admin.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <p className="spms-muted mb-0">
          Welcome, <span className="fw-semibold text-body">{user?.name}</span> · {ROLES[role]}
        </p>
        {canAddStudent && (
          <Link to="/students/new" className="btn btn-primary rounded-4 px-3 btn-sm">
            <i className="bi bi-person-plus me-1" />
            Add Student
          </Link>
        )}
      </div>

      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="spms-card card h-100">
            <div className="card-body">
              <div className="spms-muted small">Total Students</div>
              <div className="fs-3 fw-bold mt-1">{loading ? '—' : total}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-8">
          <div className="spms-card card h-100">
            <div className="card-body">
              <div className="spms-muted small mb-2">By year</div>
              <div className="d-flex flex-wrap gap-3">
                {(['1st', '2nd', '3rd', '4th'] as const).map((y) => (
                  <span key={y} className="fw-semibold">
                    {y}: {loading ? '—' : byYear[y] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="spms-card card">
        <div className="card-header d-flex align-items-center justify-content-between py-2">
          <span className="fw-semibold">Recent</span>
          <Link to="/students" className="btn btn-link btn-sm p-0 text-decoration-none">
            View all
          </Link>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="px-3 py-4 spms-muted small">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="px-3 py-4 spms-muted small">No students yet.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {recent.map((s) => (
                <li key={s.id} className="list-group-item d-flex align-items-center justify-content-between border-0 py-2">
                  <div>
                    <span className="fw-semibold">{fullName(s)}</span>
                    <span className="spms-muted small ms-2">{s.section ?? ''}</span>
                  </div>
                  <Link to={`/students/${s.id}`} className="btn btn-sm btn-outline-primary rounded-4">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
