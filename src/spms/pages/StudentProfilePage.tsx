import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getStudent, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const canEdit = user?.role === 'admin'
  const isOwnProfile = user?.role === 'student' && user?.studentId === id

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!id) return
      setLoading(true)
      const s = await getStudent(id)
      if (!alive) return
      setStudent(s ?? null)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [id])

  const name = useMemo(() => (student ? fullName(student) : 'Student'), [student])
  const records = useMemo(() => (student ? getStudentRecords(student.id) : null), [student])

  if (loading) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="spms-muted">Loading student profile...</div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="fw-bold fs-5">Student not found</div>
          <div className="spms-muted">The student ID does not exist in the database.</div>
          <div className="mt-3">
            <Link to="/students" className="btn btn-primary rounded-4 px-4">
              <i className="bi bi-arrow-left me-1" /> Back to Student List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const emptySection = (msg: string) => (
    <div className="spms-muted small py-2">{msg}</div>
  )

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-cover" />

      <div className="spms-profile-header">
        <img className="spms-profile-pic" src={student.profilePictureDataUrl || avatarUrl} alt={name} />
        <div className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h3 className="mb-0 fw-bold">{name}</h3>
            <span className="spms-chip">
              <i className="bi bi-patch-check" /> Active
            </span>
            {student.yearLevel ? (
              <span className="spms-chip">
                <i className="bi bi-layers" /> {student.yearLevel}
              </span>
            ) : null}
            {student.section ? (
              <span className="spms-chip">
                <i className="bi bi-diagram-3" /> {student.section}
              </span>
            ) : null}
          </div>

          <div className="d-flex flex-wrap gap-2 mt-2">
            {student.email ? (
              <span className="spms-chip">
                <i className="bi bi-envelope" /> {student.email}
              </span>
            ) : null}
            {student.contactNumber ? (
              <span className="spms-chip">
                <i className="bi bi-telephone" /> {student.contactNumber}
              </span>
            ) : null}
            {student.address ? (
              <span className="spms-chip">
                <i className="bi bi-geo-alt" /> {student.address}
              </span>
            ) : null}
          </div>

          <div className="d-flex gap-2 mt-3 spms-no-print">
            {canEdit && (
              <Link to={`/students/${student.id}/edit`} className="btn btn-primary rounded-4 px-4">
                <i className="bi bi-pencil me-1" /> Edit
              </Link>
            )}
            {isOwnProfile ? (
              <Link to="/student" className="btn btn-outline-primary rounded-4 px-4">
                Back to dashboard
              </Link>
            ) : (
              <Link to="/students" className="btn btn-outline-primary rounded-4 px-4">
                Back to list
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left column */}
        <div className="col-12 col-xl-5">
          <div className="spms-card card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-person-lines-fill me-2" /> Personal Information
              </div>
              <span className="spms-chip"><i className="bi bi-info-circle" /> Details</span>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-6">
                  <div className="spms-muted small">Student ID</div>
                  <div className="fw-semibold">{student.id}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Birthdate</div>
                  <div className="fw-semibold">{student.birthdate || '—'}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Gender</div>
                  <div className="fw-semibold">{student.gender || '—'}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Year Level</div>
                  <div className="fw-semibold">{student.yearLevel || '—'}</div>
                </div>
                <div className="col-12">
                  <div className="spms-muted small">Address</div>
                  <div className="fw-semibold">{student.address || '—'}</div>
                </div>
                <div className="col-12">
                  <hr />
                  <div className="spms-muted small">Created {new Date(student.createdAt).toLocaleString()} · Updated {new Date(student.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-heart-pulse me-2" /> Medical Records
              </div>
              <span className="spms-chip"><i className="bi bi-shield-lock" /> Restricted</span>
            </div>
            <div className="card-body">
              {emptySection('No medical records on file. Add via Edit Profile when supported.')}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-12 col-xl-7">
          <div className="spms-card card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-mortarboard me-2" /> Academic History
              </div>
              <span className="spms-chip"><i className="bi bi-graph-up" /> Performance</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table spms-table table-hover align-middle mb-0">
                  <thead className="border-bottom">
                    <tr>
                      <th className="ps-3">School Year</th>
                      <th>Semester</th>
                      <th>GWA</th>
                      <th>Honors</th>
                      <th className="pe-3 text-end">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="ps-3" colSpan={5}>
                        {emptySection('No academic history recorded yet.')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-0">
            <div className="col-12 col-lg-6">
              <div className="spms-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div className="fw-bold">
                    <i className="bi bi-exclamation-triangle me-2" /> Violations
                  </div>
                  <span className="spms-chip"><i className="bi bi-clipboard-check" /> Record</span>
                </div>
                <div className="card-body">
                  {!records || records.violations.length === 0 ? (
                    emptySection('No violations on record.')
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {records.violations.slice(0, 5).map((v) => (
                        <div key={v.id} className="d-flex justify-content-between gap-3">
                          <div className="flex-grow-1">
                            <div className="fw-semibold small">{v.violation_type}</div>
                            <div className="spms-muted small">{v.description}</div>
                          </div>
                          <div className="text-end">
                            <div className="spms-muted small">{new Date(v.date).toLocaleDateString()}</div>
                            <span
                              className="badge rounded-pill"
                              style={{
                                background: v.status.toLowerCase() === 'resolved' ? 'rgba(34, 197, 94, .15)' : 'rgba(234, 179, 8, .15)',
                                color: v.status.toLowerCase() === 'resolved' ? '#15803d' : '#a16207',
                              }}
                            >
                              {v.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {records.violations.length > 5 ? (
                        <div className="spms-muted small">Showing 5 of {records.violations.length} records.</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="spms-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div className="fw-bold">
                    <i className="bi bi-dribbble me-2" /> Sports Participation
                  </div>
                  <span className="spms-chip"><i className="bi bi-check-circle" /> Cleared</span>
                </div>
                <div className="card-body">
                  {emptySection('No sports participation recorded.')}
                </div>
              </div>
            </div>
          </div>

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-stars me-2" /> Skills
              </div>
              <span className="spms-chip"><i className="bi bi-lightning-charge" /> Strengths</span>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {emptySection('No skills recorded yet.')}
              </div>
            </div>
          </div>

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-journal-bookmark me-2" /> Non-Academic Achievements
              </div>
              <span className="spms-chip"><i className="bi bi-award" /> Activities</span>
            </div>
            <div className="card-body">
              {!records || records.achievements.length === 0 ? (
                emptySection('No non-academic achievements recorded yet.')
              ) : (
                <div className="d-flex flex-column gap-2">
                  {records.achievements.slice(0, 5).map((a) => (
                    <div key={a.id} className="d-flex justify-content-between gap-3">
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">
                          {a.title}{' '}
                          {a.category ? (
                            <span className="badge rounded-pill bg-primary-subtle text-primary ms-1">{a.category}</span>
                          ) : null}
                        </div>
                        <div className="spms-muted small">{a.description}</div>
                      </div>
                      <div className="text-end spms-muted small">{new Date(a.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {records.achievements.length > 5 ? (
                    <div className="spms-muted small">Showing 5 of {records.achievements.length} records.</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

