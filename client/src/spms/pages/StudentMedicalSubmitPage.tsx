/** Client-side routing (React Router): <Link> / <Navigate> for in-app moves (no full page reload). */
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** Kept for bookmarks and old links; medical form lives on the student dashboard. */
export function StudentMedicalSubmitPage() {
  const { user } = useAuth()

  if (!user || user.role !== 'student') {
    return (
      <div className="spms-card card">
        <div className="card-body">This page is for student accounts only.</div>
      </div>
    )
  }

  if (!user.studentId) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <p className="mb-2">Your login is not linked to a student record.</p>
          <Link to="/student" className="btn btn-outline-primary rounded-3">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <Navigate to="/student?medical=1" replace />
}
