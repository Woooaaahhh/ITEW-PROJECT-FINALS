import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecordTable, type RecordRow } from '../components/RecordTable'
import { getViolations } from '../db/violations'
import { formatStudentRecordDate } from './studentRecordViewUtils'

export function StudentViolationsPage() {
  const { user } = useAuth()
  const studentId = user?.role === 'student' ? user.studentId : undefined

  const violationRows = useMemo(() => {
    if (!studentId) return [] as RecordRow[]
    return getViolations(studentId).map((v) => ({
      recordType: `${v.violation_type} · ${v.status}`,
      description: v.description,
      date: formatStudentRecordDate(v.date),
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
            <Link to="/student/achievements" className="btn btn-outline-secondary btn-sm rounded-3">
              <i className="bi bi-journal-bookmark me-1" /> Achievements
            </Link>
            <Link to={`/students/${studentId}`} className="btn btn-outline-primary btn-sm rounded-3">
              <i className="bi bi-person-badge me-1" /> My profile
            </Link>
          </div>
        </div>
        <p className="spms-muted small mb-4">
          Official violation records entered by faculty. Also summarized on your student profile.
        </p>
        <RecordTable title="Violations" rows={violationRows} emptyMessage="No violations recorded." />
      </div>
    </div>
  )
}
