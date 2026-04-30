/** Client-side routing (React Router): student list links via <Link> (no full page reload). */
  import { useCallback, useEffect, useMemo, useState } from 'react'
  import { useAuth } from '../auth/AuthContext'
  import { Link } from 'react-router-dom'
  import { deleteStudent } from '../db/students'
  import { useOptimizedStudentList, useOptimizedBehaviorCounts, clearStudentDataCache } from '../hooks/useOptimizedStudentData'
  import type { StudentBasicInfo } from '../hooks/useOptimizedStudentData'

  const yearOptions = ['1st', '2nd', '3rd', '4th']

  function fullName(s: StudentBasicInfo) {
    const parts = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')
    return parts.replace(/\s+/g, ' ').trim()
  }

  export function OptimizedStudentsPage() {
    const { user } = useAuth()
    
    // Form states
    const [query, setQuery] = useState('')
    const [year, setYear] = useState('')
    const [section, setSection] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const studentsPerPage = 25 // Reduced from 50 for better performance
    
    // Permissions
    const canEdit = user?.role === 'admin'
    const canDelete = user?.role === 'admin'
    const showBehaviorCounts = user?.role === 'admin' || user?.role === 'faculty'

    // Use optimized student data loading
    const {
      students,
      totalCount,
      totalPages,
      loading,
      error,
      refresh
    } = useOptimizedStudentList<StudentBasicInfo>({
      page: currentPage,
      pageSize: studentsPerPage,
      search: query,
      yearLevel: year,
      section: section,
      fields: 'basic',
      enableCache: true
    })

    // Get behavior counts for current page students only
    const studentIds = useMemo(() => students.map(s => s.id), [students])
    const { counts: behaviorCounts, loading: behaviorLoading } = useOptimizedBehaviorCounts(studentIds)

    // Section options derived from current page data
    const sectionOptions = useMemo(() => {
      const uniq = Array.from(new Set(students.map((st) => (st.section ?? '').trim()).filter(Boolean)))
      return uniq.sort((a, b) => a.localeCompare(b))
    }, [students])

    // Reset to page 1 when filters change
    useEffect(() => {
      setCurrentPage(1)
    }, [query, year, section])

    // Handle page changes
    const handlePageChange = useCallback((newPage: number) => {
      setCurrentPage(newPage)
    }, [])

    // Handle refresh
    const handleRefresh = useCallback(() => {
      clearStudentDataCache()
      refresh()
    }, [refresh])

    // Handle delete
    const handleDelete = useCallback(async (student: StudentBasicInfo) => {
      const ok = confirm(`Delete ${fullName(student)}?`)
      if (!ok) return
      
      try {
        await deleteStudent(student.id)
        await handleRefresh()
      } catch (error) {
        console.error('Failed to delete student:', error)
      }
    }, [handleRefresh])

    // Calculate display range
    const displayStart = totalCount === 0 ? 0 : ((currentPage - 1) * studentsPerPage) + 1
    const displayEnd = Math.min(currentPage * studentsPerPage, totalCount)

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
                <i className="bi bi-list-check" /> {totalCount}
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading && students.length === 0 ? (
            <div className="p-4 text-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="spms-muted">Loading students...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <div className="text-danger mb-2">{error}</div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleRefresh}>
                Retry
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="p-4 text-center spms-muted">
              No students matched your filters.
            </div>
          ) : (
            <>
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
                    {students.map((st) => (
                      <tr key={st.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="spms-avatar-placeholder">
                              <i className="bi bi-person-circle fs-5 text-muted" />
                            </div>
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
                              {behaviorLoading ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              ) : (
                                <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                                  {behaviorCounts[st.id]?.violations ?? 0}
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {behaviorLoading ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              ) : (
                                <span className="badge rounded-pill bg-primary-subtle text-primary">
                                  {behaviorCounts[st.id]?.achievements ?? 0}
                                </span>
                              )}
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
                                onClick={() => handleDelete(st)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="card-footer border-0 bg-transparent py-3">
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                    <div className="spms-muted small">
                      Showing {displayStart} to {displayEnd} of {totalCount} students
                    </div>
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
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
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
