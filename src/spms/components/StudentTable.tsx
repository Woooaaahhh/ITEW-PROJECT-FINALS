/** Client-side routing (React Router): row actions use <Link> to student routes without reloading. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

const PAGE_SIZE = 5

type StudentTableProps = {
  students: Student[]
  loading?: boolean
  /** When true, show Status column (Active) instead of Last Updated */
  showStatusColumn?: boolean
}

export function StudentTable({ students, loading, showStatusColumn }: StudentTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        fullName(s).toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.section ?? '').toLowerCase().includes(q) ||
        (s.yearLevel ?? '').toLowerCase().includes(q),
    )
  }, [students, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageRows = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage],
  )

  if (loading) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="spms-muted">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="spms-card card border-0 overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
      <div className="card-header bg-transparent border-bottom px-4 py-3">
        <div className="row align-items-center g-2">
          <div className="col-12 col-md-6">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search by name, email, section..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              style={{ maxWidth: 280, borderRadius: 10 }}
            />
          </div>
          <div className="col-12 col-md-6 text-md-end">
            <span className="spms-muted small">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 spms-table">
            <thead>
              <tr className="spms-muted small">
                <th className="ps-4 py-3 fw-semibold">Student Name</th>
                <th className="py-3 fw-semibold">Email</th>
                <th className="py-3 fw-semibold">Year Level</th>
                <th className="py-3 fw-semibold">Section</th>
                <th className="py-3 fw-semibold">{showStatusColumn ? 'Status' : 'Last Updated'}</th>
                <th className="pe-4 py-3 fw-semibold text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ps-4 py-4 spms-muted text-center">
                    No students found.
                  </td>
                </tr>
              ) : (
                pageRows.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-4 py-3 fw-semibold">{fullName(s)}</td>
                    <td className="py-3">{s.email ?? '—'}</td>
                    <td className="py-3">{s.yearLevel ?? '—'}</td>
                    <td className="py-3">{s.section ?? '—'}</td>
                    <td className="py-3 spms-muted small">
                      {showStatusColumn ? (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Active</span>
                      ) : (
                        s.updatedAt ? new Date(s.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'
                      )}
                    </td>
                    <td className="pe-4 py-3 text-end">
                      <Link to={`/students/${s.id}`} className="btn btn-sm btn-primary rounded-3 px-3">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top">
            <span className="spms-muted small">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-3"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-3"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
