import { Link } from 'react-router-dom'
import { RecordTable, type RecordRow } from '../components/RecordTable'

// Placeholder data until skills are stored
const mockSkillsRecords: RecordRow[] = [
  { recordType: 'Technical', description: 'Programming - Python', date: '02/01/2025' },
  { recordType: 'Soft Skill', description: 'Leadership Workshop', date: '01/15/2025' },
]

export function StudentSkillsPage() {
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>
        <RecordTable
          title="Skills"
          rows={mockSkillsRecords}
          emptyMessage="No skills recorded yet."
        />
      </div>
    </div>
  )
}
