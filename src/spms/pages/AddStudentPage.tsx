import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import axios from 'axios'
import { createStudent } from '../db/students'

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
}

export function AddStudentPage() {
  const [form, setForm] = useState<FormState>(initial)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<Array<{ section_id: number; year_level: '1st' | '2nd' | '3rd' | '4th'; section: string }>>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)
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
        const msg =
          axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
        if (!alive) return
        setSectionsError(msg || 'Failed to load sections.')
      } finally {
        if (!alive) return
        setSectionsLoading(false)
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
                setSaving(true)
                const student = await createStudent({
                  profilePictureDataUrl: fileDataUrl,
                  firstName: form.firstName,
                  middleName: form.middleName || null,
                  lastName: form.lastName,
                  birthdate: form.birthdate || null,
                  gender: form.gender || null,
                  address: form.address || null,
                  email: form.email || null,
                  contactNumber: form.contactNumber || null,
                  yearLevel: selectedSection?.year_level ?? null,
                  section: form.section || null,
                })
                setSaving(false)
                navigate(`/students/${student.id}`)
              }}
              onReset={() => {
                setForm(initial)
                setFileUrl(null)
                setFileDataUrl(null)
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
                  <label className="form-label fw-semibold">Email</label>
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
                      disabled={sectionsLoading}
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
                    <div className="text-danger small mt-1">{sectionsError}</div>
                  ) : sections.length === 0 && !sectionsLoading ? (
                    <div className="spms-muted small mt-1">No sections found. Create sections first in the Sections module.</div>
                  ) : selectedSection ? (
                    <div className="spms-muted small mt-1">
                      Year Level auto-set to <span className="fw-semibold">{selectedSection.year_level}</span>.
                    </div>
                  ) : null}
                </div>

                <div className="col-12">
                  <div className="d-flex flex-column flex-md-row gap-2 justify-content-end">
                    <button className="btn btn-outline-secondary rounded-4 px-4" type="reset">
                      <i className="bi bi-arrow-counterclockwise me-1" /> Reset
                    </button>
                    <button className="btn btn-primary rounded-4 px-4" type="submit" disabled={saving}>
                      <i className="bi bi-check2-circle me-1" /> {saving ? 'Saving...' : 'Save Student'}
                    </button>
                  </div>
                  <div className="spms-muted small mt-2">Pure React + IndexedDB (stored locally in browser).</div>
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

