import { Link } from 'react-router-dom'
import { RecordTable, type RecordRow } from '../components/RecordTable'

// Placeholder data until academic history is stored
const mockAcademicRecords: RecordRow[] = [
  { recordType: 'Enrollment', description: 'Enrolled for current academic year', date: '08/15/2024' },
  { recordType: 'Grade', description: 'First semester grades posted', date: '01/10/2025' },
]

export function StudentAcademicPage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>
        <RecordTable
          title="Academic History"
          rows={mockAcademicRecords}
          emptyMessage="No academic records yet."
        />
      </div>
    </div>
  )
}
