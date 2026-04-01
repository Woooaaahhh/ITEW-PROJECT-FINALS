import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ProfileAcademicHistoryCard, ProfileCurrentAcademicBanner } from '../components/AcademicProfileSections'
import { useAuth } from '../auth/AuthContext'
import { ensureAcademicSeededForDemo } from '../db/academicRecords'

export function StudentAcademicPage() {
  const { user } = useAuth()
  const studentId = user?.studentId

  useEffect(() => {
    if (studentId) ensureAcademicSeededForDemo([studentId])
  }, [studentId])

  if (!studentId) {
    return (
      <div className="row g-4">
        <div className="col-12">
          <div className="d-flex align-items-center gap-2 mb-3">
            <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
              <i className="bi bi-arrow-left me-1" /> Back to Dashboard
            </Link>
          </div>
          <div className="alert alert-warning mb-0 rounded-3">
            Your account is not linked to a student profile. Contact the registrar.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
          <Link to={`/students/${studentId}`} className="btn btn-outline-primary btn-sm rounded-3">
            <i className="bi bi-person-lines-fill me-1" /> Full profile
          </Link>
        </div>
        <div className="d-flex flex-column gap-3">
          <ProfileCurrentAcademicBanner studentId={studentId} />
          <ProfileAcademicHistoryCard studentId={studentId} showFacultyForm={false} />
        </div>
      </div>
    </div>
  )
}
