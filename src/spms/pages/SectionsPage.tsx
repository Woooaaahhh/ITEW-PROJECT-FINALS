import { Link } from 'react-router-dom'

export function SectionsPage() {
  return (
    <div className="spms-card card">
      <div className="card-body">
        <h5 className="fw-bold mb-2">Manage Sections</h5>
        <p className="spms-muted small mb-0">
          Section management will be available here. For now, sections are used in student profiles.
        </p>
        <Link to="/students" className="btn btn-outline-primary rounded-4 mt-3">
          Go to Students
        </Link>
      </div>
    </div>
  )
}
