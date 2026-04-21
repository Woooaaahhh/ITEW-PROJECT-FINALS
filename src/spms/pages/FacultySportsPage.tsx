/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSport, deleteSport, listSports, seedSportsIfEmpty, updateSport } from '../db/sports'
import { getStudent, listStudents, seedIfEmpty, updateStudent, type Student } from '../db/students'
import type { Sport } from '../db/spmsDb'

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function studentLabel(st: Student) {
  const parts = [st.firstName, st.middleName ?? '', st.lastName].filter(Boolean).join(' ')
  const nm = parts.replace(/\s+/g, ' ').trim()
  const sec = st.section?.trim() || '—'
  return `${nm} · ${sec}`
}

function studentNameOnly(st: Student | null) {
  if (!st) return 'Student'
  const parts = [st.firstName, st.middleName ?? '', st.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

const OTHER_SPORT_VALUE = '__other__'

export function FacultySportsPage() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [assignedSportIds, setAssignedSportIds] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [savedModalOpen, setSavedModalOpen] = useState(false)

  /** Qualification-by-sport report (same pattern as Skills “Qualification by Category”) */
  const [qualSportId, setQualSportId] = useState<string>('')
  const [qualOtherSport, setQualOtherSport] = useState('')

  async function refreshSports() {
    setLoading(true)
    setError(null)
    try {
      await seedSportsIfEmpty()
      const all = await listSports()
      setSports(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sports list')
    } finally {
      setLoading(false)
    }
  }

  async function refreshStudents() {
    setStudentsLoading(true)
    try {
      await seedIfEmpty()
      const all = await listStudents()
      setStudents(all)
      setSelectedStudentId((prev) => prev || all[0]?.id || '')
    } finally {
      setStudentsLoading(false)
    }
  }

  useEffect(() => {
    void refreshSports()
    void refreshStudents()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!selectedStudentId) {
        setAssignedSportIds([])
        return
      }
      setAssignError(null)
      try {
        const st = await getStudent(selectedStudentId)
        if (!alive) return
        const raw = st?.sportsAffiliations
        setAssignedSportIds(Array.isArray(raw) ? [...raw] : [])
      } catch (e) {
        if (!alive) return
        setAssignError(e instanceof Error ? e.message : 'Failed to load student sports.')
      }
    })()
    return () => {
      alive = false
    }
  }, [selectedStudentId])

  const filtered = useMemo(() => {
    const q = normalize(search)
    if (!q) return sports
    return sports.filter((s) => normalize(s.name).includes(q))
  }, [sports, search])

  const activeCount = useMemo(() => sports.filter((s) => s.isActive).length, [sports])
  const activeSports = useMemo(() => sports.filter((s) => s.isActive), [sports])
  const activeSportsById = useMemo(() => new Map(activeSports.map((s) => [s.id, s])), [activeSports])
  const assignedActiveCount = useMemo(
    () => assignedSportIds.filter((id) => activeSportsById.has(id)).length,
    [assignedSportIds, activeSportsById],
  )

  useEffect(() => {
    if (qualSportId) return
    const first = activeSports[0]?.id
    if (first) setQualSportId(first)
  }, [qualSportId, activeSports])

  const qualOtherNorm = useMemo(() => normalize(qualOtherSport), [qualOtherSport])

  const qualHasCriterion = useMemo(() => {
    if (qualSportId === OTHER_SPORT_VALUE) return qualOtherNorm.length > 0
    return Boolean(qualSportId) || qualOtherNorm.length > 0
  }, [qualSportId, qualOtherNorm])

  const qualificationRows = useMemo(() => {
    type Row = { student: Student; relevantSports: string[] }
    const rows: Row[] = []

    const collectMatches = (st: Student): string[] => {
      const ids = Array.isArray(st.sportsAffiliations) ? st.sportsAffiliations : []
      const names: string[] = []
      
      for (const sid of ids) {
        const sp = activeSportsById.get(sid)
        if (!sp) continue
        
        if (qualSportId === OTHER_SPORT_VALUE) {
          if (qualOtherNorm && normalize(sp.name).includes(qualOtherNorm)) names.push(sp.name)
        } else if (qualSportId) {
          if (sp.id === qualSportId) names.push(sp.name)
          else if (qualOtherNorm && normalize(sp.name).includes(qualOtherNorm)) names.push(sp.name)
        } else if (qualOtherNorm && normalize(sp.name).includes(qualOtherNorm)) {
          names.push(sp.name)
        }
      }
      return [...new Set(names)]
    }

    if (!qualHasCriterion) return rows

    for (const st of students) {
      const relevantSports = collectMatches(st)
      if (relevantSports.length > 0) rows.push({ student: st, relevantSports })
    }

    rows.sort((a, b) => studentNameOnly(a.student).localeCompare(studentNameOnly(b.student)))
    return rows
  }, [students, activeSportsById, qualSportId, qualOtherNorm, qualHasCriterion])

  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [students, selectedStudentId])

  return (
    <>
      {savedModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div
                className="modal-content border-0"
                style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}
              >
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Saved</h5>
                  <button type="button" className="btn-close" onClick={() => setSavedModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 40, height: 40, background: 'rgba(34, 197, 94, .15)', color: '#15803d' }}
                    >
                      <i className="bi bi-check2-circle fs-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="fw-semibold">Sports assignments updated successfully.</div>
                      <div className="spms-muted small">
                        Student: <span className="fw-semibold text-body">{studentNameOnly(selectedStudent)}</span> · Assigned:{' '}
                        <span className="fw-semibold text-body">{assignedSportIds.length}</span> sport
                        {assignedSportIds.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-primary rounded-3" onClick={() => setSavedModalOpen(false)}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setSavedModalOpen(false)} />
        </>
      )}

      <div className="row g-4">
        <div className="col-12">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <h6 className="fw-semibold mb-0">Qualification by Sport</h6>
                <div className="spms-muted small">Students with assigned sports that match your filters.</div>
              </div>
              <span className="spms-chip">
                <i className="bi bi-people me-1" />
                {qualificationRows.length} qualified
              </span>
            </div>
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-1">Sport</label>
                  <select
                    className="form-select rounded-3"
                    value={qualSportId}
                    onChange={(e) => setQualSportId(e.target.value)}
                    disabled={loading || activeSports.length === 0}
                  >
                    {activeSports.length === 0 ? <option value="">No active sports</option> : null}
                    {activeSports.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                    <option value={OTHER_SPORT_VALUE}>Other (type sport name below)</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-1">Other sport</label>
                  <input
                    className="form-control rounded-3"
                    value={qualOtherSport}
                    onChange={(e) => setQualOtherSport(e.target.value)}
                    placeholder="Type sport directly (e.g. badminton)"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="table-responsive border rounded-3" style={{ borderColor: 'rgba(15, 23, 42, .08)' }}>
                <table className="table spms-table table-hover align-middle mb-0">
                  <thead className="border-bottom bg-light bg-opacity-50">
                    <tr>
                      <th className="ps-3 py-2 small text-uppercase spms-muted">Student name</th>
                      <th className="py-2 small text-uppercase spms-muted">Relevant sports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      <tr>
                        <td colSpan={2} className="ps-3 py-4 spms-muted small">
                          Loading students…
                        </td>
                      </tr>
                    ) : null}
                    {!studentsLoading && qualSportId === OTHER_SPORT_VALUE && !qualOtherNorm ? (
                      <tr>
                        <td colSpan={2} className="ps-3 py-4 spms-muted small">
                          Type a sport name in <strong>Other sport</strong> to see matches.
                        </td>
                      </tr>
                    ) : null}
                    {!studentsLoading &&
                    !qualHasCriterion &&
                    qualSportId !== OTHER_SPORT_VALUE ? (
                      <tr>
                        <td colSpan={2} className="ps-3 py-4 spms-muted small">
                          Select a sport in the dropdown, or choose <strong>Other</strong> and type a sport name.
                        </td>
                      </tr>
                    ) : null}
                    {!studentsLoading &&
                    qualHasCriterion &&
                    !(qualSportId === OTHER_SPORT_VALUE && !qualOtherNorm) &&
                    qualificationRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="ps-3 py-4 spms-muted small">
                          No students match the current sport filters.
                        </td>
                      </tr>
                    ) : null}
                    {!studentsLoading
                      ? qualificationRows.map(({ student, relevantSports }) => (
                          <tr key={student.id}>
                            <td className="ps-3 py-3 fw-semibold">{studentNameOnly(student)}</td>
                            <td className="py-3">{relevantSports.join(', ')}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xxl-5">
          <div className="spms-card card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-1">Sports</h6>
              <div className="spms-muted small mb-3">
                Manage the official sports list used for try-out eligibility and student profiles.
              </div>

              <div className="d-flex flex-wrap gap-2 mb-3">
                <Link to="/students" className="btn btn-sm btn-outline-primary rounded-3">
                  <i className="bi bi-people me-1" /> Student List
                </Link>
              </div>

              <div className="row g-3 align-items-end">
                <div className="col-12">
                  <label className="form-label fw-semibold small">Add sport</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-plus-circle" />
                    </span>
                    <input
                      className="form-control"
                      placeholder="e.g., Basketball"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={saving || !newName.trim()}
                      onClick={async () => {
                        setSaving(true)
                        setError(null)
                        try {
                          await createSport({ name: newName })
                          setNewName('')
                          await refreshSports()
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to add sport')
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold small">Search</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      className="form-control"
                      placeholder="Search sports..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error ? (
                <div className="alert alert-danger mt-3 mb-0 py-2 small" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="d-flex flex-wrap gap-2 mt-3 mb-3">
                <span className="spms-chip">
                  <i className="bi bi-check2-circle" /> {activeCount} active
                </span>
                <span className="spms-chip">
                  <i className="bi bi-list-ul" /> {sports.length} total
                </span>
                <span className="spms-chip">
                  <i className="bi bi-filter" /> {filtered.length} shown
                </span>
              </div>

              <div className="border rounded-3 overflow-hidden" style={{ borderColor: 'rgba(15, 23, 42, .08)' }}>
                <div className="table-responsive">
                  <table className="table spms-table table-hover align-middle mb-0">
                    <thead className="border-bottom bg-light bg-opacity-50">
                      <tr>
                        <th className="ps-3 py-2 small text-uppercase spms-muted">Sport</th>
                        <th className="py-2 small text-uppercase spms-muted">Status</th>
                        <th className="text-end pe-3 py-2 small text-uppercase spms-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td className="ps-3 py-4" colSpan={3}>
                            <div className="spms-muted small">Loading sports…</div>
                          </td>
                        </tr>
                      ) : null}
                      {!loading && filtered.length === 0 ? (
                        <tr>
                          <td className="ps-3 py-4" colSpan={3}>
                            <div className="spms-muted small">No sports matched your search.</div>
                          </td>
                        </tr>
                      ) : null}
                      {filtered.map((s) => (
                        <tr key={s.id}>
                          <td className="ps-3">
                            <input
                              className="form-control form-control-sm"
                              defaultValue={s.name}
                              onBlur={async (e) => {
                                const next = e.currentTarget.value.trim()
                                if (!next || next === s.name) return
                                setError(null)
                                try {
                                  await updateSport(s.id, { name: next })
                                  await refreshSports()
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to rename sport')
                                  e.currentTarget.value = s.name
                                }
                              }}
                            />
                          </td>
                          <td>
                            {s.isActive ? (
                              <span className="badge text-bg-success">Active</span>
                            ) : (
                              <span className="badge text-bg-secondary">Inactive</span>
                            )}
                          </td>
                          <td className="text-end pe-3">
                            <div className="d-inline-flex gap-2">
                              <button
                                type="button"
                                className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                                onClick={async () => {
                                  setError(null)
                                  try {
                                    await updateSport(s.id, { isActive: !s.isActive })
                                    await refreshSports()
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to update sport')
                                  }
                                }}
                              >
                                {s.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={async () => {
                                  const ok = window.confirm(
                                    `Delete "${s.name}"? This will not remove it from existing student records.`,
                                  )
                                  if (!ok) return
                                  setError(null)
                                  try {
                                    await deleteSport(s.id)
                                    await refreshSports()
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Failed to delete sport')
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xxl-7">
          <div className="spms-card card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-1">Assign sports to students</h6>
              <div className="spms-muted small mb-3">
                Pick a student, then tap sports to assign. This is faculty-only.
              </div>

              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <label className="form-label small fw-semibold mb-1">Student</label>
                  <select
                    className="form-select rounded-3"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={studentsLoading || students.length === 0}
                  >
                    {students.length === 0 ? <option value="">No students</option> : null}
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {studentLabel(st)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <Link to="/students" className="btn btn-sm btn-outline-primary rounded-3">
                      <i className="bi bi-people me-1" /> Student List
                    </Link>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="spms-chip">
                    <i className="bi bi-check2-square" /> Assigned: {assignedActiveCount}/{activeSports.length} active sports
                  </div>
                  <div className="spms-muted small mt-2">
                    Student: <span className="fw-semibold">{studentNameOnly(selectedStudent)}</span>
                  </div>
                </div>

                <div className="col-12">
                  {assignError ? (
                    <div className="alert alert-danger py-2 mb-3">
                      <i className="bi bi-exclamation-circle me-2" />
                      {assignError}
                    </div>
                  ) : null}

                  {activeSports.length === 0 ? (
                    <div className="alert alert-warning mb-0">
                      <i className="bi bi-info-circle me-2" />
                      No active sports available. Add and activate sports in the left panel first.
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {activeSports.map((sp) => {
                        const checked = assignedSportIds.includes(sp.id)
                        return (
                          <label
                            key={sp.id}
                            className={`btn btn-sm rounded-pill px-3 py-2 ${checked ? 'btn-primary' : 'btn-outline-primary'}`}
                            style={{ cursor: selectedStudentId ? 'pointer' : 'not-allowed' }}
                          >
                            <input
                              type="checkbox"
                              className="d-none"
                              checked={checked}
                              disabled={!selectedStudentId}
                              onChange={(e) => {
                                const on = e.currentTarget.checked
                                setAssignedSportIds((prev) => {
                                  const set = new Set(prev)
                                  if (on) set.add(sp.id)
                                  else set.delete(sp.id)
                                  return Array.from(set)
                                })
                              }}
                            />
                            {sp.name}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-primary rounded-4 px-4"
                  disabled={!selectedStudentId || savingAssign}
                  onClick={async () => {
                    if (!selectedStudentId) return
                    setSavingAssign(true)
                    setAssignError(null)
                    try {
                      await updateStudent(selectedStudentId, { sportsAffiliations: assignedSportIds })
                      setSavedModalOpen(true)
                    } catch (e) {
                      setAssignError(e instanceof Error ? e.message : 'Failed to save sports assignments.')
                    } finally {
                      setSavingAssign(false)
                    }
                  }}
                >
                  <i className="bi bi-save me-1" /> {savingAssign ? 'Saving…' : 'Save assignments'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-4 px-4"
                  disabled={!selectedStudentId || savingAssign}
                  onClick={async () => {
                    if (!selectedStudentId) return
                    setAssignError(null)
                    try {
                      const st = await getStudent(selectedStudentId)
                      const raw = st?.sportsAffiliations
                      setAssignedSportIds(Array.isArray(raw) ? [...raw] : [])
                    } catch (e) {
                      setAssignError(e instanceof Error ? e.message : 'Failed to reset.')
                    }
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
