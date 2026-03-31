import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecordTable, type RecordRow } from '../components/RecordTable'
import { getStudentRecords } from '../db/studentRecords'
import { formatStudentRecordDate } from './studentRecordViewUtils'

export function StudentAchievementsPage() {
  const { user } = useAuth()
  const studentId = user?.role === 'student' ? user.studentId : undefined

  const achievementRows = useMemo(() => {
    if (!studentId) return [] as RecordRow[]
    const rec = getStudentRecords(studentId)
    return rec.achievements.map((a) => ({
      recordType: a.category ? `${a.title} (${a.category})` : a.title,
      description: a.description,
      date: formatStudentRecordDate(a.date),
    }))
  }, [studentId])

  if (!studentId) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="fw-semibold mb-2">Profile not linked</div>
          <p className="spms-muted small mb-0">
            Your account is not linked to a student record. Contact the registrar if you need access.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/student/violations" className="btn btn-outline-secondary btn-sm rounded-3">
              <i className="bi bi-exclamation-triangle me-1" /> Violations
            </Link>
            <Link to={`/students/${studentId}`} className="btn btn-outline-primary btn-sm rounded-3">
              <i className="bi bi-person-badge me-1" /> My profile
            </Link>
          </div>
        </div>
        <p className="spms-muted small mb-4">
          Non-academic achievements recorded by faculty. Also summarized on your student profile.
        </p>
        <RecordTable
          title="Non-academic achievements"
          rows={achievementRows}
          emptyMessage="No non-academic achievements recorded."
        />
      </div>
    </div>
  )
}
