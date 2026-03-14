import { Link } from 'react-router-dom'
import { RecordTable, type RecordRow } from '../components/RecordTable'

// Placeholder data until violations are stored
const mockViolationsRecords: RecordRow[] = []

export function StudentViolationsPage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>
        <RecordTable
          title="Violations"
          rows={mockViolationsRecords}
          emptyMessage="No violations recorded."
        />
      </div>
    </div>
  )
}
