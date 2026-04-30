/** Student My Records page: Shows only Violations and Skills information */
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

type Violation = {
  violation_id: number
  student_id: number
  violation_type: string
  description: string
  severity: 'Minor' | 'Major' | 'Severe'
  date_issued: string
  reported_by: string
  status: 'Pending' | 'Resolved' | 'Cleared'
}

type Skill = {
  skill_id: number
  name: string
  category: string
  description: string
  proficiency_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  date_acquired: string
  certified_by: string
}

export function StudentMyRecordsPage() {
  const { user } = useAuth()
  const [violations, setViolations] = useState<Violation[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    const fetchRecords = async () => {
      if (!user?.studentId) return
      
      setLoading(true)
      setError(null)
      
      try {
        // TODO: Replace with actual API endpoints when implemented
        // For now, use mock data to demonstrate the page functionality
        
        // Mock violations data
        const mockViolations: Violation[] = [
          {
            violation_id: 1,
            student_id: parseInt(user.studentId),
            violation_type: 'Late Submission',
            description: 'Submitted assignment 3 days past the deadline',
            severity: 'Minor',
            date_issued: '2024-03-15',
            reported_by: 'Prof. Smith',
            status: 'Resolved'
          },
          {
            violation_id: 2,
            student_id: parseInt(user.studentId),
            violation_type: 'Unauthorized Absence',
            description: 'Missed 3 consecutive classes without valid excuse',
            severity: 'Major',
            date_issued: '2024-02-28',
            reported_by: 'Ms. Johnson',
            status: 'Cleared'
          }
        ]
        
        // Mock skills data
        const mockSkills: Skill[] = [
          {
            skill_id: 1,
            name: 'JavaScript Programming',
            category: 'Technical',
            description: 'Advanced proficiency in modern JavaScript including ES6+ features',
            proficiency_level: 'Advanced',
            date_acquired: '2024-01-20',
            certified_by: 'Dr. Brown'
          },
          {
            skill_id: 2,
            name: 'Public Speaking',
            category: 'Communication',
            description: 'Ability to present complex topics clearly and effectively',
            proficiency_level: 'Intermediate',
            date_acquired: '2024-02-15',
            certified_by: 'Prof. Davis'
          },
          {
            skill_id: 3,
            name: 'Data Analysis',
            category: 'Analytical',
            description: 'Statistical analysis and data visualization skills',
            proficiency_level: 'Beginner',
            date_acquired: '2024-03-10',
            certified_by: 'Ms. Wilson'
          }
        ]
        
        setViolations(mockViolations)
        setSkills(mockSkills)
        
      } catch (err) {
        console.error('Failed to fetch records:', err)
        setError('Failed to load your records. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [user?.studentId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor': return 'text-warning'
      case 'Major': return 'text-danger'
      case 'Severe': return 'text-danger fw-bold'
      default: return 'text-secondary'
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      Pending: 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25',
      Resolved: 'bg-success bg-opacity-10 text-success border border-success border-opacity-25',
      Cleared: 'bg-info bg-opacity-10 text-info border border-info border-opacity-25'
    }
    return variants[status as keyof typeof variants] || 'bg-secondary bg-opacity-10 text-secondary'
  }

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'text-primary'
      case 'Intermediate': return 'text-info'
      case 'Advanced': return 'text-success'
      case 'Expert': return 'text-warning fw-bold'
      default: return 'text-secondary'
    }
  }

  if (loading) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="spms-muted">Loading your records...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2" />
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column gap-4">
      {/* Violations Section */}
      <div className="spms-card card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="fw-semibold d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle text-danger" />
            Violations
          </div>
          <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
            {violations.length} record{violations.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {violations.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-shield-check text-success" style={{ fontSize: '2rem' }} />
              <div className="mt-2 spms-muted">No violations on record</div>
              <div className="small spms-muted">Keep up the good work!</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr className="spms-muted small">
                    <th>Type</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation) => (
                    <tr key={violation.violation_id}>
                      <td>
                        <div className="fw-semibold">{violation.violation_type}</div>
                        <div className="small spms-muted">by {violation.reported_by}</div>
                      </td>
                      <td>{violation.description}</td>
                      <td>
                        <span className={`fw-semibold ${getSeverityColor(violation.severity)}`}>
                          {violation.severity}
                        </span>
                      </td>
                      <td>{new Date(violation.date_issued).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(violation.status)}`}>
                          {violation.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Skills Section */}
      <div className="spms-card card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="fw-semibold d-flex align-items-center gap-2">
            <i className="bi bi-award text-primary" />
            Skills
          </div>
          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
            {skills.length} skill{skills.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body">
          {skills.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-star text-muted" style={{ fontSize: '2rem' }} />
              <div className="mt-2 spms-muted">No skills recorded yet</div>
              <div className="small spms-muted">Skills will be added by your faculty</div>
            </div>
          ) : (
            <div className="row g-3">
              {skills.map((skill) => (
                <div key={skill.skill_id} className="col-12 col-md-6 col-lg-4">
                  <div className="spms-card card h-100 border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)' }}>
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between mb-2">
                        <h6 className="card-title mb-0 fw-semibold">{skill.name}</h6>
                        <span className={`badge bg-light text-dark small ${getProficiencyColor(skill.proficiency_level)}`}>
                          {skill.proficiency_level}
                        </span>
                      </div>
                      <div className="small spms-muted mb-2">{skill.category}</div>
                      <p className="card-text small">{skill.description}</p>
                      <div className="d-flex align-items-center justify-content-between mt-auto">
                        <small className="spms-muted">
                          <i className="bi bi-person-check me-1" />
                          {skill.certified_by}
                        </small>
                        <small className="spms-muted">
                          <i className="bi bi-calendar me-1" />
                          {new Date(skill.date_acquired).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row g-3">
        <div className="col-12">
          <div className="spms-card card border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon" style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(34, 197, 94, .12)',
                  border: '1px solid rgba(34, 197, 94, .20)',
                  color: '#22c55e'
                }}>
                  <i className="bi bi-shield-check" />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-success">Clean Record</div>
                  <div className="small spms-muted">
                    {violations.length === 0 ? 'No violations' : `${violations.length} violation${violations.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
