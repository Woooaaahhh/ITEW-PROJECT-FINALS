/** Client-side routing (React Router): after save, useNavigate to profile (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import axios from 'axios'
import { createStudent, seedIfEmpty } from '../db/students'

const apiPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  birthdate: string
  gender: string
  address: string
  email: string
  contactNumber: string
  section: string
  /** Used when /api/sections is empty or unreachable */
  manualYearLevel: '' | '1st' | '2nd' | '3rd' | '4th'
  manualSection: string
  // Account creation fields
  gmail: string
  password: string
  confirmPassword: string
}


const initial: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  birthdate: '',
  gender: '',
  address: '',
  email: '',
  contactNumber: '',
  section: '',
  manualYearLevel: '',
  manualSection: '',
  gmail: '',
  password: '',
  confirmPassword: '',
}

export function AddStudentPage() {
  const [form, setForm] = useState<FormState>(initial)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<Array<{ section_id: number; year_level: '1st' | '2nd' | '3rd' | '4th'; section: string }>>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()

  const preview = fileUrl ?? avatarUrl
  const previewClass = useMemo(() => `spms-profile-pic${fileUrl ? '' : ' opacity-50'}`, [fileUrl])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setSectionsLoading(true)
      setSectionsError(null)
      try {
        const res = await axios.get<{ sections: Array<{ section_id: number; year_level: string; section: string }> }>('/api/sections')
        if (!alive) return
        const mapped = res.data.sections
          .map((s) => ({
            section_id: s.section_id,
            year_level: s.year_level as '1st' | '2nd' | '3rd' | '4th',
            section: s.section,
          }))
          .filter((s) => !!s.year_level && !!s.section)
        setSections(mapped)
      } catch (e: unknown) {
        let msg = 'Failed to load sections.'
        if (axios.isAxiosError(e)) {
          if (!e.response) {
            msg = 'Cannot reach API (is it running?). Use manual year level & section, or run npm run dev:all.'
          } else {
            msg = (e.response?.data as { message?: string } | undefined)?.message || msg
          }
        }
        if (!alive) return
        setSectionsError(msg)
      } finally {
        if (!alive) return
        setSectionsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await seedIfEmpty()
      } catch {
        if (!alive) return
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const selectedSection = useMemo(() => {
    if (!form.section) return null
    return sections.find((s) => s.section === form.section) ?? null
  }, [sections, form.section])

  const canUseApiSections = sections.length > 0 && !sectionsError

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-8">
        <div className="spms-card card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">Student Information</div>
            <span className="spms-chip">
              <i className="bi bi-shield-lock" /> Secure record
            </span>
          </div>
          <div className="card-body">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSubmitError(null)
                const fn = form.firstName.trim()
                const ln = form.lastName.trim()
                if (!fn || !ln) {
                  setSubmitError('First name and last name are required.')
                  return
                }
                const emailVal = form.email.trim().toLowerCase()
                if (!emailVal) {
                  setSubmitError('School email is required to create a MongoDB student account.')
                  return
                }
                // Validate Gmail for account creation
                const gmailVal = form.gmail.trim().toLowerCase()
                if (!gmailVal) {
                  setSubmitError('Gmail address is required for student account creation.')
                  return
                }
                if (!gmailVal.endsWith('@gmail.com')) {
                  setSubmitError('Student account must use a Gmail address (@gmail.com).')
                  return
                }
                // Validate password
                const passwordVal = form.password
                if (!passwordVal) {
                  setSubmitError('Password is required for student account creation.')
                  return
                }
                if (passwordVal.length < 8) {
                  setSubmitError('Password must be at least 8 characters long.')
                  return
                }
                if (!apiPasswordRegex.test(passwordVal)) {
                  setSubmitError(
                    'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number. Allowed symbols: @$!%*?&',
                  )
                  return
                }
                if (passwordVal !== form.confirmPassword) {
                  setSubmitError('Password and confirm password do not match.')
                  return
                }

                let yearLevel: string | null = null
                let sectionVal: string | null = null
                if (canUseApiSections) {
                  if (!form.section) {
                    setSubmitError('Please select a section from the list.')
                    return
                  }
                  yearLevel = selectedSection?.year_level ?? null
                  sectionVal = form.section || null
                } else {
                  if (!form.manualYearLevel || !form.manualSection.trim()) {
                    setSubmitError(
                      'Enter year level and section name, or start the API (npm run dev:all) to load sections from the server.',
                    )
                    return
                  }
                  yearLevel = form.manualYearLevel
                  sectionVal = form.manualSection.trim()
                }

                setSaving(true)
                try {
                  // Create student account with Gmail as username
                  await axios.post('/api/create-user', {
                    username: gmailVal, // Gmail will be used as username
                    email: gmailVal, // Use Gmail for account
                    password: passwordVal,
                    role: 'student',
                    student: {
                      first_name: fn,
                      last_name: ln,
                      year_level: yearLevel,
                      section: sectionVal,
                    },
                  })

                  const student = await createStudent({
                    profilePictureDataUrl: fileDataUrl,
                    firstName: fn,
                    middleName: form.middleName.trim() || null,
                    lastName: ln,
                    birthdate: form.birthdate || null,
                    gender: form.gender || null,
                    address: form.address.trim() || null,
                    email: emailVal || null,
                    contactNumber: form.contactNumber.trim() || null,
                    yearLevel,
                    section: sectionVal,
                  })
                  navigate(`/students/${student.id}`)
                } catch (err) {
                  if (axios.isAxiosError(err)) {
                    const status = err.response?.status
                    const msg = (err.response?.data as { message?: string } | undefined)?.message
                    if (status === 409) {
                      setSubmitError(msg || 'Student account already exists. Try a different email.')
                    } else if (!err.response) {
                      setSubmitError('Cannot reach API. Start backend with npm run dev:all, then try again.')
                    } else {
                      setSubmitError(msg || 'Could not save to MongoDB.')
                    }
                  } else {
                    setSubmitError(err instanceof Error ? err.message : 'Could not save student.')
                  }
                } finally {
                  setSaving(false)
                }
              }}
              onReset={() => {
                setForm(initial)
                setFileUrl(null)
                setFileDataUrl(null)
                setSubmitError(null)
              }}
            >
              <div className="row g-3">
                <div className="col-12">
                  <div className="d-flex align-items-center gap-3">
                    <img className={previewClass} src={preview} alt="Preview" />
                    <div className="flex-grow-1">
                      <label className="form-label fw-semibold">Profile Picture Upload</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-image" />
                        </span>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const url = URL.createObjectURL(file)
                            setFileUrl((prev) => {
                              if (prev) URL.revokeObjectURL(prev)
                              return url
                            })
                            const reader = new FileReader()
                            reader.onload = () => {
                              setFileDataUrl(typeof reader.result === 'string' ? reader.result : null)
                            }
                            reader.readAsDataURL(file)
                          }}
                        />
                      </div>
                      <div className="spms-muted small mt-1">Accepted: JPG, PNG. Saved in IndexedDB.</div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">First Name</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-person" />
                    </span>
                    <input
                      className="form-control"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                      required
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">Middle Name</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-person" />
                    </span>
                    <input
                      className="form-control"
                      value={form.middleName}
                      onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))}
                      placeholder="Middle name"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">Last Name</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-person" />
                    </span>
                    <input
                      className="form-control"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">Birthdate</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-calendar3" />
                    </span>
                    <input
                      className="form-control"
                      type="date"
                      value={form.birthdate}
                      onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">Gender</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-gender-ambiguous" />
                    </span>
                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    >
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold">Contact Number</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-telephone" />
                    </span>
                    <input
                      className="form-control"
                      value={form.contactNumber}
                      onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                      placeholder="09xx xxx xxxx"
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">School Email</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-envelope" />
                    </span>
                    <input
                      className="form-control"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="name@school.edu"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Address</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-geo-alt" />
                    </span>
                    <input
                      className="form-control"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Complete address"
                    />
                  </div>
                </div>

                <div className="col-12">
                  <h6 className="fw-semibold text-primary mt-3">
                    <i className="bi bi-person-plus me-2" />Student Account Creation
                  </h6>
                  <div className="alert alert-info" role="alert">
                    <i className="bi bi-info-circle me-2" />
                    Student accounts are created automatically. The Gmail address will be used as the login username.
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Gmail Address (Username)</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-google" />
                    </span>
                    <input
                      className="form-control"
                      type="email"
                      value={form.gmail}
                      onChange={(e) => setForm((f) => ({ ...f, gmail: e.target.value }))}
                      placeholder="student@gmail.com"
                      required
                    />
                  </div>
                  <div className="spms-muted small mt-1">Must be a valid Gmail address (@gmail.com). This will be the student's login username.</div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Password</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock" />
                    </span>
                    <input
                      className="form-control"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div className="spms-muted small mt-1">Minimum 8 characters with 1 uppercase, 1 lowercase, and 1 number.</div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Confirm Password</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock-fill" />
                    </span>
                    <input
                      className="form-control"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Section</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-diagram-3" />
                    </span>
                    <select
                      className="form-select"
                      value={form.section}
                      onChange={(e) => {
                        const v = e.target.value
                        setForm((f) => ({ ...f, section: v }))
                      }}
                      disabled={sectionsLoading || !canUseApiSections}
                    >
                      <option value="">{sectionsLoading ? 'Loading...' : 'Select'}</option>
                      {sections.map((s) => (
                        <option key={s.section_id} value={s.section}>
                          {s.section} ({s.year_level})
                        </option>
                      ))}
                    </select>
                  </div>
                  {sectionsError ? (
                    <div className="text-danger small mt-1">
                      {sectionsError}{' '}
                      <span className="text-body">You can use manual year level and section below.</span>
                    </div>
                  ) : sections.length === 0 && !sectionsLoading ? (
                    <div className="spms-muted small mt-1">
                      No sections from server. Use manual fields below, or run <code className="small">npm run dev:all</code> and add
                      sections under Sections.
                    </div>
                  ) : selectedSection ? (
                    <div className="spms-muted small mt-1">
                      Year Level auto-set to <span className="fw-semibold">{selectedSection.year_level}</span>.
                    </div>
                  ) : null}
                </div>

                {!canUseApiSections ? (
                  <>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Year level (manual)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-layers" />
                        </span>
                        <select
                          className="form-select"
                          value={form.manualYearLevel}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              manualYearLevel: e.target.value as FormState['manualYearLevel'],
                            }))
                          }
                        >
                          <option value="">Select</option>
                          <option value="1st">1st</option>
                          <option value="2nd">2nd</option>
                          <option value="3rd">3rd</option>
                          <option value="4th">4th</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Section name (manual)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-pencil" />
                        </span>
                        <input
                          className="form-control"
                          value={form.manualSection}
                          onChange={(e) => setForm((f) => ({ ...f, manualSection: e.target.value }))}
                          placeholder="e.g. BSIT-2A"
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="col-12">
                  {submitError ? (
                    <div className="alert alert-danger" role="alert">
                      {submitError}
                    </div>
                  ) : null}
                  <div className="d-flex flex-column flex-md-row gap-2 justify-content-end">
                    <button className="btn btn-outline-secondary rounded-4 px-4" type="reset">
                      <i className="bi bi-arrow-counterclockwise me-1" /> Reset
                    </button>
                    <button className="btn btn-primary rounded-4 px-4" type="submit" disabled={saving}>
                      <i className="bi bi-check2-circle me-1" /> {saving ? 'Saving...' : 'Save Student'}
                    </button>
                  </div>
                  <div className="spms-muted small mt-2">Students are saved to MongoDB and mirrored in this browser&apos;s IndexedDB.</div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-4">
        <div className="spms-card card">
          <div className="card-header">
            <div className="fw-bold">Form Tips</div>
          </div>
          <div className="card-body">
            <div className="d-flex gap-2">
              <div
                className="icon"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(37,99,235,.12)',
                  border: '1px solid rgba(37,99,235,.20)',
                  color: '#1d4ed8',
                }}
              >
                <i className="bi bi-lightning-charge" />
              </div>
              <div>
                <div className="fw-semibold">Fast encoding</div>
                <div className="spms-muted small">Use complete names and a valid school email.</div>
              </div>
            </div>
            <hr />
            <div className="d-flex gap-2">
              <div
                className="icon"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(37,99,235,.12)',
                  border: '1px solid rgba(37,99,235,.20)',
                  color: '#1d4ed8',
                }}
              >
                <i className="bi bi-shield-check" />
              </div>
              <div>
                <div className="fw-semibold">Data quality</div>
                <div className="spms-muted small">Year level & section should match school records.</div>
              </div>
            </div>
            <hr />
            <div className="d-flex gap-2">
              <div
                className="icon"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(37,99,235,.12)',
                  border: '1px solid rgba(37,99,235,.20)',
                  color: '#1d4ed8',
                }}
              >
                <i className="bi bi-link-45deg" />
              </div>
              <div>
                <div className="fw-semibold">Navigation</div>
                <div className="spms-muted small">
                  Go back to Student List using the sidebar.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

