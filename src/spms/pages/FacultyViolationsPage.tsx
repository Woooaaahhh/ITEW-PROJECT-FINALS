import { Link } from 'react-router-dom'

export function FacultyViolationsPage() {
  return (
    <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
      <div className="card-body">
        <h5 className="fw-bold mb-2">Record Student Violations</h5>
        <p className="spms-muted small mb-0">
          Record and manage student violation records. This feature will allow you to log violations and view history per student.
        </p>
        <div className="d-flex gap-2 mt-3">
          <Link to="/students" className="btn btn-primary rounded-4">
            <i className="bi bi-people me-1" /> View Students
          </Link>
          <Link to="/faculty" className="btn btn-outline-secondary rounded-4">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
