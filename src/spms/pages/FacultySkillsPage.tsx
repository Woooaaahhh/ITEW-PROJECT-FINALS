import { Link } from 'react-router-dom'

export function FacultySkillsPage() {
  return (
    <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
      <div className="card-body">
        <h5 className="fw-bold mb-2">Assign Student Skills</h5>
        <p className="spms-muted small mb-0">
          Add and manage student skills. This feature will allow you to assign skills and track student achievements.
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
