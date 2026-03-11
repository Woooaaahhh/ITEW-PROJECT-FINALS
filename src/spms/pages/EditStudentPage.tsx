import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { getStudent, updateStudent, type Student } from '../db/students'

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  birthdate: string
  gender: string
  address: string
  email: string
  contactNumber: string
  yearLevel: '' | '1st' | '2nd' | '3rd' | '4th'
  section: string
}

function toForm(s: Student): FormState {
  return {
    firstName: s.firstName ?? '',
    middleName: s.middleName ?? '',
    lastName: s.lastName ?? '',
    birthdate: s.birthdate ?? '',
    gender: s.gender ?? '',
    address: s.address ?? '',
    email: s.email ?? '',
    contactNumber: s.contactNumber ?? '',
    yearLevel: (s.yearLevel as FormState['yearLevel']) ?? '',
    section: s.section ?? '',
  }
}

export function EditStudentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!id) return
      const s = await getStudent(id)
      if (!alive) return
      setStudent(s ?? null)
      setForm(s ? toForm(s) : null)
      setFileDataUrl(s?.profilePictureDataUrl ?? null)
    })()
    return () => {
      alive = false
    }
  }, [id])

  const preview = useMemo(() => fileUrl ?? fileDataUrl ?? avatarUrl, [fileUrl, fileDataUrl])
  const previewClass = useMemo(() => `spms-profile-pic${fileUrl || fileDataUrl ? '' : ' opacity-50'}`, [fileUrl, fileDataUrl])

  if (!id) return null

  if (!form || !student) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="fw-bold fs-5">Student not found</div>
          <div className="spms-muted">Cannot edit because the student does not exist.</div>
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
    <div className="row g-3">
      <div className="col-12 col-xl-8">
        <div className="spms-card card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">Edit Student Information</div>
            <span className="spms-chip">
              <i className="bi bi-pencil-square" /> Update
            </span>
          </div>
          <div className="card-body">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSaving(true)
                await updateStudent(id, {
                  profilePictureDataUrl: fileDataUrl,
                  firstName: form.firstName,
                  middleName: form.middleName || null,
                  lastName: form.lastName,
                  birthdate: form.birthdate || null,
                  gender: form.gender || null,
                  address: form.address || null,
                  email: form.email || null,
                  contactNumber: form.contactNumber || null,
                  yearLevel: form.yearLevel || null,
                  section: form.section || null,
                })
                setSaving(false)
                navigate(`/students/${id}`)
              }}
            >
              <div className="row g-3">
                <div className="col-12">
                  <div className="d-flex align-items-center gap-3">
                    <img className={previewClass} src={preview} alt="Preview" />
                    <div className="flex-grow-1">
                      <label className="form-label fw-semibold">Profile Picture</label>
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
                            reader.onload = () => setFileDataUrl(typeof reader.result === 'string' ? reader.result : null)
                            reader.readAsDataURL(file)
                          }}
                        />
                      </div>
                      <div className="spms-muted small mt-1">Saved in IndexedDB.</div>
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
                      onChange={(e) => setForm((f) => (f ? { ...f, firstName: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, middleName: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, lastName: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, birthdate: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, gender: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, contactNumber: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
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
                      onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Year Level</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-layers" />
                    </span>
                    <select
                      className="form-select"
                      value={form.yearLevel}
                      onChange={(e) => setForm((f) => (f ? { ...f, yearLevel: e.target.value as FormState['yearLevel'] } : f))}
                    >
                      <option value="">Select</option>
                      <option>1st</option>
                      <option>2nd</option>
                      <option>3rd</option>
                      <option>4th</option>
                    </select>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label fw-semibold">Section</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-diagram-3" />
                    </span>
                    <input
                      className="form-control"
                      value={form.section}
                      onChange={(e) => setForm((f) => (f ? { ...f, section: e.target.value } : f))}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="d-flex flex-column flex-md-row gap-2 justify-content-end">
                    <Link className="btn btn-outline-secondary rounded-4 px-4" to={`/students/${id}`}>
                      Cancel
                    </Link>
                    <button className="btn btn-primary rounded-4 px-4" type="submit" disabled={saving}>
                      <i className="bi bi-check2-circle me-1" /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  <div className="spms-muted small mt-2">Changes are saved in IndexedDB.</div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-4">
        <div className="spms-card card">
          <div className="card-header">
            <div className="fw-bold">Editing</div>
          </div>
          <div className="card-body">
            <div className="spms-muted small">You are editing: </div>
            <div className="fw-semibold">{student.firstName + ' ' + (student.lastName ?? '')}</div>
            <hr />
            <div className="spms-muted small">Student ID:</div>
            <div className="fw-semibold">{student.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

