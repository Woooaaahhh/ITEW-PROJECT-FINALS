import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => {
      return (
        fullName(s).toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.section ?? '').toLowerCase().includes(q) ||
        (s.yearLevel ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, search])

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-card card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="fw-bold">
            <i className="bi bi-people me-2" /> Student Directory
          </div>
          <span className="spms-chip">
            <i className="bi bi-grid-3x3-gap" /> {filtered.length} shown
          </span>
        </div>
        <div className="card-body">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>
            <input
              className="form-control"
              placeholder="Search by name, email, year, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spms-card card">
          <div className="card-body spms-muted">Loading students...</div>
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="spms-card card">
          <div className="card-body spms-muted">No students matched your search.</div>
        </div>
      ) : null}

      <div className="row g-3">
        {filtered.map((s) => (
          <div key={s.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <Link to={`/students/${s.id}`} className="text-decoration-none">
              <div className="spms-card card h-100">
                <div className="card-body d-flex flex-column align-items-center text-center gap-2">
                  <img
                    src={s.profilePictureDataUrl || avatarUrl}
                    alt={fullName(s)}
                    className="rounded-circle"
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', border: '2px solid rgba(15,23,42,.12)' }}
                  />
                  <div className="fw-semibold text-body">{fullName(s)}</div>
                  <div className="spms-muted small">
                    {s.yearLevel ?? '—'} · {s.section ?? '—'}
                  </div>
                  <div className="spms-muted small">{s.email ?? 'No email'}</div>
                  <span className="btn btn-sm btn-outline-primary rounded-4 mt-1">View Info</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
