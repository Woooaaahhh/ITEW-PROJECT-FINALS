import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getBehaviorCountIndex } from '../db/studentRecordsQueries'
import { deleteStudent, listStudents, seedIfEmpty, type Student } from '../db/students'

const yearOptions = ['1st', '2nd', '3rd', '4th']
const sectionOptions = ['BSIT-2A', 'BSBA-1B', 'BSED-3C', 'BSIT-4A']

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function matches(student: Student, q: string, year: string, section: string) {
  const hitQ =
    !q ||
    normalize(fullName(student)).includes(q) ||
    normalize(student.email ?? '').includes(q) ||
    normalize(student.id).includes(q)
  const hitYear = !year || normalize(student.yearLevel ?? '') === year
  const hitSection = !section || normalize(student.section ?? '') === section
  return hitQ && hitYear && hitSection
}

export function StudentsPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [recordsRev, setRecordsRev] = useState(0)
  const canEdit = user?.role === 'admin'
  const canDelete = user?.role === 'admin'
  const showBehaviorCounts = user?.role === 'admin' || user?.role === 'faculty'

  const q = useMemo(() => normalize(query), [query])
  const y = useMemo(() => normalize(year), [year])
  const s = useMemo(() => normalize(section), [section])

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

  useEffect(() => {
    const onRecords = () => setRecordsRev((n) => n + 1)
    window.addEventListener('spms-student-records-changed', onRecords)
    return () => window.removeEventListener('spms-student-records-changed', onRecords)
  }, [])

  const behaviorCounts = useMemo(() => (showBehaviorCounts ? getBehaviorCountIndex() : {}), [showBehaviorCounts, recordsRev])

  const filtered = useMemo(() => students.filter((st) => matches(st, q, y, s)), [students, q, y, s])

  return (
    <div className="spms-card card">
      <div className="card-header">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-lg-5">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-search" />
              </span>
              <input
                className="form-control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or ID..."
              />
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All Year Levels</option>
              {yearOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-lg-3">
            <select className="form-select" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">All Sections</option>
              {sectionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-1 text-lg-end">
            <span className="spms-chip">
              <i className="bi bi-list-check" /> {filtered.length}
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
                <th>Year Level</th>
                <th>Section</th>
                <th>Email</th>
                {showBehaviorCounts ? (
                  <>
                    <th className="text-center">Violations</th>
                    <th className="text-center">Achievements</th>
                  </>
                ) : null}
                <th className="text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="ps-3 py-4" colSpan={showBehaviorCounts ? 7 : 5}>
                    <div className="spms-muted">Loading students...</div>
                  </td>
                </tr>
              ) : null}
              {filtered.map((st) => (
                <tr key={st.id}>
                  <td className="ps-3">
                    <div className="d-flex align-items-center gap-2">
                      <img className="spms-avatar" src={st.profilePictureDataUrl || avatarUrl} alt="Avatar" />
                      <div>
                        <div className="fw-semibold">{fullName(st)}</div>
                        <div className="spms-muted small">ID: {st.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{st.yearLevel ?? '—'}</td>
                  <td>{st.section ?? '—'}</td>
                  <td>{st.email ?? '—'}</td>
                  {showBehaviorCounts ? (
                    <>
                      <td className="text-center">
                        <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                          {behaviorCounts[st.id]?.violations ?? 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge rounded-pill bg-primary-subtle text-primary">
                          {behaviorCounts[st.id]?.achievements ?? 0}
                        </span>
                      </td>
                    </>
                  ) : null}
                  <td className="text-end pe-3">
                    <div className="btn-group">
                      <Link className="btn btn-sm btn-outline-primary" to={`/students/${st.id}`} aria-label="View Profile">
                        <i className="bi bi-eye" />
                      </Link>
                      {canEdit && (
                        <Link className="btn btn-sm btn-outline-secondary" to={`/students/${st.id}/edit`} aria-label="Edit">
                          <i className="bi bi-pencil" />
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          aria-label="Delete"
                          onClick={async () => {
                            const ok = confirm(`Delete ${fullName(st)}?`)
                            if (!ok) return
                            await deleteStudent(st.id)
                            const all = await listStudents()
                            setStudents(all)
                          }}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="ps-3 py-4" colSpan={showBehaviorCounts ? 7 : 5}>
                    <div className="spms-muted">No students matched your filters.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

