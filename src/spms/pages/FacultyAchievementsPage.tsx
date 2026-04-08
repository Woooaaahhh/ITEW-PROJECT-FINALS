/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Student } from '../db/students'
import { addAchievement, getAchievements, type AchievementRecord } from '../db/achievements'
import { useFacultyTargetStudent } from '../hooks/useFacultyTargetStudent'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

type AchievementPayload = {
  title: string
  description: string
  date: string
  category: string
}

export function FacultyAchievementsPage() {
  const { students, loadingStudents, selectedStudentId, setSelectedStudentId } = useFacultyTargetStudent()
  const [rows, setRows] = useState<AchievementRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<AchievementPayload>({
    title: '',
    description: '',
    date: '',
    category: '',
  })

  useEffect(() => {
    if (!selectedStudentId) {
      setRows([])
      return
    }
    setRows(getAchievements(selectedStudentId))
  }, [selectedStudentId])

  const sortedRows = useMemo(() => [...rows].sort((a, b) => (a.date < b.date ? 1 : -1)), [rows])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedStudentId) {
      setError('Please select a student first.')
      return
    }
    try {
      setSubmitting(true)
      const created = addAchievement(selectedStudentId, { ...form })
      setRows((prev) => [created, ...prev])
      setForm({ title: '', description: '', date: '', category: '' })
      setSuccess('Achievement saved successfully.')
    } catch {
      setError('Unable to save record. Please check the form and try again.')
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
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <div>
              <h5 className="fw-bold mb-1">Non-academic achievements</h5>
              <p className="spms-muted small mb-0">
                Record non-academic achievements and participation for a selected student.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/faculty/violations" className="btn btn-outline-primary btn-sm rounded-3">
                <i className="bi bi-exclamation-triangle me-1" />
                Violations
              </Link>
              <Link to="/students" className="btn btn-outline-secondary btn-sm rounded-3">
                <i className="bi bi-people me-1" /> View Students
              </Link>
              <Link to="/faculty" className="btn btn-outline-secondary btn-sm rounded-3">
                Dashboard
              </Link>
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-12 col-lg-7">
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
                ) : (
                  students.map((st) => (
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

          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Achievement Title</label>
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Programming Contest Winner"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Date</label>
              <input
                type="date"
                className="form-control form-control-sm rounded-3"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Category</label>
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Sports, Programming, Leadership"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <textarea
                rows={3}
                className="form-control form-control-sm rounded-3"
                placeholder="Provide brief details of the achievement or recognition."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div className="col-12 d-flex justify-content-end gap-2 mt-2">
              <button type="submit" className="btn btn-primary btn-sm rounded-3 px-4" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Achievement'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div
            className="spms-card card border-0 overflow-hidden"
            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
          >
            <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-semibold mb-0">Achievements for this student</h6>
              <span className="spms-muted small">{sortedRows.length} record(s)</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead>
                    <tr className="spms-muted small">
                      <th className="ps-4 py-3 fw-semibold">Title</th>
                      <th className="py-3 fw-semibold">Description</th>
                      <th className="py-3 fw-semibold">Category</th>
                      <th className="pe-4 py-3 fw-semibold text-end">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                          No achievements recorded.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((a) => (
                        <tr key={a.id}>
                          <td className="ps-4 py-3">{a.title}</td>
                          <td className="py-3">{a.description}</td>
                          <td className="py-3">
                            {a.category ? (
                              <span className="badge rounded-pill bg-primary-subtle text-primary">{a.category}</span>
                            ) : (
                              <span className="spms-muted small">—</span>
                            )}
                          </td>
                          <td className="pe-4 py-3 text-end spms-muted small">
                            {new Date(a.date).toLocaleDateString()}
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
