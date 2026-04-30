  /** Client-side routing (React Router): student list links via <Link> (no full page reload). */
  import { useCallback, useEffect, useMemo, useState } from 'react'
  import avatarUrl from '../../assets/react.svg'
  import { useAuth } from '../auth/AuthContext'
  import { Link } from 'react-router-dom'
  import { deleteStudent, listStudents, seedIfEmpty } from '../db/students'
  import { getBehaviorCountIndex } from '../db/studentRecordsQueries'
  import type { Student } from '../db/students'

  const yearOptions = ['1st', '2nd', '3rd', '4th']

  function normalize(s: string) {
    return s.toLowerCase().trim()
  }

  function normalizeYear(value: string) {
    return normalize(value).replace(/\s*year$/, '')
  }

  function normalizeSection(value: string) {
    return normalize(value).replace(/[^a-z0-9]/g, '')
  }

  function fullName(s: Student) {
    const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
    return parts.replace(/\s+/g, ' ').trim()
  }

  function matches(student: Student, q: string, year: string, section: string) {
    const searchable = [
      fullName(student),
      student.email ?? '',
      student.id,
      student.yearLevel ?? '',
      student.section ?? '',
    ]
      .map((v) => normalize(v))
      .join(' ')

    const tokens = q.split(/\s+/).filter(Boolean)
    const hitQ = tokens.length === 0 || tokens.every((token) => searchable.includes(token))
    const hitYear = !year || normalizeYear(student.yearLevel ?? '') === normalizeYear(year)
    const hitSection = !section || normalizeSection(student.section ?? '') === normalizeSection(section)
    return hitQ && hitYear && hitSection
  }

  export function StudentsPage() {
    const { user } = useAuth()
  // Controlled input (Part 5): this state is the single source of truth for the search textbox.
    const [query, setQuery] = useState('')
    const [year, setYear] = useState('')
    const [section, setSection] = useState('')
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [recordsRev, setRecordsRev] = useState(0)
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const studentsPerPage = 50
    const canEdit = user?.role === 'admin'
    const canDelete = user?.role === 'admin'
    const showBehaviorCounts = user?.role === 'admin' || user?.role === 'faculty'

    const q = useMemo(() => normalize(query), [query])
    const y = useMemo(() => normalize(year), [year])
    const s = useMemo(() => normalize(section), [section])

    const sectionOptions = useMemo(() => {
      const uniq = Array.from(new Set(students.map((st) => (st.section ?? '').trim()).filter(Boolean)))
      return uniq.sort((a, b) => a.localeCompare(b))
    }, [students])

    const loadStudents = useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        await seedIfEmpty()
        const all = await listStudents()
        setStudents(all)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load students.')
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      void loadStudents()
    }, [loadStudents])

    useEffect(() => {
      const onRecords = () => setRecordsRev((n) => n + 1)
      const onStudentsChanged = () => {
        void loadStudents()
      }
      const onFocus = () => {
        void loadStudents()
      }
      window.addEventListener('spms-student-records-changed', onRecords)
      window.addEventListener('spms-students-changed', onStudentsChanged)
      window.addEventListener('focus', onFocus)
      return () => {
        window.removeEventListener('spms-student-records-changed', onRecords)
        window.removeEventListener('spms-students-changed', onStudentsChanged)
        window.removeEventListener('focus', onFocus)
      }
    }, [loadStudents])

    const behaviorCounts = useMemo(() => (showBehaviorCounts ? getBehaviorCountIndex() : {}), [showBehaviorCounts, recordsRev])

    const filtered = useMemo(() => students.filter((st) => matches(st, q, y, s)), [students, q, y, s])

    // Pagination calculations
    const totalPages = useMemo(() => Math.ceil(filtered.length / studentsPerPage), [filtered.length, studentsPerPage])
    
    const paginatedStudents = useMemo(() => {
      const startIndex = (currentPage - 1) * studentsPerPage
      const endIndex = startIndex + studentsPerPage
      return filtered.slice(startIndex, endIndex)
    }, [filtered, currentPage, studentsPerPage])

    // Reset to page 1 when filters change
    useEffect(() => {
      setCurrentPage(1)
    }, [q, y, s])

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
                // Controlled input (Part 5): `value` reads from state...
                value={query}
                // ...and `onChange` writes back to state.
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
              {!loading && error ? (
                <tr>
                  <td className="ps-3 py-4" colSpan={showBehaviorCounts ? 7 : 5}>
                    <div className="text-danger mb-2">{error}</div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void loadStudents()}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : null}
              {paginatedStudents.map((st) => (
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
                          onClick={() => {
                            void (async () => {
                              const ok = confirm(`Delete ${fullName(st)}?`)
                              if (!ok) return
                              await deleteStudent(st.id)
                              await loadStudents()
                            })()
                          }}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !error && filtered.length === 0 ? (
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="card-footer border-0 bg-transparent py-3">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
            <div className="spms-muted small">
              Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filtered.length)} of {filtered.length} students
            </div>
            <div className="btn-group" role="group">
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <i className="bi bi-chevron-left" /> Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

