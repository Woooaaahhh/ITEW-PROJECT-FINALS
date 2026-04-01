import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { snapshotAllStudentRecords } from '../db/studentRecordsQueries'
import { ensureSeededForDemo } from '../db/studentRecordsSeed'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

export function RegistrarRecordsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [recordsRev, setRecordsRev] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      ensureSeededForDemo(all.map((s) => s.id))
      setStudents(all)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onRecords = () => setRecordsRev((n) => n + 1)
    window.addEventListener('spms-student-records-changed', onRecords)
    return () => window.removeEventListener('spms-student-records-changed', onRecords)
  }, [])

  const q = useMemo(() => normalize(query), [query])

  const rows = useMemo(() => {
    const all = snapshotAllStudentRecords()
    return students.map((s) => {
      const rec = all[s.id] ?? { violations: [], achievements: [] }
      const pendingViolations = rec.violations.filter((v) => v.status.toLowerCase() !== 'resolved').length
      return {
        student: s,
        violations: rec.violations.length,
        achievements: rec.achievements.length,
        pendingViolations,
      }
    })
  }, [students, recordsRev])

  const filtered = useMemo(() => {
    if (!q) return rows
    return rows.filter(
      ({ student: s }) =>
        normalize(fullName(s)).includes(q) ||
        normalize(s.email ?? '').includes(q) ||
        normalize(s.id).includes(q) ||
        normalize(s.section ?? '').includes(q),
    )
  }, [rows, q])

  const totalWithAny = filtered.filter((r) => r.violations > 0 || r.achievements > 0).length

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
        <div className="card-body">
          <h5 className="fw-bold mb-2">Behavior & non-academic records</h5>
          <p className="spms-muted small mb-0">
            Review violation and achievement counts for every student. Open a profile to see full official entries entered by
            faculty.
          </p>
        </div>
      </div>

      <div className="spms-card card">
        <div className="card-header">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  className="form-control"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, ID, or section..."
                />
              </div>
            </div>
            <div className="col-12 col-md-6 text-md-end">
              <span className="spms-chip me-2">
                <i className="bi bi-people" /> {filtered.length} shown
              </span>
              <span className="spms-chip">
                <i className="bi bi-clipboard-data" /> {totalWithAny} with records
              </span>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table spms-table table-hover align-middle mb-0">
              <thead className="border-bottom">
                <tr>
                  <th className="ps-3">Student</th>
                  <th className="text-center">Violations</th>
                  <th className="text-center">Pending</th>
                  <th className="text-center">Achievements</th>
                  <th className="text-end pe-3">Profile</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="ps-3 py-4">
                      <div className="spms-muted">Loading...</div>
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  filtered.map(({ student: s, violations, achievements, pendingViolations }) => (
                    <tr key={s.id}>
                      <td className="ps-3">
                        <div className="fw-semibold">{fullName(s)}</div>
                        <div className="spms-muted small">{s.email ?? '—'}</div>
                        <div className="spms-muted small">ID: {s.id}</div>
                      </td>
                      <td className="text-center">
                        <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">{violations}</span>
                      </td>
                      <td className="text-center">
                        {pendingViolations > 0 ? (
                          <span className="badge rounded-pill bg-danger-subtle text-danger">{pendingViolations}</span>
                        ) : (
                          <span className="spms-muted small">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="badge rounded-pill bg-primary-subtle text-primary">{achievements}</span>
                      </td>
                      <td className="text-end pe-3">
                        <Link to={`/students/${s.id}`} className="btn btn-sm btn-primary rounded-3">
                          <i className="bi bi-person-badge me-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ps-3 py-4">
                      <div className="spms-muted">No students matched your search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
