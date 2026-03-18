import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Skill, Student } from '../db/spmsDb'
import { createSkill, deleteSkill, listSkills, seedSkillsIfEmpty, setStudentSkills, updateSkill, listStudentSkills } from '../db/skills'
import { listStudents, seedIfEmpty } from '../db/students'

export function FacultySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(true)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<'Technical' | 'Soft Skill' | 'Other'>('Technical')
  const [categoryCustom, setCategoryCustom] = useState('')
  const skillCategory = useMemo(() => (category === 'Other' ? categoryCustom.trim() : category), [category, categoryCustom])

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [assignedSkillIds, setAssignedSkillIds] = useState<string[]>([])
  const [savingAssign, setSavingAssign] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [savedModalOpen, setSavedModalOpen] = useState(false)

  const fetchSkills = async () => {
    setSkillsLoading(true)
    setSkillsError(null)
    try {
      await seedSkillsIfEmpty()
      const all = await listSkills({ activeOnly: false })
      setSkills(all)
    } catch (e) {
      setSkillsError(e instanceof Error ? e.message : 'Failed to load skills.')
    } finally {
      setSkillsLoading(false)
    }
  }

  const fetchStudents = async () => {
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
    void fetchSkills()
    void fetchStudents()
  }, [])

  // load assignments whenever student changes
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!selectedStudentId) {
        setAssignedSkillIds([])
        return
      }
      setAssignError(null)
      try {
        const rows = await listStudentSkills(selectedStudentId)
        if (!alive) return
        setAssignedSkillIds(rows.map((r) => r.skillId))
      } catch (e) {
        if (!alive) return
        setAssignError(e instanceof Error ? e.message : 'Failed to load assigned skills.')
      }
    })()
    return () => {
      alive = false
    }
  }, [selectedStudentId])

  const activeSkills = useMemo(() => skills.filter((s) => s.isActive), [skills])
  const activeSkillsById = useMemo(() => new Map(activeSkills.map((s) => [s.id, s])), [activeSkills])
  const assignedActiveCount = useMemo(() => assignedSkillIds.filter((id) => activeSkillsById.has(id)).length, [assignedSkillIds, activeSkillsById])

  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [students, selectedStudentId])
  const selectedStudentName = useMemo(() => {
    if (!selectedStudent) return 'Student'
    const parts = [selectedStudent.firstName, selectedStudent.middleName ?? '', selectedStudent.lastName].filter(Boolean).join(' ')
    return parts.replace(/\s+/g, ' ').trim()
  }, [selectedStudent])

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
                      <div className="fw-semibold">Skill assignments updated successfully.</div>
                      <div className="spms-muted small">
                        Student: <span className="fw-semibold text-body">{selectedStudentName}</span> · Assigned:{' '}
                        <span className="fw-semibold text-body">{assignedSkillIds.length}</span>
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
      <div className="col-12 col-xxl-5">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-1">Skills Table</h6>
            <div className="spms-muted small mb-3">Create and manage the school’s skills catalog. Only Faculty can edit.</div>

            <form
              className="d-flex flex-column gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setSkillsError(null)
                const n = name.trim()
                if (!n) {
                  setSkillsError('Skill name is required.')
                  return
                }
                if (!skillCategory) {
                  setSkillsError('Skill category is required.')
                  return
                }
                setCreating(true)
                try {
                  await createSkill({ name: n, category: skillCategory })
                  setName('')
                  setCategory('Technical')
                  setCategoryCustom('')
                  await fetchSkills()
                } catch (err) {
                  setSkillsError(err instanceof Error ? err.message : 'Failed to create skill.')
                } finally {
                  setCreating(false)
                }
              }}
            >
              <div>
                <label className="form-label small fw-semibold mb-1">Skill Name</label>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} disabled={creating} placeholder="e.g. Python Programming" />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} disabled={creating}>
                    <option value="Technical">Technical</option>
                    <option value="Soft Skill">Soft Skill</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Custom</label>
                  <input className="form-control" value={categoryCustom} onChange={(e) => setCategoryCustom(e.target.value)} disabled={creating || category !== 'Other'} placeholder={category === 'Other' ? 'Enter category' : '—'} />
                </div>
              </div>

              {skillsError ? (
                <div className="alert alert-danger py-2 mb-0">
                  <i className="bi bi-exclamation-circle me-2" />
                  {skillsError}
                </div>
              ) : null}

              <div className="d-flex gap-2">
                <button className="btn btn-primary rounded-4 fw-semibold" type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Add Skill'}
                </button>
                <button type="button" className="btn btn-outline-secondary rounded-4" onClick={() => void fetchSkills()} disabled={skillsLoading}>
                  <i className="bi bi-arrow-clockwise me-1" /> Refresh
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="spms-card card border-0 overflow-hidden mt-4" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold">Skills</div>
              <div className="spms-muted small">{skills.length} total · {activeSkills.length} active</div>
            </div>
          </div>
          <div className="card-body p-0">
            {skillsLoading ? (
              <div className="p-4 spms-muted">Loading skills…</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead>
                    <tr className="spms-muted small">
                      <th className="ps-4 py-3 fw-semibold">Skill</th>
                      <th className="py-3 fw-semibold">Category</th>
                      <th className="py-3 fw-semibold">Status</th>
                      <th className="pe-4 py-3 fw-semibold text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ps-4 py-4 spms-muted text-center">No skills yet.</td>
                      </tr>
                    ) : (
                      skills.map((sk) => {
                        const isEditing = editingId === sk.id
                        return (
                          <tr key={sk.id}>
                            <td className="ps-4 py-3">
                              {isEditing ? (
                                <input className="form-control form-control-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                              ) : (
                                <div className="fw-semibold">{sk.name}</div>
                              )}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <input className="form-control form-control-sm" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                              ) : (
                                <span className="badge bg-primary-subtle text-primary border border-primary border-opacity-25">{sk.category}</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`badge ${sk.isActive ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' : 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25'}`}>
                                {sk.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="pe-4 py-3 text-end">
                              {isEditing ? (
                                <div className="btn-group">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={async () => {
                                      setSkillsError(null)
                                      try {
                                        await updateSkill(sk.id, { name: editName, category: editCategory })
                                        setEditingId(null)
                                        await fetchSkills()
                                      } catch (e) {
                                        setSkillsError(e instanceof Error ? e.message : 'Failed to update skill.')
                                      }
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="btn-group">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => {
                                      setEditingId(sk.id)
                                      setEditName(sk.name)
                                      setEditCategory(sk.category)
                                    }}
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${sk.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                    onClick={async () => {
                                      setSkillsError(null)
                                      try {
                                        await updateSkill(sk.id, { isActive: !sk.isActive })
                                        await fetchSkills()
                                      } catch (e) {
                                        setSkillsError(e instanceof Error ? e.message : 'Failed to update skill.')
                                      }
                                    }}
                                    title={sk.isActive ? 'Deactivate' : 'Activate'}
                                  >
                                    <i className={`bi ${sk.isActive ? 'bi-pause-circle' : 'bi-play-circle'}`} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={async () => {
                                      const ok = confirm(`Delete skill "${sk.name}"? This will remove it from all students.`)
                                      if (!ok) return
                                      setSkillsError(null)
                                      try {
                                        await deleteSkill(sk.id)
                                        await fetchSkills()
                                      } catch (e) {
                                        setSkillsError(e instanceof Error ? e.message : 'Failed to delete skill.')
                                      }
                                    }}
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-xxl-7">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-1">Assign Skills to Students</h6>
            <div className="spms-muted small mb-3">
              Pick a student, then check the skills you want to assign. This is Faculty-only.
            </div>

            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <label className="form-label small fw-semibold mb-1">Student</label>
                <select
                  className="form-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={studentsLoading}
                >
                  {students.map((st) => {
                    const parts = [st.firstName, st.middleName ?? '', st.lastName].filter(Boolean).join(' ')
                    const nm = parts.replace(/\s+/g, ' ').trim()
                    return (
                      <option key={st.id} value={st.id}>
                        {nm} · {st.section ?? '—'}
                      </option>
                    )
                  })}
                </select>
                <div className="d-flex gap-2 mt-2">
                  <Link to="/students" className="btn btn-sm btn-outline-primary rounded-3">
                    <i className="bi bi-people me-1" /> Student List
                  </Link>
                  <Link to="/faculty" className="btn btn-sm btn-outline-secondary rounded-3">
                    Back to Dashboard
                  </Link>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="spms-chip">
                  <i className="bi bi-check2-square" /> Assigned: {assignedActiveCount}/{activeSkills.length} active skills
                </div>
                <div className="spms-muted small mt-2">
                  Student: <span className="fw-semibold">{selectedStudentName}</span>
                </div>
              </div>

              <div className="col-12">
                {assignError ? (
                  <div className="alert alert-danger py-2 mb-3">
                    <i className="bi bi-exclamation-circle me-2" />
                    {assignError}
                  </div>
                ) : null}

                {activeSkills.length === 0 ? (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-info-circle me-2" />
                    No active skills available. Create skills first in the table.
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {activeSkills.map((sk) => {
                      const checked = assignedSkillIds.includes(sk.id)
                      return (
                        <label key={sk.id} className={`btn btn-sm rounded-4 ${checked ? 'btn-primary' : 'btn-outline-primary'}`}>
                          <input
                            type="checkbox"
                            className="d-none"
                            checked={checked}
                            disabled={!selectedStudentId}
                            onChange={(e) => {
                              const on = e.currentTarget.checked
                              setAssignedSkillIds((prev) => {
                                const set = new Set(prev)
                                if (on) set.add(sk.id)
                                else set.delete(sk.id)
                                return Array.from(set)
                              })
                            }}
                          />
                          {sk.name}
                          <span className="ms-1 opacity-75">({sk.category})</span>
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
                    await setStudentSkills(selectedStudentId, assignedSkillIds)
                    setSavedModalOpen(true)
                  } catch (e) {
                    setAssignError(e instanceof Error ? e.message : 'Failed to save assigned skills.')
                  } finally {
                    setSavingAssign(false)
                  }
                }}
              >
                <i className="bi bi-save me-1" /> {savingAssign ? 'Saving…' : 'Save Assignments'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-4 px-4"
                disabled={!selectedStudentId || savingAssign}
                onClick={async () => {
                  if (!selectedStudentId) return
                  setAssignError(null)
                  try {
                    const rows = await listStudentSkills(selectedStudentId)
                    setAssignedSkillIds(rows.map((r) => r.skillId))
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
