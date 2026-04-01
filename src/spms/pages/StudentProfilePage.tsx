import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getStudent, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import type { AchievementRecord, ViolationRecord } from '../db/studentRecords'
import { ProfileAcademicHistoryCard } from '../components/AcademicProfileSections'
import { formatStudentRecordDate } from './studentRecordViewUtils'
import { listSports, seedSportsIfEmpty } from '../db/sports'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import type { Sport } from '../db/spmsDb'

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

  const [sports, setSports] = useState<Sport[]>([])
  const [sportsAffiliationIds, setSportsAffiliationIds] = useState<string[]>([])
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
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-3 border-0"
                  disabled
                  title="Details are maintained by the registrar"
                >
                  <i className="bi bi-info-lg" />
                </button>
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

          <div className="spms-profile-section-card card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span>
                <i className="bi bi-heart-pulse me-2 text-danger" />
                Medical records
              </span>
              <span className="badge rounded-pill bg-light text-secondary border d-inline-flex align-items-center gap-1">
                <i className="bi bi-lock-fill" style={{ fontSize: '.65rem' }} /> Restricted
              </span>
            </div>
            <div className="card-body">
              <p className="spms-muted small mb-0">
                No medical records on file. Add via Edit profile when supported.
              </p>
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
                    {sportsAffiliationIds.length === 0 ? (
                      <span className="badge rounded-pill bg-light text-secondary border">None</span>
                    ) : (
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle">
                        {sportsAffiliationIds.length}
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
