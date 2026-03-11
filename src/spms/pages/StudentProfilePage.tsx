import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { getStudent, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentProfilePage() {
  const { id } = useParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-cover" />

      <div className="spms-profile-header">
        <img className="spms-profile-pic" src={student.profilePictureDataUrl || avatarUrl} alt={name} />
        <div className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h3 className="mb-0 fw-bold">{name}</h3>
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
            <Link to={`/students/${student.id}/edit`} className="btn btn-primary rounded-4 px-4">
              <i className="bi bi-pencil me-1" /> Edit
            </Link>
            <Link to="/students" className="btn btn-outline-primary rounded-4 px-4">
              Back to list
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="spms-card card">
            <div className="card-header fw-bold">
              <i className="bi bi-person-lines-fill me-2" /> Personal Information
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
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="spms-card card">
            <div className="card-header fw-bold">
              <i className="bi bi-card-checklist me-2" /> Record Metadata
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12">
                  <div className="spms-muted small">Created</div>
                  <div className="fw-semibold">{new Date(student.createdAt).toLocaleString()}</div>
                </div>
                <div className="col-12">
                  <div className="spms-muted small">Last Updated</div>
                  <div className="fw-semibold">{new Date(student.updatedAt).toLocaleString()}</div>
                </div>
                <div className="col-12">
                  <div className="spms-muted small">Note</div>
                  <div className="spms-muted">This page is limited to the current milestone: Student Profile Management.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

