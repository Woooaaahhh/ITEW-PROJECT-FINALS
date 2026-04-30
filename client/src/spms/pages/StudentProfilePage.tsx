/** Client-side routing (React Router): route param via useParams; <Link> for in-app navigation (no full reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getStudent, updateStudent, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import type { AchievementRecord, ViolationRecord } from '../db/studentRecords'
import { ProfileAcademicHistoryCard } from '../components/AcademicProfileSections'
import { formatStudentRecordDate } from './studentRecordViewUtils'
import { listSports, seedSportsIfEmpty } from '../db/sports'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import type { Sport } from '../db/spmsDb'
import {
  hasPendingMedicalSubmission,
  isMedicalApprovedForTryouts,
  medicalStatusLabel,
  normalizeMedicalStatus,
} from '../db/medicalClearance'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function dash(v: string | null | undefined) {
  const t = (v ?? '').trim()
  return t || '—'
}

function formatMetaTs(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function violationStatusClass(status: string) {
  const s = status.toLowerCase()
  if (s === 'pending') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
  if (s === 'resolved') return 'bg-success-subtle text-success-emphasis border border-success-subtle'
  return 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle'
}

export function StudentProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [recordsTick, setRecordsTick] = useState(0)

  const canEditProfile = user?.role === 'admin'
  const canEditAcademic = user?.role === 'faculty'
  const isFaculty = user?.role === 'faculty'
  const isStudentViewer = user?.role === 'student'
  const isOwnStudentProfile = Boolean(user?.role === 'student' && user?.studentId && user.studentId === id)

  const [sports, setSports] = useState<Sport[]>([])
  const [sportsAffiliationIds, setSportsAffiliationIds] = useState<string[]>([])
  const [facultyReviewNotes, setFacultyReviewNotes] = useState('')
  const [savingMedical, setSavingMedical] = useState(false)
  const [medicalError, setMedicalError] = useState<string | null>(null)
  const [skills, setSkills] = useState<{ id: string; name: string; category: string; isActive: boolean }[]>([])
  const [studentSkillIds, setStudentSkillIds] = useState<string[]>([])

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

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!id) return
      try {
        await seedSkillsIfEmpty()
        const [allSkills, rows] = await Promise.all([
          listSkills({ activeOnly: false }),
          listStudentSkills(id),
        ])
        if (!alive) return
        setSkills(allSkills)
        setStudentSkillIds(rows.map((r) => r.skillId))
      } catch {
        if (!alive) return
        setSkills([])
        setStudentSkillIds([])
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await seedSportsIfEmpty()
        const all = await listSports({ activeOnly: false })
        if (!alive) return
        setSports(all)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!student) return
    setSportsAffiliationIds(Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : [])
    setFacultyReviewNotes(student.medicalClearanceNotes ?? '')
    setMedicalError(null)
  }, [student])

  useEffect(() => {
    const onRecords = () => setRecordsTick((n) => n + 1)
    window.addEventListener('spms-student-records-changed', onRecords)
    return () => window.removeEventListener('spms-student-records-changed', onRecords)
  }, [])

  const name = useMemo(() => (student ? fullName(student) : 'Student'), [student])
  const records = useMemo(() => (student ? getStudentRecords(student.id) : null), [student, recordsTick])

  const skillsById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])
  const sportNameById = useMemo(() => new Map(sports.map((s) => [s.id, s.name])), [sports])

  const medicalNorm = student ? normalizeMedicalStatus(student.medicalClearanceStatus) : 'pending'

  const skillChips = useMemo(() => {
    return studentSkillIds
      .map((sid) => skillsById.get(sid))
      .filter(Boolean)
      .map((sk) => sk!)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [studentSkillIds, skillsById])

  const violationsSorted = useMemo((): ViolationRecord[] => {
    if (!records) return []
    return [...records.violations].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [records])

  const achievementsSorted = useMemo((): AchievementRecord[] => {
    if (!records) return []
    return [...records.achievements].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [records])

  const backHref = user?.role === 'student' ? '/student' : '/students'

  if (loading) {
    return (
      <div className="spms-profile-section-card card">
        <div className="card-body">
          <div className="spms-muted">Loading student profile…</div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="spms-profile-section-card card">
        <div className="card-body">
          <div className="fw-bold fs-5">Student not found</div>
          <div className="mt-3">
            <Link to={backHref} className="btn btn-primary rounded-3 px-4">
              <i className="bi bi-arrow-left me-1" /> Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="spms-profile-page d-flex flex-column gap-4">
      <div className="spms-profile-hero-wrap">
        <div className="spms-cover spms-profile-cover" aria-hidden />
        <div className="spms-profile-hero-card">
          <div className="spms-profile-hero-inner">
            <div className="d-flex flex-column flex-sm-row gap-3 gap-sm-4 align-items-start">
              <img
                className="spms-profile-hero-pic"
                src={student.profilePictureDataUrl || avatarUrl}
                alt=""
              />
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <h1 className="spms-profile-name mb-0 fw-bold text-dark">{name}</h1>
                  <span className="spms-profile-pill spms-profile-pill--active">
                    <i className="bi bi-circle-fill" style={{ fontSize: '.45rem' }} /> Active
                  </span>
                  {student.yearLevel ? (
                    <span className="spms-profile-pill">
                      <i className="bi bi-layers" /> {student.yearLevel}
                    </span>
                  ) : null}
                  {student.section ? (
                    <span className="spms-profile-pill">
                      <i className="bi bi-diagram-3" /> {student.section}
                    </span>
                  ) : null}
                </div>

                <div className="d-flex flex-column gap-2 mt-2">
                  {student.email ? (
                    <div className="spms-profile-contact-line">
                      <i className="bi bi-envelope" />
                      <span>{student.email}</span>
                    </div>
                  ) : null}
                  {student.contactNumber ? (
                    <div className="spms-profile-contact-line">
                      <i className="bi bi-telephone" />
                      <span>{student.contactNumber}</span>
                    </div>
                  ) : null}
                  {student.address ? (
                    <div className="spms-profile-contact-line">
                      <i className="bi bi-geo-alt" />
                      <span>{student.address}</span>
                    </div>
                  ) : null}
                </div>

                <div className="d-flex flex-wrap gap-2 mt-3 spms-no-print">
                  {isStudentViewer ? (
                    <Link to="/student" className="btn btn-outline-primary rounded-3 px-3">
                      <i className="bi bi-arrow-left me-1" /> Back to dashboard
                    </Link>
                  ) : null}
                  {canEditProfile ? (
                    <Link to={`/students/${student.id}/edit`} className="btn btn-primary rounded-3 px-3">
                      <i className="bi bi-pencil me-1" /> Edit profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-4 order-2 order-lg-1 d-flex flex-column gap-4">
          <div className="spms-profile-section-card card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>
                <i className="bi bi-person-vcard me-2 text-primary" />
                Personal information
              </span>
              {canEditProfile ? (
                <Link
                  to={`/students/${student.id}/edit`}
                  className="btn btn-sm btn-outline-secondary rounded-3 border-0"
                  title="Edit details"
                >
                  <i className="bi bi-layout-text-sidebar-reverse" />
                </Link>
              ) : isStudentViewer ? (
                <span className="small spms-muted">View only</span>
              ) : (
                <span className="small spms-muted">Admin maintains details</span>
              )}
            </div>
            <div className="card-body">
              <dl className="spms-profile-kv mb-0">
                <dt>Student ID</dt>
                <dd>{student.id}</dd>
                <dt>Birthdate</dt>
                <dd>{student.birthdate ? formatStudentRecordDate(student.birthdate) : '—'}</dd>
                <dt>Gender</dt>
                <dd>{dash(student.gender)}</dd>
                <dt>Year level</dt>
                <dd>{dash(student.yearLevel)}</dd>
                <dt>Address</dt>
                <dd>{dash(student.address)}</dd>
              </dl>
              <div className="spms-profile-meta-foot">
                Created {formatMetaTs(student.createdAt)} · Updated {formatMetaTs(student.updatedAt)}
              </div>
            </div>
          </div>

          <div id="medical-clearance" className="spms-profile-section-card card scroll-mt-3">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>
                <i className="bi bi-heart-pulse me-2 text-danger" />
                Medical clearance
              </span>
              <span className="badge rounded-pill bg-light text-secondary border d-inline-flex align-items-center gap-1">
                <i className="bi bi-lock-fill" style={{ fontSize: '.65rem' }} />
                {isFaculty ? 'Faculty reviews' : 'View only'}
              </span>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span
                  className={`badge rounded-pill ${
                    medicalNorm === 'approved'
                      ? 'bg-success-subtle text-success border border-success-subtle'
                      : medicalNorm === 'rejected'
                        ? 'bg-danger-subtle text-danger border border-danger-subtle'
                        : 'bg-secondary-subtle text-secondary border border-secondary-subtle'
                  }`}
                >
                  {medicalStatusLabel(medicalNorm)}
                </span>
                {student.medicalClearanceUpdatedAt ? (
                  <span className="spms-muted small">Updated {formatMetaTs(student.medicalClearanceUpdatedAt)}</span>
                ) : null}
              </div>

              {isStudentViewer ? (
                <p className="spms-muted small mb-3">
                  To create or update medical clearance, use <Link to="/medical">Medical</Link> in the sidebar and choose the
                  correct student row.
                </p>
              ) : null}

              {(student.medicalPhysicianName ||
                student.medicalExamDate ||
                student.medicalFormDetails ||
                student.medicalDocumentDataUrl ||
                student.medicalHeight ||
                student.medicalWeight ||
                student.medicalBloodPressure ||
                student.medicalCondition) ? (
                <>
                  <hr className="my-3" />
                  <h6 className="small fw-semibold text-uppercase spms-muted mb-2">Submitted medical information</h6>
                  <dl className="spms-profile-kv mb-3">
                    <dt>Height</dt>
                    <dd>{dash(student.medicalHeight)}</dd>
                    <dt>Weight</dt>
                    <dd>{dash(student.medicalWeight)}</dd>
                    <dt>Blood pressure</dt>
                    <dd>{dash(student.medicalBloodPressure)}</dd>
                    <dt>Medical condition</dt>
                    <dd>{dash(student.medicalCondition)}</dd>
                    <dt>Doctor&apos;s name</dt>
                    <dd>{dash(student.medicalPhysicianName)}</dd>
                    <dt>Date of examination</dt>
                    <dd>{student.medicalExamDate ? formatStudentRecordDate(student.medicalExamDate) : '—'}</dd>
                    <dt>Additional notes</dt>
                    <dd className="small" style={{ whiteSpace: 'pre-wrap' }}>
                      {dash(student.medicalFormDetails)}
                    </dd>
                    <dt>Submitted</dt>
                    <dd>{student.medicalSubmittedAt ? formatMetaTs(student.medicalSubmittedAt) : '—'}</dd>
                  </dl>
                  {student.medicalDocumentDataUrl ? (
                    <div className="mb-2">
                      <div className="small fw-semibold mb-1">Uploaded document</div>
                      {student.medicalDocumentDataUrl.startsWith('data:image') ? (
                        <img
                          src={student.medicalDocumentDataUrl}
                          alt="Medical document"
                          className="img-fluid rounded border"
                          style={{ maxHeight: 320, objectFit: 'contain' }}
                        />
                      ) : null}
                      {student.medicalDocumentDataUrl.startsWith('data:application/pdf') ? (
                        <embed
                          src={student.medicalDocumentDataUrl}
                          type="application/pdf"
                          className="w-100 rounded border bg-light"
                          style={{ minHeight: 360 }}
                          title="Medical PDF"
                        />
                      ) : null}
                      {!isStudentViewer ? (
                        <a
                          href={student.medicalDocumentDataUrl}
                          download="medical-document"
                          className="btn btn-sm btn-outline-secondary rounded-3 mt-2"
                        >
                          <i className="bi bi-download me-1" /> Open / download
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="small spms-muted mb-0">No medical submission on file yet.</p>
              )}

              <hr className="my-3" />
              <p className="small mb-1">
                <span className="text-body-secondary fw-semibold">Faculty review notes: </span>
                {dash(student.medicalClearanceNotes)}
              </p>

              {isFaculty ? (
                <>
                  {hasPendingMedicalSubmission(student) ? (
                    <>
                      <hr className="my-3" />
                      <p className="spms-muted small mb-2">This submission is pending your decision.</p>
                      <div className="mb-2">
                        <label className="form-label small fw-semibold mb-1">Review notes (optional)</label>
                        <textarea
                          className="form-control form-control-sm rounded-3"
                          rows={3}
                          placeholder="Visible to the student (e.g. conditions, follow-up)"
                          value={facultyReviewNotes}
                          onChange={(e) => setFacultyReviewNotes(e.target.value)}
                        />
                      </div>
                      {medicalError ? (
                        <div className="alert alert-danger py-2 small mb-2" role="alert">
                          {medicalError}
                        </div>
                      ) : null}
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-success btn-sm rounded-3"
                          disabled={savingMedical}
                          onClick={async () => {
                            setSavingMedical(true)
                            setMedicalError(null)
                            try {
                              const updated = await updateStudent(student.id, {
                                medicalClearanceStatus: 'approved',
                                medicalClearanceUpdatedAt: new Date().toISOString(),
                                medicalClearanceNotes: facultyReviewNotes.trim() ? facultyReviewNotes.trim() : null,
                              })
                              setStudent(updated)
                            } catch (e) {
                              setMedicalError(e instanceof Error ? e.message : 'Failed to save')
                            } finally {
                              setSavingMedical(false)
                            }
                          }}
                        >
                          <i className="bi bi-check-lg me-1" /> Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm rounded-3"
                          disabled={savingMedical}
                          onClick={async () => {
                            setSavingMedical(true)
                            setMedicalError(null)
                            try {
                              const updated = await updateStudent(student.id, {
                                medicalClearanceStatus: 'rejected',
                                medicalClearanceUpdatedAt: new Date().toISOString(),
                                medicalClearanceNotes: facultyReviewNotes.trim() ? facultyReviewNotes.trim() : null,
                              })
                              setStudent(updated)
                            } catch (e) {
                              setMedicalError(e instanceof Error ? e.message : 'Failed to save')
                            } finally {
                              setSavingMedical(false)
                            }
                          }}
                        >
                          <i className="bi bi-x-lg me-1" /> Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="spms-muted small mb-0 mt-2">
                      {medicalNorm === 'pending' && !student.medicalSubmittedAt
                        ? 'No record yet. Enter data from Sidebar → Medical, or ask students to submit from the Medical module.'
                        : 'No pending submission. New activity appears when a student submits again for review.'}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8 order-1 order-lg-2 d-flex flex-column gap-4">
          <ProfileAcademicHistoryCard
            studentId={student.id}
            showFacultyForm={canEditAcademic}
            cardClassName="spms-profile-section-card"
          />

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="spms-profile-section-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <span>
                    <i className="bi bi-exclamation-triangle me-2 text-warning" />
                    Violations
                  </span>
                  {user?.role === 'faculty' ? (
                    <Link to="/faculty/violations" className="spms-profile-card-action text-decoration-none">
                      Record
                    </Link>
                  ) : (
                    <span className="spms-profile-card-action opacity-75">Record</span>
                  )}
                </div>
                <div className="card-body">
                  {violationsSorted.length === 0 ? (
                    <p className="spms-muted small mb-0">No violations recorded.</p>
                  ) : (
                    violationsSorted.map((v) => (
                      <div key={v.id} className="spms-violation-item">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
                          <span className="fw-semibold">{v.violation_type}</span>
                          <span className={`badge rounded-pill ${violationStatusClass(v.status)}`}>{v.status}</span>
                        </div>
                        <div className="small text-body-secondary mb-1">{v.description}</div>
                        <div className="small spms-muted">{formatStudentRecordDate(v.date)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="spms-profile-section-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <span>
                    <i className="bi bi-dribbble me-2 text-primary" />
                    Sports participation
                  </span>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {isMedicalApprovedForTryouts(student) && sportsAffiliationIds.length > 0 ? (
                      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">
                        Try-out eligible
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-light text-secondary border">Not eligible</span>
                    )}
                    {sportsAffiliationIds.length === 0 ? (
                      <span className="badge rounded-pill bg-light text-secondary border">No sports</span>
                    ) : (
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle">
                        {sportsAffiliationIds.length} sport{sportsAffiliationIds.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {isFaculty ? (
                      <Link
                        to="/faculty/sports"
                        className="spms-profile-card-action text-decoration-none small py-1"
                      >
                        Assign sports
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="card-body">
                  {isFaculty ? (
                    <p className="spms-muted small mb-3">
                      Sports are view-only here. To add or change assignments, use{' '}
                      <Link to="/faculty/sports">Faculty → Sports</Link>.
                    </p>
                  ) : null}
                  {isOwnStudentProfile ? (
                    <p className="small spms-muted mb-3">
                      <strong>Try-out eligibility</strong> requires medical clearance <strong>Approved</strong> by faculty and
                      at least one sport assigned to you. See <a href="#medical-clearance">Medical clearance</a> below or{' '}
                      <Link to="/medical">Medical</Link> for submissions.
                    </p>
                  ) : null}
                  {sportsAffiliationIds.length === 0 ? (
                    <p className="spms-muted small mb-0">No sports affiliations recorded.</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {sportsAffiliationIds.map((sid) => (
                        <span key={sid} className="badge bg-success-subtle text-success border border-success-subtle">
                          {sportNameById.get(sid) ?? sid}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="spms-profile-section-card card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>
                <i className="bi bi-stars me-2 text-primary" />
                Skills
              </span>
              <span className="spms-profile-card-action">Strengths</span>
            </div>
            <div className="card-body">
              {skillChips.length === 0 ? (
                <p className="spms-muted small mb-0">No skills recorded.</p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {skillChips.map((s) => (
                    <span key={s.id} className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">
                      {s.name}
                      <span className="text-opacity-75 ms-1 fw-normal">({s.category})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="spms-profile-section-card card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>
                <i className="bi bi-journal-bookmark me-2 text-primary" />
                Non-academic achievements
              </span>
              <span className="spms-profile-card-action">Activities</span>
            </div>
            <div className="card-body">
              {achievementsSorted.length === 0 ? (
                <p className="spms-muted small mb-0">No non-academic achievements recorded.</p>
              ) : (
                achievementsSorted.map((a) => (
                  <div key={a.id} className="spms-achievement-item">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
                      <span className="fw-semibold">{a.title}</span>
                      <span className="small spms-muted text-nowrap">{formatStudentRecordDate(a.date)}</span>
                    </div>
                    {a.category ? (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-2">
                        {a.category}
                      </span>
                    ) : null}
                    <div className="small text-body-secondary">{a.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
