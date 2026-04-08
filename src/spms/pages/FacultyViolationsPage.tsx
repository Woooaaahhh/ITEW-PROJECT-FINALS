/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { addAchievement, addViolation, ensureSeededForDemo, getStudentRecords } from '../db/studentRecords'

type ViolationPayload = {
  violation_type: string
  description: string
  date: string
  status: string
}

type AchievementPayload = {
  title: string
  description: string
  date: string
  category: string
}

type ApiViolation = {
  id: string
  violation_type: string
  description: string
  date: string
  status: string
}

type ApiAchievement = {
  id: string
  title: string
  description: string
  date: string
  category: string
}

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function FacultyViolationsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  const [violations, setViolations] = useState<ApiViolation[]>([])
  const [achievements, setAchievements] = useState<ApiAchievement[]>([])
  const [submitting, setSubmitting] = useState<null | 'violation' | 'achievement'>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [violationForm, setViolationForm] = useState<ViolationPayload>({
    violation_type: '',
    description: '',
    date: '',
    status: 'Pending',
  })

  const [achievementForm, setAchievementForm] = useState<AchievementPayload>({
    title: '',
    description: '',
    date: '',
    category: '',
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingStudents(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      ensureSeededForDemo(all.map((s) => s.id))
      setSelectedStudentId(all[0]?.id ?? '')
      setLoadingStudents(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedStudentId) {
      setViolations([])
      setAchievements([])
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
    setAchievements(
      r.achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.date,
        category: a.category ?? '',
      })),
    )
  }, [selectedStudentId])

  const sortedViolations = useMemo(
    () => [...violations].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [violations],
  )

  const sortedAchievements = useMemo(
    () => [...achievements].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [achievements],
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
      setSubmitting('violation')
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
      setSubmitting(null)
    }
  }

  const handleAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedStudentId) {
      setError('Please select a student first.')
      return
    }
    try {
      setSubmitting('achievement')
      const created = addAchievement(selectedStudentId, { ...achievementForm })
      const newItem: ApiAchievement = {
        id: created.id,
        title: created.title,
        description: created.description,
        date: created.date,
        category: created.category ?? '',
      }
      setAchievements((prev) => [newItem, ...prev])
      setAchievementForm({
        title: '',
        description: '',
        date: '',
        category: '',
      })
      setSuccess('Achievement saved successfully.')
    } catch {
      setError('Unable to save achievement. Please check the form and try again.')
    } finally {
      setSubmitting(null)
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
                Record violations and non-academic achievements for a selected student.
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
                disabled={submitting !== null}
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
                disabled={submitting !== null}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Status</label>
              <select
                className="form-select form-select-sm rounded-3"
                value={violationForm.status}
                onChange={(e) => setViolationForm((prev) => ({ ...prev, status: e.target.value }))}
                disabled={submitting !== null}
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
                disabled={submitting !== null}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary btn-sm rounded-3 px-4"
                disabled={submitting !== null}
              >
                {submitting === 'violation' ? 'Saving…' : 'Save violation'}
              </button>
            </div>
          </form>

          <hr className="my-4" />

          <h6 className="fw-semibold mb-3">Record achievement</h6>
          <form onSubmit={handleAchievementSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Achievement Title</label>
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Programming Contest Winner"
                value={achievementForm.title}
                onChange={(e) => setAchievementForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                disabled={submitting !== null}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Date</label>
              <input
                type="date"
                className="form-control form-control-sm rounded-3"
                value={achievementForm.date}
                onChange={(e) => setAchievementForm((prev) => ({ ...prev, date: e.target.value }))}
                required
                disabled={submitting !== null}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Category</label>
              <input
                type="text"
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Sports, Programming, Leadership"
                value={achievementForm.category}
                onChange={(e) => setAchievementForm((prev) => ({ ...prev, category: e.target.value }))}
                disabled={submitting !== null}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <textarea
                rows={3}
                className="form-control form-control-sm rounded-3"
                placeholder="Provide brief details of the achievement or recognition."
                value={achievementForm.description}
                onChange={(e) => setAchievementForm((prev) => ({ ...prev, description: e.target.value }))}
                required
                disabled={submitting !== null}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button type="submit" className="btn btn-primary btn-sm rounded-3 px-4" disabled={submitting !== null}>
                {submitting === 'achievement' ? 'Saving…' : 'Save achievement'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
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

        <div className="col-12 col-xl-6">
          <div
            className="spms-card card border-0 overflow-hidden h-100"
            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
          >
            <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-semibold mb-0">Non-Academic Achievements</h6>
              <span className="spms-muted small">{sortedAchievements.length} record(s)</span>
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
                    {sortedAchievements.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                          No achievements recorded.
                        </td>
                      </tr>
                    ) : (
                      sortedAchievements.map((a) => (
                        <tr key={a.id}>
                          <td className="ps-4 py-3">{a.title}</td>
                          <td className="py-3">{a.description}</td>
                          <td className="py-3">
                            {a.category ? (
                              <span className="badge rounded-pill bg-primary-subtle text-primary">
                                {a.category}
                              </span>
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
