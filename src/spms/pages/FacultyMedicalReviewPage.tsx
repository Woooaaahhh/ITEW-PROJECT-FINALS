import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { hasPendingMedicalSubmission } from '../db/medicalClearance'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function FacultyMedicalReviewPage() {
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

  const pending = students.filter(hasPendingMedicalSubmission)

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
        <div className="card-header bg-transparent border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div>
            <h5 className="fw-bold mb-0">Medical submissions (pending)</h5>
            <p className="spms-muted small mb-0">Review uploaded documents and form data, then approve or reject on the student profile.</p>
          </div>
          <span className="spms-chip">
            <i className="bi bi-people me-1" />
            {pending.length} pending
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 spms-muted small">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="p-4 spms-muted small">No pending medical submissions.</div>
          ) : (
            <div className="table-responsive">
              <table className="table spms-table table-hover align-middle mb-0">
                <thead className="border-bottom bg-light bg-opacity-50">
                  <tr>
                    <th className="ps-3 py-2 small text-uppercase spms-muted">Student</th>
                    <th className="py-2 small text-uppercase spms-muted">Section</th>
                    <th className="py-2 small text-uppercase spms-muted">Submitted</th>
                    <th className="text-end pe-3 py-2 small text-uppercase spms-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((s) => (
                    <tr key={s.id}>
                      <td className="ps-3 py-3 fw-semibold">{fullName(s)}</td>
                      <td className="py-3">{s.section ?? '—'}</td>
                      <td className="py-3 spms-muted small">
                        {s.medicalSubmittedAt ? new Date(s.medicalSubmittedAt).toLocaleString() : '—'}
                      </td>
                      <td className="text-end pe-3 py-3">
                        <Link
                          to={`/students/${s.id}#medical-clearance`}
                          className="btn btn-sm btn-primary rounded-3"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link to="/faculty" className="btn btn-outline-secondary rounded-3">
          <i className="bi bi-arrow-left me-1" /> Faculty dashboard
        </Link>
      </div>
    </div>
  )
}
