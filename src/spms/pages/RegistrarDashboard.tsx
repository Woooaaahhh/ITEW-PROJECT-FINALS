/** Client-side routing (React Router): dashboard quick links via <Link> (no full page reload). */
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatCard } from '../components/StatCard'
import { loadRegistrarDashboardData, type RegistrarDashboardData } from '../dashboards/dashboardAnalytics'

const REG = {
  accent: '#0d9488',
  accentSoft: 'rgba(13, 148, 136, 0.14)',
  gradient: 'linear-gradient(125deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
  chart: ['#0d9488', '#0891b2', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'],
}

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

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="spms-card card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(15, 23, 42, .07)' }}>
      <div className="card-body d-flex flex-column">
        <div className="mb-2">
          <h6 className="fw-bold mb-0 text-body">{title}</h6>
          {subtitle ? <p className="spms-muted small mb-0 mt-1">{subtitle}</p> : null}
        </div>
        <div className="flex-grow-1" style={{ minHeight: 260 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function RegistrarDashboard() {
  const [data, setData] = useState<RegistrarDashboardData | null>(null)
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
      try {
        const d = await loadRegistrarDashboardData()
        if (alive) setData(d)
      } catch {
        if (alive) setData(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const d = data

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
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(f.password)) {
      setFormError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number. Allowed symbols: @$!%*?&')
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
      setData(await loadRegistrarDashboardData())
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
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(f.password)) {
      setFormError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number. Allowed symbols: @$!%*?&')
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
                    style={{ backgroundColor: REG.accent, borderColor: REG.accent }}
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

      <div className="d-flex flex-column gap-4">
        <div
          className="text-white rounded-4 overflow-hidden position-relative"
          style={{
            background: REG.gradient,
            boxShadow: '0 12px 40px rgba(15, 118, 110, .35)',
          }}
        >
          <div className="position-absolute top-0 end-0 opacity-20 d-none d-md-block" aria-hidden style={{ fontSize: 160, lineHeight: 1, transform: 'translate(8%, -25%)' }}>
            <i className="bi bi-clipboard-data" />
          </div>
          <div className="p-4 p-md-5 position-relative">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
              <div>
                <p className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ letterSpacing: '.12em' }}>
                  Registrar office
                </p>
                <h1 className="h3 fw-bold mb-2">Enrollment &amp; records intelligence</h1>
                <p className="text-white text-opacity-90 mb-0 small" style={{ maxWidth: 540 }}>
                  Monitor roster health and clearance mix. SQL-backed accounts stay under{' '}
                  <Link to="/users" className="text-white fw-semibold">
                    Manage Accounts
                  </Link>
                  ; student profiles sync in-browser from your student list.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-light btn-sm rounded-pill px-3 fw-semibold shadow-sm"
                  style={{ color: REG.accent }}
                  onClick={() => setModal('student')}
                >
                  <i className="bi bi-person-plus me-1" />
                  New student login
                </button>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm rounded-pill px-3 border-white border-opacity-40"
                  onClick={() => setModal('faculty')}
                >
                  New faculty login
                </button>
                <Link to="/reports" className="btn btn-outline-light btn-sm rounded-pill px-3 border-white border-opacity-40">
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section>
          <h2 className="h6 text-secondary fw-semibold mb-3">Summary</h2>
          <div className="row g-3">
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-people-fill"
                value={loading ? '—' : (d?.totalStudents ?? 0)}
                description="Total students (profiles)"
                iconBg={REG.accentSoft}
                iconColor={REG.accent}
              />
            </div>
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-envelope-check"
                value={loading ? '—' : (d?.withEmail ?? 0)}
                description="With email on file"
                iconBg="rgba(59, 130, 246, 0.12)"
                iconColor="#2563eb"
              />
            </div>
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-diagram-3"
                value={loading ? '—' : (d?.uniqueSections ?? 0)}
                description="Distinct year · section pairs"
                iconBg="rgba(99, 102, 241, 0.12)"
                iconColor="#4f46e5"
              />
            </div>
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-calendar-plus"
                value={loading ? '—' : (d?.addedLast30Days ?? 0)}
                description="New profiles (30 days)"
                iconBg="rgba(16, 185, 129, 0.14)"
                iconColor="#059669"
              />
            </div>
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-exclamation-octagon"
                value={loading ? '—' : (d?.totalViolations ?? 0)}
                description="Violations (all students)"
                iconBg="rgba(245, 158, 11, 0.18)"
                iconColor="#d97706"
              />
            </div>
            <div className="col-6 col-lg-4 col-xl-2">
              <StatCard
                icon="bi-stars"
                value={loading ? '—' : (d?.totalAchievements ?? 0)}
                description="Non-academic achievements"
                iconBg="rgba(168, 85, 247, 0.14)"
                iconColor="#9333ea"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="h6 text-secondary fw-semibold mb-3">Analytics</h2>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <ChartCard title="Students by year level" subtitle="IndexedDB roster distribution.">
                {loading || !d ? (
                  <div className="spms-muted small d-flex align-items-center justify-content-center h-100">Loading…</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.byYearLevel} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students" fill={REG.accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <div className="col-12 col-lg-6">
              <ChartCard title="Medical clearance mix" subtitle="Snapshot from student health fields.">
                {loading || !d ? (
                  <div className="spms-muted small d-flex align-items-center justify-content-center h-100">Loading…</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={d.medicalMix}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {d.medicalMix.map((_, i) => (
                          <Cell key={i} fill={REG.chart[i % REG.chart.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [Number(v ?? 0), 'Students']} />
                      <Legend verticalAlign="bottom" height={32} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </div>
        </section>

        <section>
          <h2 className="h6 text-secondary fw-semibold mb-3">Recently added students</h2>
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 24px rgba(15, 23, 42, .07)' }}>
            <div className="card-body p-0">
              {loading || !d ? (
                <div className="p-4 spms-muted small">Loading…</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Student</th>
                        <th>Section</th>
                        <th>Created</th>
                        <th className="text-end pe-4">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentStudents.map((row) => (
                        <tr key={row.id}>
                          <td className="ps-4 fw-semibold">{row.name}</td>
                          <td className="spms-muted small">{row.section}</td>
                          <td className="spms-muted small">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="text-end pe-4">
                            <Link to={`/students/${row.id}`} className="btn btn-sm btn-outline-secondary rounded-pill">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
