/** Client-side routing: this screen is a React Router <Route> target; shown without a full page reload. */
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type UserRow = {
  user_id: number
  username: string
  email: string
  role: 'admin' | 'faculty' | 'student'
  faculty_type?: string | null
  active: number
  created_at?: string | null
}

type FacultyTypePreset = 'Teacher' | 'Coach' | 'Adviser' | 'Other'

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Controlled search input for Part 6 (UsersPage filter).
  const [search, setSearch] = useState('')

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [facultyTypePreset, setFacultyTypePreset] = useState<FacultyTypePreset>('Teacher')
  const [facultyTypeCustom, setFacultyTypeCustom] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const facultyType = useMemo(() => {
    return facultyTypePreset === 'Other' ? facultyTypeCustom.trim() : facultyTypePreset
  }, [facultyTypePreset, facultyTypeCustom])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const roleLabel = u.role === 'admin' ? 'registrar' : u.role
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel.toLowerCase().includes(q) ||
        (u.faculty_type ?? '').toLowerCase().includes(q) ||
        (u.active ? 'active' : 'inactive').includes(q)
      )
    })
  }, [users, search])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ users: UserRow[] }>('/api/users')
      setUsers(res.data.users)
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill out username, email, and password.')
      return
    }

    if (!facultyType) {
      setError('Please select a faculty type.')
      return
    }

    setSubmitting(true)
    try {
      await axios.post('/api/create-user', {
        username: username.trim(),
        email: email.trim(),
        password,
        role: 'faculty',
        faculty_type: facultyType,
      })

      setUsername('')
      setEmail('')
      setPassword('')
      setFacultyTypePreset('Teacher')
      setFacultyTypeCustom('')

      await fetchUsers()
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (u: UserRow) => {
    setError(null)
    try {
      await axios.put(`/api/users/${u.user_id}`, { active: u.active ? 0 : 1 })
      await fetchUsers()
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update user.')
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-4">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Create Account</h6>
            <form onSubmit={handleCreate} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Role</label>
                <input className="form-control" value="Faculty" disabled />
              </div>

              <div>
                <label className="form-label small fw-semibold">Faculty Type</label>
                <select
                  className="form-select"
                  value={facultyTypePreset}
                  onChange={(e) => setFacultyTypePreset(e.target.value as FacultyTypePreset)}
                  disabled={submitting}
                >
                  <option value="Teacher">Teacher</option>
                  <option value="Coach">Coach</option>
                  <option value="Adviser">Adviser</option>
                  <option value="Other">Other</option>
                </select>
                {facultyTypePreset === 'Other' && (
                  <input
                    className="form-control mt-2"
                    placeholder="Enter custom faculty type"
                    value={facultyTypeCustom}
                    onChange={(e) => setFacultyTypeCustom(e.target.value)}
                    disabled={submitting}
                  />
                )}
              </div>

              <div>
                <label className="form-label small fw-semibold">Username</label>
                <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} />
              </div>
              <div>
                <label className="form-label small fw-semibold">Email</label>
                <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
              </div>
              <div>
                <label className="form-label small fw-semibold">Password</label>
                <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
              </div>

              {error && (
                <div className="alert alert-danger py-2 mb-0">
                  <i className="bi bi-exclamation-circle me-2" />
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary rounded-4 py-2 fw-semibold" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="spms-card card border-0 overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
            <h6 className="fw-semibold mb-0">User Accounts</h6>
            <div className="d-flex align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: 260 }}>
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchUsers()} disabled={loading}>
                <i className="bi bi-arrow-clockwise me-1" />
                Refresh
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 spms-muted">Loading users...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead>
                    <tr className="spms-muted small">
                      <th className="ps-4 py-3 fw-semibold">Username</th>
                      <th className="py-3 fw-semibold">Email</th>
                      <th className="py-3 fw-semibold">Role</th>
                      <th className="py-3 fw-semibold">Type</th>
                      <th className="py-3 fw-semibold">Status</th>
                      <th className="pe-4 py-3 fw-semibold text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="ps-4 py-4 spms-muted text-center">
                          No users matched your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.user_id}>
                          <td className="ps-4 py-3 fw-semibold">{u.username}</td>
                          <td className="py-3">{u.email}</td>
                          <td className="py-3 text-capitalize">{u.role === 'admin' ? 'Registrar' : u.role}</td>
                          <td className="py-3">{u.role === 'faculty' ? (u.faculty_type ?? '—') : '—'}</td>
                          <td className="py-3">
                            <span className={`badge ${u.active ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25'}`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="pe-4 py-3 text-end">
                            {u.role === 'admin' ? (
                              <span className="spms-muted small">Protected</span>
                            ) : (
                              <button
                                type="button"
                                className={`btn btn-sm ${u.active ? 'btn-outline-danger' : 'btn-outline-primary'} rounded-3`}
                                onClick={() => void toggleActive(u)}
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

