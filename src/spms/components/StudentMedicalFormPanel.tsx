import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getStudent, updateStudent } from '../db/students'
import { nowIso } from '../db/spmsDb'
import type { MedicalClearanceStatus, Student } from '../db/spmsDb'
import {
  getMedicalListStatus,
  isMedicalApprovedForTryouts,
  medicalStatusLabel,
  normalizeMedicalStatus,
} from '../db/medicalClearance'

const MAX_BYTES = 2.5 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export type MedicalFormPanelMode = 'student' | 'staff' | 'readonly'

type StudentMedicalFormPanelProps = {
  studentId: string
  mode?: MedicalFormPanelMode
  /** Omit top status row (clearance + try-out badges) */
  hideStatusBar?: boolean
  /** Hide the title + intro (e.g. when shown inside a modal that already has a header) */
  hideFormTitle?: boolean
  /** Hide “View my profile” (e.g. in modal) */
  hideProfileLink?: boolean
  /** Called after a successful submit (parent can refetch student list / profile) */
  onAfterSave?: () => void
}

export function StudentMedicalFormPanel({
  studentId,
  mode = 'student',
  hideStatusBar,
  hideFormTitle,
  hideProfileLink,
  onAfterSave,
}: StudentMedicalFormPanelProps) {
  const isReadOnly = mode === 'readonly'
  const isStaff = mode === 'staff'

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
  const [facultyNotes, setFacultyNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const s = await getStudent(studentId)
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
        setFacultyNotes(s.medicalClearanceNotes ?? '')
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [studentId])

  const tryoutEligible = useMemo(() => {
    if (!student) return false
    const ids = Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : []
    return isMedicalApprovedForTryouts(student) && ids.length > 0
  }, [student])

  const status = student ? normalizeMedicalStatus(student.medicalClearanceStatus) : 'pending'

  const validateRequiredFields = (): boolean => {
    const p = physician.trim()
    const h = height.trim()
    const w = weight.trim()
    const bp = bloodPressure.trim()
    if (!p) {
      setError("Doctor's name is required.")
      return false
    }
    if (!examDate) {
      setError('Date of examination is required.')
      return false
    }
    if (!h) {
      setError('Height is required.')
      return false
    }
    if (!w) {
      setError('Weight is required.')
      return false
    }
    if (!bp) {
      setError('Blood pressure is required.')
      return false
    }
    return true
  }

  const medicalFieldPatch = () => ({
    medicalHeight: height.trim(),
    medicalWeight: weight.trim(),
    medicalBloodPressure: bloodPressure.trim(),
    medicalCondition: condition.trim() ? condition.trim() : null,
    medicalPhysicianName: physician.trim(),
    medicalExamDate: examDate,
    medicalFormDetails: details.trim() ? details.trim() : null,
    medicalDocumentDataUrl: documentDataUrl,
  })

  const staffSaveRecord = async () => {
    setError(null)
    setSuccess(false)
    if (!validateRequiredFields()) return
    if (!student) return
    setSaving(true)
    try {
      const listBefore = getMedicalListStatus(student)
      const norm = normalizeMedicalStatus(student.medicalClearanceStatus)
      let nextStatus: MedicalClearanceStatus = norm
      if (listBefore === 'not_submitted') nextStatus = 'pending'
      await updateStudent(studentId, {
        ...medicalFieldPatch(),
        medicalSubmittedAt: student.medicalSubmittedAt?.trim() || nowIso(),
        medicalClearanceStatus: nextStatus,
        medicalClearanceNotes: facultyNotes.trim() ? facultyNotes.trim() : null,
      })
      const fresh = await getStudent(studentId)
      setStudent(fresh ?? null)
      setSuccess(true)
      onAfterSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const staffApprove = async () => {
    setError(null)
    setSuccess(false)
    if (!validateRequiredFields()) return
    setSaving(true)
    try {
      await updateStudent(studentId, {
        ...medicalFieldPatch(),
        medicalSubmittedAt: student?.medicalSubmittedAt?.trim() || nowIso(),
        medicalClearanceStatus: 'approved',
        medicalClearanceUpdatedAt: nowIso(),
        medicalClearanceNotes: facultyNotes.trim() ? facultyNotes.trim() : null,
      })
      const fresh = await getStudent(studentId)
      setStudent(fresh ?? null)
      setSuccess(true)
      onAfterSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setSaving(false)
    }
  }

  const staffReject = async () => {
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      await updateStudent(studentId, {
        medicalClearanceStatus: 'rejected',
        medicalClearanceUpdatedAt: nowIso(),
        medicalClearanceNotes: facultyNotes.trim() ? facultyNotes.trim() : null,
      })
      const fresh = await getStudent(studentId)
      setStudent(fresh ?? null)
      setSuccess(true)
      onAfterSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setSaving(false)
    }
  }

  const studentSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!validateRequiredFields()) return
    setSaving(true)
    try {
      await updateStudent(studentId, {
        ...medicalFieldPatch(),
        medicalSubmittedAt: nowIso(),
        medicalClearanceStatus: 'pending',
      })
      const fresh = await getStudent(studentId)
      setStudent(fresh ?? null)
      setSuccess(true)
      onAfterSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const disabled = isReadOnly

  return (
    <div className="d-flex flex-column gap-3">
      {!hideStatusBar ? (
        <div className="spms-card card border-0 mb-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
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
      ) : null}

      {!hideFormTitle ? (
        <div>
          <h5 className="fw-bold mb-1">Medical information for try-outs</h5>
          <p className="spms-muted small mb-0">
            Fill in the form below. You may also attach a PDF or image of your clearance. Submitting sets your status to{' '}
            <strong>Pending</strong> until faculty reviews.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="spms-muted small">Loading…</p>
      ) : (
        <form
          className="d-flex flex-column gap-4"
          onSubmit={mode === 'student' ? studentSubmit : (e) => e.preventDefault()}
        >
          <div className="rounded-3 border p-3 p-md-4 bg-body-tertiary bg-opacity-25">
            <h6 className="small fw-semibold text-uppercase spms-muted mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-activity text-primary" /> Vitals &amp; health
            </h6>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1">Height</label>
                <input
                  className="form-control rounded-3"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 172 cm or 5 ft 8 in"
                  disabled={disabled}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1">Weight</label>
                <input
                  className="form-control rounded-3"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 65 kg"
                  disabled={disabled}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold mb-1">Blood pressure</label>
                <input
                  className="form-control rounded-3"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="e.g. 120/80"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="form-label small fw-semibold mb-1">Medical condition (optional)</label>
              <input
                className="form-control rounded-3"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Allergies, asthma, etc. — leave blank if none"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="rounded-3 border p-3 p-md-4 bg-body-tertiary bg-opacity-25">
            <h6 className="small fw-semibold text-uppercase spms-muted mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-clipboard2-pulse text-primary" /> Examination
            </h6>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold mb-1">Doctor&apos;s name</label>
                <input
                  className="form-control rounded-3"
                  value={physician}
                  onChange={(e) => setPhysician(e.target.value)}
                  placeholder="e.g. Dr. Ana Reyes"
                  disabled={disabled}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold mb-1">Date of examination</label>
                <input
                  type="date"
                  className="form-control rounded-3"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label small fw-semibold mb-1">Additional notes / health status (optional)</label>
              <textarea
                className="form-control rounded-3"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Fit for sports, restrictions, follow-up, etc."
                disabled={disabled}
              />
            </div>
          </div>

          <div className="rounded-3 border p-3 p-md-4 bg-body-tertiary bg-opacity-25">
            <h6 className="small fw-semibold text-uppercase spms-muted mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-medical text-primary" />{' '}
              {isReadOnly ? 'Medical clearance document' : 'Document upload'}
            </h6>
            {isReadOnly ? (
              documentDataUrl ? (
                <div className="small">
                  <div className="fw-semibold mb-2">{documentName || 'File on record'}</div>
                  {documentDataUrl.startsWith('data:image') ? (
                    <img
                      src={documentDataUrl}
                      alt="Medical document"
                      className="img-fluid rounded border"
                      style={{ maxHeight: 320, objectFit: 'contain' }}
                    />
                  ) : null}
                  {documentDataUrl.startsWith('data:application/pdf') ? (
                    <embed
                      src={documentDataUrl}
                      type="application/pdf"
                      className="w-100 rounded border bg-light"
                      style={{ minHeight: 360 }}
                      title="Medical PDF"
                    />
                  ) : null}
                </div>
              ) : (
                <p className="spms-muted small mb-0">No document uploaded.</p>
              )
            ) : (
              <div>
                <label className="form-label small fw-semibold mb-1">Medical clearance document (optional)</label>
                <input
                  type="file"
                  className="form-control rounded-3"
                  accept="image/*,application/pdf"
                  disabled={disabled}
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
            )}
          </div>

          {isStaff ? (
            <div className="rounded-3 border p-3 p-md-4 bg-primary bg-opacity-10 border-primary border-opacity-25">
              <h6 className="small fw-semibold text-uppercase spms-muted mb-2">Faculty review</h6>
              <label className="form-label small fw-semibold mb-1">Review notes (optional)</label>
              <textarea
                className="form-control rounded-3"
                rows={2}
                value={facultyNotes}
                onChange={(e) => setFacultyNotes(e.target.value)}
                placeholder="Notes visible to the student on their profile"
              />
              <p className="spms-muted small mb-0 mt-2">
                <strong>Save</strong> stores vitals and keeps clearance as-is (new records become Pending).{' '}
                <strong>Approve</strong> / <strong>Reject</strong> update clearance status.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-danger py-2 small mb-0" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="alert alert-success py-2 small mb-0" role="alert">
              {mode === 'student' ? (
                <>
                  Submitted. Your status is <strong>Pending</strong> until faculty approves or rejects.
                </>
              ) : (
                <>Saved.</>
              )}
            </div>
          ) : null}

          {mode === 'student' || isStaff ? (
            <div className="d-flex flex-wrap gap-2 pt-1 border-top">
              {mode === 'student' ? (
                <>
                  <button type="submit" className="btn btn-primary rounded-3 px-4" disabled={saving}>
                    {saving ? 'Submitting…' : 'Submit for review'}
                  </button>
                  {!hideProfileLink ? (
                    <Link to={`/students/${studentId}`} className="btn btn-outline-secondary rounded-3 px-4">
                      View my profile
                    </Link>
                  ) : null}
                </>
              ) : null}
              {isStaff ? (
                <>
                  <button type="button" className="btn btn-primary rounded-3 px-3" disabled={saving} onClick={() => void staffSaveRecord()}>
                    {saving ? 'Saving…' : 'Save medical record'}
                  </button>
                  <button type="button" className="btn btn-success rounded-3 px-3" disabled={saving} onClick={() => void staffApprove()}>
                    Approve clearance
                  </button>
                  <button type="button" className="btn btn-outline-danger rounded-3 px-3" disabled={saving} onClick={() => void staffReject()}>
                    Reject clearance
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </form>
      )}
    </div>
  )
}
