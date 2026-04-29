import { useMemo, useState } from 'react'
import {
  ACADEMIC_SEMESTERS,
  addAcademicRecord,
  getCurrentAcademicRecord,
  isCurrentAcademicRecord,
  listAcademicRecordsSortedNewestFirst,
  updateAcademicRecord,
  type AcademicRecord,
  type AcademicSemesterLabel,
} from '../db/academicRecords'

export function ProfileCurrentAcademicBanner({ studentId }: { studentId: string }) {
  const current = useMemo(() => getCurrentAcademicRecord(studentId), [studentId])

  if (!current) {
    return (
      <div className="spms-card card border-0" style={{ borderRadius: 16 }}>
        <div className="card-body py-3 d-flex align-items-center gap-3 flex-wrap">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-primary"
            style={{ width: 44, height: 44, background: 'rgba(59, 130, 246, .12)' }}
          >
            <i className="bi bi-graph-up-arrow fs-5" />
          </div>
          <div>
            <div className="fw-bold">Current academic status</div>
            <div className="spms-muted small mb-0">No academic record on file yet.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="spms-card card border-0 text-white"
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #0ea5e9 100%)',
        boxShadow: '0 8px 24px rgba(29, 78, 216, .25)',
      }}
    >
      <div className="card-body py-3 px-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-white bg-opacity-25"
              style={{ width: 48, height: 48 }}
            >
              <i className="bi bi-mortarboard fs-4" />
            </div>
            <div>
              <div className="small text-white text-opacity-75 text-uppercase fw-semibold" style={{ letterSpacing: '.04em' }}>
                Current academic record
              </div>
              <div className="fs-5 fw-bold">
                {current.schoolYear} · {current.semester}
              </div>
              <div className="small text-white text-opacity-90">
                GWA <span className="fw-bold">{current.gwa.toFixed(2)}</span>
                {current.honors ? (
                  <>
                    {' '}
                    · <span className="fw-semibold">{current.honors}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <span className="badge bg-white text-primary px-3 py-2 rounded-pill fw-semibold">Latest term</span>
        </div>
      </div>
    </div>
  )
}

type AcademicHistoryCardProps = {
  studentId: string
  showFacultyForm: boolean
  /** Root card class (default `spms-card` for faculty pages; use `spms-profile-section-card` on student profile). */
  cardClassName?: string
}

export function ProfileAcademicHistoryCard({
  studentId,
  showFacultyForm,
  cardClassName = 'spms-card',
}: AcademicHistoryCardProps) {
  const [tick, setTick] = useState(0)
  const records = useMemo(() => listAcademicRecordsSortedNewestFirst(studentId), [studentId, tick])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [schoolYear, setSchoolYear] = useState('')
  const [semester, setSemester] = useState<AcademicSemesterLabel>('1st Semester')
  const [gwa, setGwa] = useState('')
  const [honors, setHonors] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const emptySection = (msg: string) => <div className="spms-muted small py-2">{msg}</div>

  function resetForm() {
    setEditingId(null)
    setSchoolYear('')
    setSemester('1st Semester')
    setGwa('')
    setHonors('')
    setFormError(null)
  }

  function startEdit(r: AcademicRecord) {
    setEditingId(r.id)
    setSchoolYear(r.schoolYear)
    setSemester(r.semester)
    setGwa(String(r.gwa))
    setHonors(r.honors)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const gwaNum = Number(gwa)
    setSaving(true)
    try {
      if (editingId) {
        const res = updateAcademicRecord(studentId, editingId, {
          schoolYear,
          semester,
          gwa: gwaNum,
          honors,
        })
        if (!res.ok) {
          setFormError(res.error)
          return
        }
      } else {
        const res = addAcademicRecord(studentId, {
          schoolYear,
          semester,
          gwa: gwaNum,
          honors,
        })
        if (!res.ok) {
          setFormError(res.error)
          return
        }
      }
      setTick((t) => t + 1)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  // Check if we're in Academic Module
  const isAcademicModule = window.location.pathname.includes('/faculty/academic') || window.location.pathname.includes('/academic')

  return (
    <div className={`${cardClassName} card`}>
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="fw-bold">
          <i className="bi bi-mortarboard me-2 text-primary" /> Academic history
        </div>
        <div className="d-flex align-items-center gap-2">
          {!isAcademicModule && (
            <span className="badge rounded-pill bg-light text-secondary border">
              <i className="bi bi-lock-fill me-1" style={{ fontSize: '.65rem' }} />
              Read-only
            </span>
          )}
          <span className="spms-chip">
            <i className="bi bi-graph-up" /> Performance
          </span>
        </div>
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
                {showFacultyForm ? <th className="pe-3 text-end spms-no-print">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td className="ps-3" colSpan={showFacultyForm ? 6 : 5}>
                    {emptySection('No academic history recorded yet.')}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td className="ps-3 fw-semibold">{r.schoolYear}</td>
                    <td>{r.semester}</td>
                    <td>{r.gwa.toFixed(2)}</td>
                    <td>{r.honors || '—'}</td>
                    <td className="pe-3 text-end">
                      {isCurrentAcademicRecord(studentId, r.id) ? (
                        <span className="badge rounded-pill bg-primary-subtle text-primary">Current</span>
                      ) : (
                        <span className="spms-muted small">—</span>
                      )}
                    </td>
                    {showFacultyForm ? (
                      <td className="pe-3 text-end spms-no-print">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary rounded-3"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFacultyForm ? (
        <div className="card-body border-top spms-no-print">
          <div className="fw-bold mb-2">
            <i className="bi bi-pencil-square me-2" />
            {editingId ? 'Update academic record' : 'Add academic record'}
          </div>
          <div className="spms-muted small mb-3">
            The latest school year and semester (1st → 2nd → Summer) is shown as the current academic record automatically.
          </div>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">School year</label>
              <input
                className="form-control rounded-3"
                placeholder="e.g. 2024-2025"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">Semester</label>
              <select
                className="form-select rounded-3"
                value={semester}
                onChange={(e) => setSemester(e.target.value as AcademicSemesterLabel)}
              >
                {ACADEMIC_SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">GWA</label>
              <input
                type="number"
                step="0.01"
                min={1}
                max={5}
                className="form-control rounded-3"
                placeholder="1.00 – 5.00"
                value={gwa}
                onChange={(e) => setGwa(e.target.value)}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Honors (optional)</label>
              <input
                className="form-control rounded-3"
                placeholder="e.g. Dean's List"
                value={honors}
                onChange={(e) => setHonors(e.target.value)}
              />
            </div>
            {formError ? (
              <div className="col-12">
                <div className="alert alert-danger mb-0 py-2" role="alert">
                  {formError}
                </div>
              </div>
            ) : null}
            <div className="col-12 d-flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary rounded-4 px-4" disabled={saving}>
                <i className="bi bi-save me-1" />
                {editingId ? 'Save changes' : 'Add record'}
              </button>
              {editingId ? (
                <button type="button" className="btn btn-outline-secondary rounded-4 px-4" disabled={saving} onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {!isAcademicModule && (
        <div className="card-body border-top bg-light">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-info-circle text-primary"></i>
            <div className="small">
              <strong>Academic records management:</strong> To add or edit academic records, please use the{' '}
              <a href="/faculty/academic" className="text-decoration-none fw-semibold">
                Academic Module
              </a>. This ensures data integrity and follows the correct workflow.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
