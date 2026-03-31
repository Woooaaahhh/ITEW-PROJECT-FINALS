import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { StatCard } from '../components/StatCard'
import { StudentTable } from '../components/StudentTable'

type CreateStudentPayload = {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  year_level: string
  section: string
}

type CreateFacultyPayload = {
  username: string
  email: string
  password: string
  faculty_type: 'Teacher' | 'Coach' | 'Adviser' | string
}

export function RegistrarDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'student' | 'faculty'>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [studentForm, setStudentForm] = useState<CreateStudentPayload>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    year_level: '',
    section: '',
  })

  const [facultyPreset, setFacultyPreset] = useState<'Teacher' | 'Coach' | 'Adviser' | 'Other'>('Teacher')
  const [facultyOther, setFacultyOther] = useState('')
  const [facultyForm, setFacultyForm] = useState<Omit<CreateFacultyPayload, 'faculty_type'>>({
    username: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const total = students.length
  const withEmail = useMemo(() => students.filter((s) => !!s.email).length, [students])
  const withSection = useMemo(() => students.filter((s) => !!s.section).length, [students])
  const lastUpdated = students[0]?.updatedAt
    ? new Date(students[0].updatedAt).toLocaleDateString(undefined, { dateStyle: 'short' })
    : '—'

  const quickActions = [
    {
      to: '/students',
      icon: 'bi-people',
      label: 'View Student List',
      desc: 'Open any profile to verify violations & achievements',
    },
    { to: '/users', icon: 'bi-person-gear', label: 'Manage Accounts', desc: 'Create faculty & student logins' },
    { to: '/sections', icon: 'bi-diagram-3', label: 'Manage Sections', desc: 'Section setup' },
    { to: '/reports', icon: 'bi-file-earmark-bar-graph', label: 'Generate Reports', desc: 'Export & print' },
  ]

  const closeModal = () => {
    setModal(null)
    setFormError(null)
    setSubmitting(false)
  }

  const createStudentAccount = async () => {
    setFormError(null)
    const f = studentForm
    if (!f.username.trim() || !f.email.trim() || !f.password || !f.first_name.trim() || !f.last_name.trim() || !f.year_level.trim() || !f.section.trim()) {
      setFormError('Please fill out all fields.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/create-user', {
        role: 'student',
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        student: {
          first_name: f.first_name.trim(),
          last_name: f.last_name.trim(),
          year_level: f.year_level.trim(),
          section: f.section.trim(),
        },
      })
      setStudentForm({ username: '', email: '', password: '', first_name: '', last_name: '', year_level: '', section: '' })
      closeModal()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setFormError(msg || 'Failed to create student account.')
    } finally {
      setSubmitting(false)
    }
  }

  const createFacultyAccount = async () => {
    setFormError(null)
    const f = facultyForm
    const faculty_type = facultyPreset === 'Other' ? facultyOther.trim() : facultyPreset
    if (!f.username.trim() || !f.email.trim() || !f.password || !faculty_type) {
      setFormError('Please fill out all fields.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/create-user', {
        role: 'faculty',
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        faculty_type,
      })
      setFacultyForm({ username: '', email: '', password: '' })
      setFacultyPreset('Teacher')
      setFacultyOther('')
      closeModal()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setFormError(msg || 'Failed to create faculty account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {modal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">
                    {modal === 'student' ? 'Add Student Account' : 'Add Faculty Account'}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  {modal === 'student' ? (
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Username</label>
                        <input className="form-control" value={studentForm.username} onChange={(e) => setStudentForm((s) => ({ ...s, username: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Email</label>
                        <input className="form-control" value={studentForm.email} onChange={(e) => setStudentForm((s) => ({ ...s, email: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Password</label>
                        <input type="password" className="form-control" value={studentForm.password} onChange={(e) => setStudentForm((s) => ({ ...s, password: e.target.value }))} disabled={submitting} />
                      </div>

                      <div className="col-6">
                        <label className="form-label small fw-semibold">First Name</label>
                        <input className="form-control" value={studentForm.first_name} onChange={(e) => setStudentForm((s) => ({ ...s, first_name: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Last Name</label>
                        <input className="form-control" value={studentForm.last_name} onChange={(e) => setStudentForm((s) => ({ ...s, last_name: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Year Level</label>
                        <input className="form-control" value={studentForm.year_level} onChange={(e) => setStudentForm((s) => ({ ...s, year_level: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-6">
                        <label className="form-label small fw-semibold">Section</label>
                        <input className="form-control" value={studentForm.section} onChange={(e) => setStudentForm((s) => ({ ...s, section: e.target.value }))} disabled={submitting} />
                      </div>
                    </div>
                  ) : (
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Username</label>
                        <input className="form-control" value={facultyForm.username} onChange={(e) => setFacultyForm((s) => ({ ...s, username: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Email</label>
                        <input className="form-control" value={facultyForm.email} onChange={(e) => setFacultyForm((s) => ({ ...s, email: e.target.value }))} disabled={submitting} />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Password</label>
                        <input type="password" className="form-control" value={facultyForm.password} onChange={(e) => setFacultyForm((s) => ({ ...s, password: e.target.value }))} disabled={submitting} />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold">Faculty Type</label>
                        <select className="form-select" value={facultyPreset} onChange={(e) => setFacultyPreset(e.target.value as typeof facultyPreset)} disabled={submitting}>
                          <option value="Teacher">Teacher</option>
                          <option value="Coach">Coach</option>
                          <option value="Adviser">Adviser</option>
                          <option value="Other">Other</option>
                        </select>
                        {facultyPreset === 'Other' && (
                          <input className="form-control mt-2" placeholder="Enter custom type" value={facultyOther} onChange={(e) => setFacultyOther(e.target.value)} disabled={submitting} />
                        )}
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="alert alert-danger py-2 mt-3 mb-0">
                      <i className="bi bi-exclamation-circle me-2" />
                      {formError}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary rounded-3"
                    onClick={modal === 'student' ? () => void createStudentAccount() : () => void createFacultyAccount()}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal} />
        </>
      )}

      <div className="row g-4">
      <div className="col-12 col-xl-9">
        <section className="mb-4">
          <h6 className="text-secondary fw-semibold mb-3">Overview</h6>
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-people-fill"
                value={loading ? '—' : total}
                description="Total Students"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-envelope"
                value={loading ? '—' : withEmail}
                description="Students With Email"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-diagram-3"
                value={loading ? '—' : withSection}
                description="With Assigned Section"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="bi-clock-history"
                value={lastUpdated}
                description="Recently Updated Record"
              />
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h6 className="text-secondary fw-semibold mb-3">Quick Actions</h6>
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <button
                type="button"
                className="spms-card card border-0 text-body h-100 d-block w-100"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(15, 23, 42, .06)',
                  transition: 'box-shadow .2s ease, transform .2s ease',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(15, 23, 42, .1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, .06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onClick={() => setModal('student')}
              >
                <div className="card-body text-center py-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
                    style={{ width: 44, height: 44, background: 'rgba(37, 99, 235, .1)', color: 'var(--spms-primary)' }}
                  >
                    <i className="bi bi-person-plus fs-5" />
                  </div>
                  <div className="fw-semibold small">Add Student</div>
                  <div className="spms-muted" style={{ fontSize: '.75rem' }}>Create student account</div>
                </div>
              </button>
            </div>

            <div className="col-6 col-lg-3">
              <button
                type="button"
                className="spms-card card border-0 text-body h-100 d-block w-100"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 4px 20px rgba(15, 23, 42, .06)',
                  transition: 'box-shadow .2s ease, transform .2s ease',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(15, 23, 42, .1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, .06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                onClick={() => setModal('faculty')}
              >
                <div className="card-body text-center py-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
                    style={{ width: 44, height: 44, background: 'rgba(37, 99, 235, .1)', color: 'var(--spms-primary)' }}
                  >
                    <i className="bi bi-person-badge fs-5" />
                  </div>
                  <div className="fw-semibold small">Add Faculty</div>
                  <div className="spms-muted" style={{ fontSize: '.75rem' }}>Create faculty account</div>
                </div>
              </button>
            </div>

            {quickActions.map((a) => (
              <div key={a.to} className="col-6 col-lg-3">
                <Link
                  to={a.to}
                  className="spms-card card border-0 text-decoration-none text-body h-100 d-block"
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 4px 20px rgba(15, 23, 42, .06)',
                    transition: 'box-shadow .2s ease, transform .2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(15, 23, 42, .1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, .06)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div className="card-body text-center py-4">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2"
                      style={{ width: 44, height: 44, background: 'rgba(37, 99, 235, .1)', color: 'var(--spms-primary)' }}
                    >
                      <i className={`bi ${a.icon} fs-5`} />
                    </div>
                    <div className="fw-semibold small">{a.label}</div>
                    <div className="spms-muted" style={{ fontSize: '.75rem' }}>{a.desc}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h6 className="text-secondary fw-semibold mb-3">Recently Updated Students</h6>
          <StudentTable students={students} loading={loading} />
        </section>
      </div>

      <div className="col-12 col-xl-3">
        <div
          className="spms-card card border-0 sticky-top"
          style={{ top: 80, zIndex: 1010, borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
        >
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Quick Actions</h6>
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-primary rounded-3 py-2 text-start" onClick={() => setModal('student')}>
                <i className="bi bi-person-plus me-2" />
                Add Student Account
              </button>
              <button type="button" className="btn btn-outline-primary rounded-3 py-2 text-start" onClick={() => setModal('faculty')}>
                <i className="bi bi-person-badge me-2" />
                Add Faculty Account
              </button>
              <Link to="/users" className="btn btn-outline-primary rounded-3 py-2 text-start">
                <i className="bi bi-person-gear me-2" />
                Create / Manage Accounts
              </Link>
              <Link to="/students" className="btn btn-outline-secondary rounded-3 py-2 text-start">
                <i className="bi bi-people me-2" />
                View Student List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
