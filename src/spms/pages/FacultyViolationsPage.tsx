/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Student } from '../db/students'
import { addViolation, getStudentRecords } from '../db/studentRecords'
import { useFacultyTargetStudent } from '../hooks/useFacultyTargetStudent'

type ViolationPayload = {
  violation_type: string
  description: string
  date: string
  status: string
}

type ApiViolation = {
  id: string
  violation_type: string
  description: string
  date: string
  status: string
}

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function FacultyViolationsPage() {
  const {
    students,
    filteredStudents,
    loadingStudents,
    selectedStudentId,
    setSelectedStudentId,
    studentSearch,
    setStudentSearch,
  } = useFacultyTargetStudent()

  const [violations, setViolations] = useState<ApiViolation[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [violationForm, setViolationForm] = useState<ViolationPayload>({
    violation_type: '',
    description: '',
    date: '',
    status: 'Pending',
  })

  useEffect(() => {
    if (!selectedStudentId) {
      setViolations([])
      return
    }
    const r = getStudentRecords(selectedStudentId)
    setViolations(
      r.violations.map((v) => ({
        id: v.id,
        violation_type: v.violation_type,
        description: v.description,
        date: v.date,
        status: v.status,
      })),
    )
  }, [selectedStudentId])

  const sortedViolations = useMemo(
    () => [...violations].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [violations],
  )

  const handleViolationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedStudentId) {
      setError('Please select a student first.')
      return
    }
    try {
      setSubmitting(true)
      const created = addViolation(selectedStudentId, { ...violationForm })
      const newItem: ApiViolation = {
        id: created.id,
        violation_type: created.violation_type,
        description: created.description,
        date: created.date,
        status: created.status,
      }
      setViolations((prev) => [newItem, ...prev])
      setViolationForm({
        violation_type: '',
        description: '',
        date: '',
        status: 'Pending',
      })
      setSuccess('Violation saved successfully.')
    } catch {
      setError('Unable to save violation. Please check the form and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="spms-card card border-0"
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 className="fw-bold mb-1">Student Conduct &amp; Participation</h5>
              <p className="spms-muted small mb-0">
                Record violations for a selected student.
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/students" className="btn btn-outline-secondary btn-sm rounded-3">
                <i className="bi bi-people me-1" /> View Students
              </Link>
              <Link to="/faculty" className="btn btn-outline-secondary btn-sm rounded-3">
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-12 col-lg-7">
              <label className="form-label small fw-semibold">Search Student</label>
              <div className="input-group input-group-sm mb-2">
                <span className="input-group-text rounded-start-3">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="search"
                  className="form-control rounded-end-3"
                  placeholder="Search by name, ID, section, or email"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  disabled={loadingStudents}
                />
              </div>
              <label className="form-label small fw-semibold">Target Student</label>
              <select
                className="form-select form-select-sm rounded-3"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={loadingStudents}
              >
                {loadingStudents ? (
                  <option value="">Loading students...</option>
                ) : students.length === 0 ? (
                  <option value="">No students available</option>
                ) : filteredStudents.length === 0 ? (
                  <option value="">No matching students found</option>
                ) : (
                  filteredStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {fullName(st)} (ID: {st.id})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="col-12 col-lg-5 d-flex align-items-end">
              <div className="d-flex flex-wrap gap-2">
                <Link
                  to={selectedStudentId ? `/students/${selectedStudentId}` : '/students'}
                  className="btn btn-outline-primary btn-sm rounded-3"
                >
                  <i className="bi bi-eye me-1" /> View Profile
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger rounded-3 py-2 small mb-3" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success rounded-3 py-2 small mb-3" role="alert">
              {success}
            </div>
          )}

          <h6 className="fw-semibold mb-3">Record violation</h6>
          <form onSubmit={handleViolationSubmit} className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Violation Type</label>
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Uniform, Attendance, Cheating"
                value={violationForm.violation_type}
                onChange={(e) => setViolationForm((prev) => ({ ...prev, violation_type: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Date</label>
              <input
                type="date"
                className="form-control form-control-sm rounded-3"
                value={violationForm.date}
                onChange={(e) => setViolationForm((prev) => ({ ...prev, date: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Status</label>
              <select
                className="form-select form-select-sm rounded-3"
                value={violationForm.status}
                onChange={(e) => setViolationForm((prev) => ({ ...prev, status: e.target.value }))}
                disabled={submitting}
              >
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <textarea
                rows={3}
                className="form-control form-control-sm rounded-3"
                placeholder="Provide brief details of the violation."
                value={violationForm.description}
                onChange={(e) => setViolationForm((prev) => ({ ...prev, description: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary btn-sm rounded-3 px-4"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save violation'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div
            className="spms-card card border-0 overflow-hidden h-100"
            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
          >
            <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-semibold mb-0">Violations</h6>
              <span className="spms-muted small">{sortedViolations.length} record(s)</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead>
                    <tr className="spms-muted small">
                      <th className="ps-4 py-3 fw-semibold">Violation Type</th>
                      <th className="py-3 fw-semibold">Description</th>
                      <th className="py-3 fw-semibold">Status</th>
                      <th className="pe-4 py-3 fw-semibold text-end">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedViolations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                          No violations recorded.
                        </td>
                      </tr>
                    ) : (
                      sortedViolations.map((v) => (
                        <tr key={v.id}>
                          <td className="ps-4 py-3">{v.violation_type}</td>
                          <td className="py-3">{v.description}</td>
                          <td className="py-3">
                            <span
                              className="badge rounded-pill"
                              style={{
                                background:
                                  v.status.toLowerCase() === 'resolved'
                                    ? 'rgba(34, 197, 94, .15)'
                                    : 'rgba(234, 179, 8, .15)',
                                color:
                                  v.status.toLowerCase() === 'resolved' ? '#15803d' : '#a16207',
                              }}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="pe-4 py-3 text-end spms-muted small">
                            {new Date(v.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
