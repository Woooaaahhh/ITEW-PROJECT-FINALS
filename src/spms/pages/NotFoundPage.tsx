/** Client-side routing (React Router): <Link> back to app routes without a full document reload. */
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="spms-card card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="fw-bold fs-4">Page not found</div>
            <div className="spms-muted">The page you’re looking for doesn’t exist.</div>
          </div>
          <Link to="/" className="btn btn-primary rounded-4 px-4">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

