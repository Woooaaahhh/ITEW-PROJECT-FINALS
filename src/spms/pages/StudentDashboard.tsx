/** Client-side routing (React Router): <Link>, useNavigate, useSearchParams (no full page reload). */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { useAuth } from '../auth/AuthContext'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const myStudentId = user?.studentId ?? ''

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (searchParams.get('medical') === '1' && myStudentId) {
      navigate('/medical', { replace: true })
      return
    }
    if (searchParams.get('medical') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('medical')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, myStudentId, navigate, setSearchParams])

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

  return (
    <div className="d-flex flex-column gap-3">
      {user?.role === 'student' && !myStudentId ? (
        <div className="alert alert-warning py-2 small mb-0">
          Your account is not linked to a student profile. Ask an administrator to match your email to a student record.
        </div>
      ) : null}

      {loading ? (
        <div className="spms-card card">
          <div className="card-body spms-muted">Loading students...</div>
        </div>
      ) : null}

      {!loading && students.length === 0 ? (
        <div className="spms-card card">
          <div className="card-body spms-muted">No students to show.</div>
        </div>
      ) : null}

      <div className="row g-3">
        {!loading &&
          students.map((s) => (
            <div key={s.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <div className="spms-card card h-100 position-relative">
                <div className="card-body d-flex flex-column gap-2">
                  <Link
                    to={`/students/${s.id}`}
                    className="text-decoration-none text-body d-flex flex-column align-items-center text-center gap-2 stretched-link"
                  >
                    <img
                      src={s.profilePictureDataUrl || avatarUrl}
                      alt={fullName(s)}
                      className="rounded-circle"
                      width={80}
                      height={80}
                      style={{ objectFit: 'cover', border: '2px solid rgba(15,23,42,.12)' }}
                    />
                    <div className="fw-semibold">{fullName(s)}</div>
                    <div className="spms-muted small">
                      {s.yearLevel ?? '—'} · {s.section ?? '—'}
                    </div>
                    <div className="spms-muted small">{s.email ?? 'No email'}</div>
                    <span className="btn btn-sm btn-outline-primary rounded-4 mt-1">
                      View profile
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
