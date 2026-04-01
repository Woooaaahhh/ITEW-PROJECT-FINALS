import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProfileAcademicHistoryCard, ProfileCurrentAcademicBanner } from '../components/AcademicProfileSections'
import { ensureAcademicSeededForDemo } from '../db/academicRecords'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function FacultyAcademicPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      ensureAcademicSeededForDemo(all.map((s) => s.id))
      setSelectedStudentId(all[0]?.id ?? '')
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <Link to="/faculty" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>

        <div className="spms-card card mb-3">
          <div className="card-body">
            <label className="form-label fw-semibold mb-2">
              <i className="bi bi-person-lines-fill me-2" />
              Student
            </label>
            <select
              className="form-select rounded-3"
              value={selectedStudentId}
              disabled={loading || students.length === 0}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.length === 0 ? (
                <option value="">No students</option>
              ) : (
                students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s)} ({s.id})
                  </option>
                ))
              )}
            </select>
            {selectedStudentId ? (
              <div className="mt-2">
                <Link to={`/students/${selectedStudentId}`} className="small fw-semibold text-decoration-none">
                  <i className="bi bi-box-arrow-up-right me-1" />
                  Open full profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {selectedStudentId ? (
          <div className="d-flex flex-column gap-3">
            <ProfileCurrentAcademicBanner studentId={selectedStudentId} />
            <ProfileAcademicHistoryCard key={selectedStudentId} studentId={selectedStudentId} showFacultyForm />
          </div>
        ) : (
          <div className="spms-muted">Select a student to view and manage academic records.</div>
        )}
      </div>
    </div>
  )
}
