import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudent, updateStudent } from '../db/students'
import { nowIso } from '../db/spmsDb'
import type { Student } from '../db/spmsDb'
import { isMedicalApprovedForTryouts, medicalStatusLabel, normalizeMedicalStatus } from '../db/medicalClearance'

const MAX_BYTES = 2.5 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export function StudentMedicalSubmitPage() {
  const { user } = useAuth()
  const sid = user?.studentId
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [condition, setCondition] = useState('')
  const [physician, setPhysician] = useState('')
  const [examDate, setExamDate] = useState('')
  const [details, setDetails] = useState('')
  const [documentDataUrl, setDocumentDataUrl] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!sid) {
        setLoading(false)
        return
      }
      setLoading(true)
      const s = await getStudent(sid)
      if (!alive) return
      setStudent(s ?? null)
      if (s) {
        setHeight(s.medicalHeight ?? '')
        setWeight(s.medicalWeight ?? '')
        setBloodPressure(s.medicalBloodPressure ?? '')
        setCondition(s.medicalCondition ?? '')
        setPhysician(s.medicalPhysicianName ?? '')
        setExamDate(s.medicalExamDate ?? '')
        setDetails(s.medicalFormDetails ?? '')
        setDocumentDataUrl(s.medicalDocumentDataUrl ?? null)
        setDocumentName(s.medicalDocumentDataUrl ? 'Previously uploaded file' : '')
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [sid])

  const tryoutEligible = useMemo(() => {
    if (!student) return false
    const ids = Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : []
    return isMedicalApprovedForTryouts(student) && ids.length > 0
  }, [student])

  if (!user || user.role !== 'student') {
    return (
      <div className="spms-card card">
        <div className="card-body">This page is for student accounts only.</div>
      </div>
    )
  }

  if (!sid) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <p className="mb-2">Your login is not linked to a student record.</p>
          <Link to="/student" className="btn btn-outline-primary rounded-3">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const status = student ? normalizeMedicalStatus(student.medicalClearanceStatus) : 'pending'

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-9">
        <div className="spms-card card border-0 mb-3" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body py-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-6">
                <div className="small spms-muted mb-1">Medical clearance status</div>
                <span
                  className={`badge rounded-pill px-3 py-2 ${
                    status === 'approved'
                      ? 'bg-success-subtle text-success border border-success-subtle'
                      : status === 'rejected'
                        ? 'bg-danger-subtle text-danger border border-danger-subtle'
                        : 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                  }`}
                >
                  {medicalStatusLabel(status)}
                </span>
              </div>
              <div className="col-md-6">
                <div className="small spms-muted mb-1">Sports try-out eligibility</div>
                <span
                  className={`badge rounded-pill px-3 py-2 ${
                    tryoutEligible ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-secondary border'
                  }`}
                >
                  {tryoutEligible ? 'Eligible (approved + sport assigned)' : 'Not yet eligible'}
                </span>
                {!tryoutEligible ? (
                  <p className="small spms-muted mb-0 mt-2">
                    You need <strong>Approved</strong> medical clearance and at least one sport assigned by faculty.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h5 className="fw-bold mb-1">Medical information for try-outs</h5>
                <p className="spms-muted small mb-0">
                  Fill in the form below. You may also attach a PDF or image of your clearance. Submitting sets your
                  status to <strong>Pending</strong> until faculty reviews.
                </p>
              </div>
              <Link to="/student" className="btn btn-sm btn-outline-secondary rounded-3">
                <i className="bi bi-arrow-left me-1" /> Dashboard
              </Link>
            </div>

            {loading ? (
              <p className="spms-muted small">Loading…</p>
            ) : (
              <form
                className="d-flex flex-column gap-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setError(null)
                  setSuccess(false)
                  const p = physician.trim()
                  const h = height.trim()
                  const w = weight.trim()
                  const bp = bloodPressure.trim()
                  if (!p) {
                    setError("Doctor's name is required.")
                    return
                  }
                  if (!examDate) {
                    setError('Date of examination is required.')
                    return
                  }
                  if (!h) {
                    setError('Height is required.')
                    return
                  }
                  if (!w) {
                    setError('Weight is required.')
                    return
                  }
                  if (!bp) {
                    setError('Blood pressure is required.')
                    return
                  }
                  setSaving(true)
                  try {
                    await updateStudent(sid, {
                      medicalHeight: h,
                      medicalWeight: w,
                      medicalBloodPressure: bp,
                      medicalCondition: condition.trim() ? condition.trim() : null,
                      medicalPhysicianName: p,
                      medicalExamDate: examDate,
                      medicalFormDetails: details.trim() ? details.trim() : null,
                      medicalDocumentDataUrl: documentDataUrl,
                      medicalSubmittedAt: nowIso(),
                      medicalClearanceStatus: 'pending',
                    })
                    const fresh = await getStudent(sid)
                    setStudent(fresh ?? null)
                    setSuccess(true)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Save failed')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <h6 className="small fw-semibold text-uppercase spms-muted mb-0">Vitals & health</h6>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold mb-1">Height</label>
                    <input
                      className="form-control rounded-3"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 172 cm or 5 ft 8 in"
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold mb-1">Weight</label>
                    <input
                      className="form-control rounded-3"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 65 kg"
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold mb-1">Blood pressure</label>
                    <input
                      className="form-control rounded-3"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="e.g. 120/80"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label small fw-semibold mb-1">Medical condition (optional)</label>
                  <input
                    className="form-control rounded-3"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Allergies, asthma, etc. — leave blank if none"
                  />
                </div>

                <h6 className="small fw-semibold text-uppercase spms-muted mb-0 pt-1">Examination</h6>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold mb-1">Doctor&apos;s name</label>
                    <input
                      className="form-control rounded-3"
                      value={physician}
                      onChange={(e) => setPhysician(e.target.value)}
                      placeholder="e.g. Dr. Ana Reyes"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold mb-1">Date of examination</label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label small fw-semibold mb-1">Additional notes / health status (optional)</label>
                  <textarea
                    className="form-control rounded-3"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Fit for sports, restrictions, follow-up, etc."
                  />
                </div>

                <div>
                  <label className="form-label small fw-semibold mb-1">Medical clearance document (optional)</label>
                  <input
                    type="file"
                    className="form-control rounded-3"
                    accept="image/*,application/pdf"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > MAX_BYTES) {
                        setError(`File is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`)
                        return
                      }
                      setError(null)
                      try {
                        const url = await readFileAsDataUrl(f)
                        setDocumentDataUrl(url)
                        setDocumentName(f.name)
                      } catch {
                        setError('Could not read the file.')
                      }
                    }}
                  />
                  {documentDataUrl ? (
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                      <span className="small text-success">
                        <i className="bi bi-paperclip me-1" />
                        {documentName || 'File attached'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => {
                          setDocumentDataUrl(null)
                          setDocumentName('')
                        }}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="spms-muted small mt-1">Upload a PDF or image if you have a signed clearance.</div>
                  )}
                </div>

                {error ? (
                  <div className="alert alert-danger py-2 small mb-0" role="alert">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="alert alert-success py-2 small mb-0" role="alert">
                    Submitted. Your status is <strong>Pending</strong> until faculty approves or rejects.
                  </div>
                ) : null}

                <div className="d-flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-primary rounded-3 px-4" disabled={saving}>
                    {saving ? 'Submitting…' : 'Submit for review'}
                  </button>
                  <Link to={`/students/${sid}`} className="btn btn-outline-secondary rounded-3 px-4">
                    View my profile
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
