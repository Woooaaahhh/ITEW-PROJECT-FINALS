import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getStudent, updateStudent, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import { listSports, seedSportsIfEmpty } from '../db/sports'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import type { Sport } from '../db/spmsDb'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const canEditProfile = user?.role === 'admin'
  const canEditEligibility = user?.role === 'faculty'
  const isOwnProfile = user?.role === 'student' && user?.studentId === id
  const [sports, setSports] = useState<Sport[]>([])
  const [savingEligibility, setSavingEligibility] = useState(false)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  const [draftSportsIds, setDraftSportsIds] = useState<string[]>([])

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
        // ignore; UI will show empty options
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!student) return
    setDraftSportsIds(Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : [])
  }, [student])

  const name = useMemo(() => (student ? fullName(student) : 'Student'), [student])
  const records = useMemo(() => (student ? getStudentRecords(student.id) : null), [student])

  const selectedSportNames = useMemo(() => {
    if (!student) return []
    const byId = new Map(sports.map((s) => [s.id, s.name]))
    const byNameLower = new Set(sports.map((s) => s.name.toLowerCase().trim()))

    // Supports both current IDs and any older name-based saved values.
    const resolved = (student.sportsAffiliations ?? [])
      .map((value: string) => {
        const fromId = byId.get(value)
        if (fromId) return fromId
        const raw = String(value ?? '').trim()
        if (!raw) return ''
        if (byNameLower.has(raw.toLowerCase())) return raw
        return raw
      })
      .filter(Boolean)

    // Deduplicate while preserving order.
    return Array.from(new Set(resolved))
  }, [sports, student])

  const hasSportsAffiliations = (student?.sportsAffiliations ?? []).length > 0

  const skillsById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])
  const skillChips = useMemo(() => {
    return studentSkillIds
      .map((sid) => skillsById.get(sid))
      .filter(Boolean)
      .map((sk) => sk!)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [studentSkillIds, skillsById])

  if (loading) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="spms-muted">Loading student profile...</div>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="fw-bold fs-5">Student not found</div>
          <div className="spms-muted">The student ID does not exist in the database.</div>
          <div className="mt-3">
            <Link to="/students" className="btn btn-primary rounded-4 px-4">
              <i className="bi bi-arrow-left me-1" /> Back to Student List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const emptySection = (msg: string) => (
    <div className="spms-muted small py-2">{msg}</div>
  )

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-cover" />

      <div className="spms-profile-header">
        <img className="spms-profile-pic" src={student.profilePictureDataUrl || avatarUrl} alt={name} />
        <div className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h3 className="mb-0 fw-bold">{name}</h3>
            <span className="spms-chip">
              <i className="bi bi-patch-check" /> Active
            </span>
            {student.yearLevel ? (
              <span className="spms-chip">
                <i className="bi bi-layers" /> {student.yearLevel}
              </span>
            ) : null}
            {student.section ? (
              <span className="spms-chip">
                <i className="bi bi-diagram-3" /> {student.section}
              </span>
            ) : null}
          </div>

          <div className="d-flex flex-wrap gap-2 mt-2">
            {student.email ? (
              <span className="spms-chip">
                <i className="bi bi-envelope" /> {student.email}
              </span>
            ) : null}
            {student.contactNumber ? (
              <span className="spms-chip">
                <i className="bi bi-telephone" /> {student.contactNumber}
              </span>
            ) : null}
            {student.address ? (
              <span className="spms-chip">
                <i className="bi bi-geo-alt" /> {student.address}
              </span>
            ) : null}
          </div>

          <div className="d-flex gap-2 mt-3 spms-no-print">
            {canEditProfile && (
              <Link to={`/students/${student.id}/edit`} className="btn btn-primary rounded-4 px-4">
                <i className="bi bi-pencil me-1" /> Edit
              </Link>
            )}
            {user?.role === 'student' ? (
              <Link to="/student" className="btn btn-outline-primary rounded-4 px-4">
                Back to dashboard
              </Link>
            ) : (
              <Link to="/students" className="btn btn-outline-primary rounded-4 px-4">
                Back to list
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left column */}
        <div className="col-12 col-xl-5">
          <div className="spms-card card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-person-lines-fill me-2" /> Personal Information
              </div>
              <span className="spms-chip"><i className="bi bi-info-circle" /> Details</span>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-6">
                  <div className="spms-muted small">Student ID</div>
                  <div className="fw-semibold">{student.id}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Birthdate</div>
                  <div className="fw-semibold">{student.birthdate || '—'}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Gender</div>
                  <div className="fw-semibold">{student.gender || '—'}</div>
                </div>
                <div className="col-6">
                  <div className="spms-muted small">Year Level</div>
                  <div className="fw-semibold">{student.yearLevel || '—'}</div>
                </div>
                <div className="col-12">
                  <div className="spms-muted small">Address</div>
                  <div className="fw-semibold">{student.address || '—'}</div>
                </div>
                <div className="col-12">
                  <hr />
                  <div className="spms-muted small">Created {new Date(student.createdAt).toLocaleString()} · Updated {new Date(student.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-heart-pulse me-2" /> Medical Records
              </div>
              <span className="spms-chip"><i className="bi bi-shield-lock" /> Restricted</span>
            </div>
            <div className="card-body">
              {emptySection('No medical records on file. Add via Edit Profile when supported.')}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-12 col-xl-7">
          <div className="spms-card card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-mortarboard me-2" /> Academic History
              </div>
              <span className="spms-chip"><i className="bi bi-graph-up" /> Performance</span>
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="ps-3" colSpan={5}>
                        {emptySection('No academic history recorded yet.')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-0">
            <div className="col-12 col-lg-6">
              <div className="spms-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div className="fw-bold">
                    <i className="bi bi-exclamation-triangle me-2" /> Violations
                  </div>
                  <span className="spms-chip"><i className="bi bi-clipboard-check" /> Record</span>
                </div>
                <div className="card-body">
                  {!records || records.violations.length === 0 ? (
                    emptySection('No violations on record.')
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {records.violations.slice(0, 5).map((v) => (
                        <div key={v.id} className="d-flex justify-content-between gap-3">
                          <div className="flex-grow-1">
                            <div className="fw-semibold small">{v.violation_type}</div>
                            <div className="spms-muted small">{v.description}</div>
                          </div>
                          <div className="text-end">
                            <div className="spms-muted small">{new Date(v.date).toLocaleDateString()}</div>
                            <span
                              className="badge rounded-pill"
                              style={{
                                background: v.status.toLowerCase() === 'resolved' ? 'rgba(34, 197, 94, .15)' : 'rgba(234, 179, 8, .15)',
                                color: v.status.toLowerCase() === 'resolved' ? '#15803d' : '#a16207',
                              }}
                            >
                              {v.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {records.violations.length > 5 ? (
                        <div className="spms-muted small">Showing 5 of {records.violations.length} records.</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="spms-card card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div className="fw-bold">
                    <i className="bi bi-dribbble me-2" /> Sports Participation
                  </div>
                  <span className="spms-chip">
                    <i className="bi bi-check-circle" /> {hasSportsAffiliations ? 'Assigned' : 'None'}
                  </span>
                </div>
                <div className="card-body">
                  {selectedSportNames.length === 0 ? (
                    emptySection('No sports affiliations recorded.')
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      <div className="spms-muted small">
                        Total selected sports: <span className="fw-semibold text-body">{selectedSportNames.length}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedSportNames.map((n) => (
                        <span key={n} className="spms-chip">
                          <i className="bi bi-dribbble" /> {n}
                        </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(canEditEligibility || user?.role === 'admin') ? (
            <div className="spms-card card mt-3">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div className="fw-bold">
                  <i className="bi bi-check2-square me-2" /> Sports Affiliations
                </div>
                <span className="spms-chip"><i className="bi bi-lock" /> Role-based</span>
              </div>
              <div className="card-body">
                {!canEditEligibility ? (
                  <div className="spms-muted small mb-3">
                    View-only. Faculty maintains sports affiliations.
                  </div>
                ) : null}

                <div className="row g-3">
                  <div className="col-12">
                    <div className="fw-semibold mb-1">Sports affiliations</div>
                    <div className="spms-muted small mb-2">Select all sports the student is trying out for / affiliated with.</div>
                    <div className="d-flex flex-wrap gap-2">
                      {sports.length === 0 ? (
                        <div className="spms-muted small">No sports configured yet. Add sports in the Faculty Sports page.</div>
                      ) : (
                        sports.map((sp) => (
                          <label key={sp.id} className={`btn btn-sm rounded-4 ${draftSportsIds.includes(sp.id) ? 'btn-primary' : 'btn-outline-primary'}`}>
                            <input
                              type="checkbox"
                              className="d-none"
                              checked={draftSportsIds.includes(sp.id)}
                              disabled={!canEditEligibility || !sp.isActive}
                              onChange={(e) => {
                                const checked = e.currentTarget.checked
                                setDraftSportsIds((prev) => {
                                  const set = new Set(prev)
                                  if (checked) set.add(sp.id)
                                  else set.delete(sp.id)
                                  return Array.from(set)
                                })
                              }}
                            />
                            {sp.name}
                            {!sp.isActive ? ' (inactive)' : ''}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {eligibilityError ? (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {eligibilityError}
                  </div>
                ) : null}

                {canEditEligibility ? (
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary rounded-4 px-4"
                      disabled={savingEligibility}
                      onClick={async () => {
                        if (!student) return
                        setSavingEligibility(true)
                        setEligibilityError(null)
                        try {
                          const updated = await updateStudent(student.id, {
                            sportsAffiliations: draftSportsIds,
                          })
                          setStudent(updated)
                        } catch (e) {
                          setEligibilityError(e instanceof Error ? e.message : 'Failed to save eligibility fields')
                        } finally {
                          setSavingEligibility(false)
                        }
                      }}
                    >
                      <i className="bi bi-save me-1" /> Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-4 px-4"
                      disabled={savingEligibility}
                      onClick={() => {
                        setDraftSportsIds(Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : [])
                        setEligibilityError(null)
                      }}
                    >
                      Reset
                    </button>
                    <Link to="/faculty/sports" className="btn btn-outline-primary rounded-4 px-4">
                      Manage Sports List
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-stars me-2" /> Skills
              </div>
              <span className="spms-chip"><i className="bi bi-lightning-charge" /> Strengths</span>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {skillChips.length === 0 ? (
                  emptySection('No skills recorded yet.')
                ) : (
                  skillChips.map((sk) => (
                    <span
                      key={sk.id}
                      className={`spms-chip ${sk.isActive ? '' : 'opacity-50'}`}
                      title={sk.isActive ? 'Active skill' : 'Inactive skill'}
                    >
                      <i className="bi bi-award" /> {sk.name}
                      <span className="ms-1 spms-muted">({sk.category})</span>
                    </span>
                  ))
                )}
              </div>
              {user?.role === 'faculty' ? (
                <div className="spms-muted small mt-2">
                  To edit skills for this student, go to <Link to="/faculty/skills" className="fw-semibold">Faculty Skills</Link>.
                </div>
              ) : null}
            </div>
          </div>

          <div className="spms-card card mt-3">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="fw-bold">
                <i className="bi bi-journal-bookmark me-2" /> Non-Academic Achievements
              </div>
              <span className="spms-chip"><i className="bi bi-award" /> Activities</span>
            </div>
            <div className="card-body">
              {!records || records.achievements.length === 0 ? (
                emptySection('No non-academic achievements recorded yet.')
              ) : (
                <div className="d-flex flex-column gap-2">
                  {records.achievements.slice(0, 5).map((a) => (
                    <div key={a.id} className="d-flex justify-content-between gap-3">
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">
                          {a.title}{' '}
                          {a.category ? (
                            <span className="badge rounded-pill bg-primary-subtle text-primary ms-1">{a.category}</span>
                          ) : null}
                        </div>
                        <div className="spms-muted small">{a.description}</div>
                      </div>
                      <div className="text-end spms-muted small">{new Date(a.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {records.achievements.length > 5 ? (
                    <div className="spms-muted small">Showing 5 of {records.achievements.length} records.</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

