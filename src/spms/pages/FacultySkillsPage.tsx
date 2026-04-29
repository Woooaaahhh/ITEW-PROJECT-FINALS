/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */

import { useEffect, useMemo, useState } from 'react'

import { Link } from 'react-router-dom'

import axios from 'axios'

import type { Skill, Student } from '../db/spmsDb'

import { createSkill, deleteSkill, listSkills, seedSkillsIfEmpty, setStudentSkills, updateSkill, listStudentSkills } from '../db/skills'

import { listStudents, seedIfEmpty } from '../db/students'



function normalize(s: string) {

  return s.toLowerCase().trim()

}



const yearOptions = ['1st', '2nd', '3rd', '4th'] as const

const sectionOptions = ['BSIT-2A', 'BSBA-1B', 'BSED-3C', 'BSIT-4A']



function matchesStudentFilter(st: Student, q: string, year: string, section: string) {

  const parts = [st.firstName, st.middleName ?? '', st.lastName].filter(Boolean).join(' ')

  const full = parts.replace(/\s+/g, ' ').trim()

  const hitQ =

    !q ||

    normalize(full).includes(q) ||

    normalize(st.email ?? '').includes(q) ||

    normalize(st.id).includes(q)

  const hitYear = !year || normalize(st.yearLevel ?? '') === year

  const hitSection = !section || normalize(st.section ?? '') === section

  return hitQ && hitYear && hitSection

}



export function FacultySkillsPage() {

  type QualificationCategory = 'programming' | 'sports' | 'academic' | 'creative' | 'other'

  type QualifiedStudent = {

    student_id: number

    user_id: number

    name: string

    skills: Array<{ category: string; name: string }>

  }



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

  const [qualificationCategory, setQualificationCategory] = useState<QualificationCategory>('programming')

  const [qualificationCategoryOther, setQualificationCategoryOther] = useState('')

  const [qualifiedStudents, setQualifiedStudents] = useState<QualifiedStudent[]>([])

  const [qualificationLoading, setQualificationLoading] = useState(false)

  const [qualificationError, setQualificationError] = useState<string | null>(null)

  // Pagination and search for qualification by category
  const [qualificationSearch, setQualificationSearch] = useState('')
  const [qualificationPage, setQualificationPage] = useState(1)
  const qualificationPageSize = 20



  const qualificationKeywords: Record<Exclude<QualificationCategory, 'other'>, string[]> = {

    programming: ['program', 'coding', 'code', 'software', 'developer', 'web', 'app', 'technical', 'it', 'computer'],

    sports: ['sport', 'athlet', 'basketball', 'volleyball', 'football', 'soccer', 'badminton', 'swim', 'track', 'chess'],

    academic: ['academic', 'study', 'research', 'math', 'science', 'english', 'history', 'quiz', 'debate', 'scholar'],

    creative: ['creative', 'art', 'music', 'design', 'draw', 'paint', 'dance', 'theater', 'media', 'photo'],

  }



  const getQualifiedStudentsFromLocal = async (

    selectedCategory: QualificationCategory,

    otherCategoryValue: string,

    allSkills: Skill[],

    allStudents: Student[],

  ): Promise<QualifiedStudent[]> => {

    const otherValue = otherCategoryValue.trim().toLowerCase()

    const keywords =

      selectedCategory === 'other'

        ? otherValue

          ? [otherValue]

          : []

        : qualificationKeywords[selectedCategory]

    if (keywords.length === 0) return []



    const activeById = new Map(allSkills.filter((sk) => sk.isActive).map((sk) => [sk.id, sk]))

    const rows = await Promise.all(

      allStudents.map(async (st) => {

        const assigned = await listStudentSkills(st.id)

        const matched = assigned

          .map((row) => activeById.get(row.skillId))

          .filter((sk): sk is Skill => Boolean(sk))

          .filter((sk) => {

            const categoryLower = (sk.category ?? '').toLowerCase()

            const nameLower = (sk.name ?? '').toLowerCase()

            return keywords.some((kw) => categoryLower.includes(kw) || nameLower.includes(kw))

          })

        if (matched.length === 0) return null

        const name = [st.firstName, st.middleName ?? '', st.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

        return {

          student_id: Number(st.id.replace(/\D+/g, '')) || 0,

          user_id: 0,

          name,

          skills: matched.map((sk) => ({ category: sk.category, name: sk.name })),

        } satisfies QualifiedStudent

      }),

    )

    return rows.filter((row): row is QualifiedStudent => Boolean(row))

  }



  const [studentQuery, setStudentQuery] = useState('')

  const [studentYear, setStudentYear] = useState('')

  const [studentSection, setStudentSection] = useState('')

  const [assignSkillSearch, setAssignSkillSearch] = useState('')



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

      // Don't auto-select any student - wait for user selection
      setSelectedStudentId('')

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



  useEffect(() => {

    let alive = true

    ;(async () => {

      const rawCategory =

        qualificationCategory === 'other'

          ? qualificationCategoryOther.trim().toLowerCase()

          : qualificationCategory

      if (!rawCategory) {

        setQualifiedStudents([])

        setQualificationError(null)

        return

      }

      setQualificationLoading(true)

      setQualificationError(null)

      try {

        const res = await axios.get<{ students: QualifiedStudent[] }>('/api/qualification-reports', {

          params: { category: rawCategory },

        })

        if (!alive) return

        const apiStudents = res.data.students ?? []

        if (apiStudents.length > 0) {

          setQualifiedStudents(apiStudents)

        } else {

          const localRows = await getQualifiedStudentsFromLocal(

            qualificationCategory,

            qualificationCategoryOther,

            skills,

            students,

          )

          if (!alive) return

          setQualifiedStudents(localRows)

        }

      } catch (e: unknown) {

        // Fallback to local IndexedDB data so this section still works

        // when the API server is unavailable.

        try {

          const localRows = await getQualifiedStudentsFromLocal(

            qualificationCategory,

            qualificationCategoryOther,

            skills,

            students,

          )

          if (!alive) return

          setQualifiedStudents(localRows)

          setQualificationError(null)

        } catch {

          if (!alive) return

          const msg = axios.isAxiosError(e)

            ? (e.response?.data as { message?: string } | undefined)?.message

            : undefined

          setQualificationError(msg || 'Failed to load qualification results.')

        }

      } finally {

        if (alive) setQualificationLoading(false)

      }

    })()

    return () => {

      alive = false

    }

  }, [qualificationCategory, qualificationCategoryOther, skills, students])



  const activeSkills = useMemo(() => skills.filter((s) => s.isActive), [skills])

  const activeSkillsById = useMemo(() => new Map(activeSkills.map((s) => [s.id, s])), [activeSkills])

  const assignedActiveCount = useMemo(() => assignedSkillIds.filter((id) => activeSkillsById.has(id)).length, [assignedSkillIds, activeSkillsById])



  const sq = useMemo(() => normalize(studentQuery), [studentQuery])

  const sy = useMemo(() => normalize(studentYear), [studentYear])

  const ssec = useMemo(() => normalize(studentSection), [studentSection])



  const filteredStudents = useMemo(

    () => students.filter((st) => matchesStudentFilter(st, sq, sy, ssec)),

    [students, sq, sy, ssec],

  )



  useEffect(() => {

    if (filteredStudents.some((s) => s.id === selectedStudentId)) return

    setSelectedStudentId(filteredStudents[0]?.id ?? '')

  }, [filteredStudents, selectedStudentId])



  const assignSkillQ = useMemo(() => normalize(assignSkillSearch), [assignSkillSearch])

  const filteredActiveSkills = useMemo(() => {

    if (!assignSkillQ) return activeSkills

    return activeSkills.filter(

      (sk) => normalize(sk.name).includes(assignSkillQ) || normalize(sk.category).includes(assignSkillQ),

    )

  }, [activeSkills, assignSkillQ])



  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [students, selectedStudentId])

  const selectedStudentName = useMemo(() => {

    if (!selectedStudent) return 'Student'

    const parts = [selectedStudent.firstName, selectedStudent.middleName ?? '', selectedStudent.lastName].filter(Boolean).join(' ')

    return parts.replace(/\s+/g, ' ').trim()

  }, [selectedStudent])

  // Filter qualified students based on search
  const filteredQualifiedStudents = useMemo(() => {
    if (!qualificationSearch.trim()) return qualifiedStudents
    
    const searchLower = qualificationSearch.toLowerCase()
    return qualifiedStudents.filter(student => 
      student.name.toLowerCase().includes(searchLower) ||
      student.student_id.toString().includes(searchLower) ||
      student.skills.some(skill => 
        skill.name.toLowerCase().includes(searchLower) ||
        skill.category.toLowerCase().includes(searchLower)
      )
    )
  }, [qualifiedStudents, qualificationSearch])

  // Paginated qualified students
  const paginatedQualifiedStudents = useMemo(() => {
    const startIndex = (qualificationPage - 1) * qualificationPageSize
    const endIndex = startIndex + qualificationPageSize
    return filteredQualifiedStudents.slice(startIndex, endIndex)
  }, [filteredQualifiedStudents, qualificationPage, qualificationPageSize])

  // Pagination controls
  const totalQualificationPages = Math.ceil(filteredQualifiedStudents.length / qualificationPageSize)
  const canGoToPrevQualificationPage = qualificationPage > 1
  const canGoToNextQualificationPage = qualificationPage < totalQualificationPages

  // Reset page when search changes
  useEffect(() => {
    setQualificationPage(1)
  }, [qualificationSearch])

  // Reset page when category changes
  useEffect(() => {
    setQualificationPage(1)
  }, [qualificationCategory, qualificationCategoryOther])



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

              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>

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

              <div className="col-12">

                <div className="spms-muted small fw-semibold mb-2">Filter students</div>

                <div className="row g-2 align-items-end">

                  <div className="col-12 col-md-5">

                    <label className="form-label small fw-semibold mb-1">Search</label>

                    <div className="input-group input-group-sm">

                      <span className="input-group-text">

                        <i className="bi bi-search" />

                      </span>

                      <input

                        className="form-control"

                        value={studentQuery}

                        onChange={(e) => setStudentQuery(e.target.value)}

                        placeholder="Name, email, or ID..."

                      />

                    </div>

                  </div>

                  <div className="col-6 col-md-3">

                    <label className="form-label small fw-semibold mb-1">Year level</label>

                    <select

                      className="form-select form-select-sm rounded-3"

                      value={studentYear}

                      onChange={(e) => setStudentYear(e.target.value)}

                    >

                      <option value="">All years</option>

                      {yearOptions.map((y) => (

                        <option key={y} value={y}>

                          {y}

                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="col-6 col-md-3">

                    <label className="form-label small fw-semibold mb-1">Section</label>

                    <select

                      className="form-select form-select-sm rounded-3"

                      value={studentSection}

                      onChange={(e) => setStudentSection(e.target.value)}

                    >

                      <option value="">All sections</option>

                      {sectionOptions.map((sec) => (

                        <option key={sec} value={sec}>

                          {sec}

                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="col-12 col-md-1 text-md-end">

                    <span className="spms-chip small">

                      <i className="bi bi-funnel" /> {filteredStudents.length}

                    </span>

                  </div>

                </div>

              </div>



              <div className="col-12 col-lg-6">

                <label className="form-label small fw-semibold mb-1">Student</label>

                <select

                  className="form-select"

                  value={selectedStudentId}

                  onChange={(e) => setSelectedStudentId(e.target.value)}

                  disabled={studentsLoading || filteredStudents.length === 0}

                >

                  {filteredStudents.length === 0 ? (

                    <option value="">No students match filters</option>

                  ) : null}

                  {filteredStudents.map((st) => {

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

                  <>

                    <div className="mb-2">

                      <label className="form-label small fw-semibold mb-1">Filter skills to assign</label>

                      <div className="input-group input-group-sm">

                        <span className="input-group-text">

                          <i className="bi bi-search" />

                        </span>

                        <input

                          className="form-control"

                          value={assignSkillSearch}

                          onChange={(e) => setAssignSkillSearch(e.target.value)}

                          placeholder="Search skill name or category..."

                        />

                      </div>

                      <div className="spms-muted small mt-1">

                        Showing {filteredActiveSkills.length} of {activeSkills.length} active skills

                      </div>

                    </div>

                    {filteredActiveSkills.length === 0 ? (

                      <div className="alert alert-light border mb-0 small">

                        No skills match “{assignSkillSearch.trim() || '…'}”. Clear the search to see all.

                      </div>

                    ) : (

                  <div className="d-flex flex-wrap gap-2">

                    {filteredActiveSkills.map((sk) => {

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

                  </>

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

                  console.log('Saving skills for student:', selectedStudentId, 'Assigned skill IDs:', assignedSkillIds)

                  setSavingAssign(true)

                  setAssignError(null)

                  try {

                    await setStudentSkills(selectedStudentId, assignedSkillIds)

                    console.log('Skills saved successfully')

                    setSavedModalOpen(true)

                  } catch (e) {

                    console.error('Error saving skills:', e)

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



        <div className="spms-card card border-0 mt-4" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>

          <div className="card-body">

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">

              <h6 className="fw-semibold mb-0">Qualification by Category</h6>

              <span className="spms-chip">

                <i className="bi bi-people" /> {filteredQualifiedStudents.length} qualified

              </span>

            </div>

            {/* Search Input */}
            <div className="mb-3">

              <label className="form-label small fw-semibold mb-1">Search Students</label>

              <div className="input-group input-group-sm">

                <span className="input-group-text">

                  <i className="bi bi-search" />

                </span>

                <input

                  className="form-control"

                  value={qualificationSearch}

                  onChange={(e) => setQualificationSearch(e.target.value)}

                  placeholder="Search by name, student ID, or category..."

                />

              </div>

              <div className="spms-muted small mt-1">

                Showing {paginatedQualifiedStudents.length} of {filteredQualifiedStudents.length} students

                {filteredQualifiedStudents.length > qualificationPageSize && (

                  <span> · Page {qualificationPage} of {totalQualificationPages}</span>

                )}

              </div>

            </div>



            <div className="row g-2 mb-3">

              <div className="col-12 col-lg-5">

                <label className="form-label small fw-semibold mb-1">Category</label>

                <select

                  className="form-select"

                  value={qualificationCategory}

                  onChange={(e) => setQualificationCategory(e.target.value as QualificationCategory)}

                >

                  <option value="programming">Programming</option>

                  <option value="sports">Sports</option>

                  <option value="academic">Academic</option>

                  <option value="creative">Creative</option>

                  <option value="other">Other</option>

                </select>

              </div>

              <div className="col-12 col-lg-7">

                <label className="form-label small fw-semibold mb-1">Other Category</label>

                <input

                  className="form-control"

                  placeholder="Type category directly (e.g. robotics)"

                  value={qualificationCategoryOther}

                  onChange={(e) => setQualificationCategoryOther(e.target.value)}

                  disabled={qualificationCategory !== 'other'}

                />

              </div>

            </div>



            {qualificationError ? (

              <div className="alert alert-danger py-2 mb-3">

                <i className="bi bi-exclamation-circle me-2" />

                {qualificationError}

              </div>

            ) : null}



            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0 spms-table">

                <thead>

                  <tr className="spms-muted small">

                    <th className="py-3 fw-semibold">Student Name</th>

                    <th className="py-3 fw-semibold">Relevant Skills</th>

                  </tr>

                </thead>

                <tbody>

                  {qualificationLoading ? (

                    <tr>

                      <td className="py-3" colSpan={2}>

                        <div className="spms-muted">Loading qualification results...</div>

                      </td>

                    </tr>

                  ) : null}

                  {!qualificationLoading && qualifiedStudents.length === 0 ? (

                    <tr>

                      <td className="py-3" colSpan={2}>

                        <div className="spms-muted">No qualified students found for this category.</div>

                      </td>

                    </tr>

                  ) : null}

                  {!qualificationLoading &&

                    paginatedQualifiedStudents.map((st) => (

                      <tr key={st.student_id}>

                        <td className="fw-semibold">{st.name || `Student #${st.student_id}`}</td>

                        <td>{st.skills.map((s) => s.name).join(', ') || '—'}</td>

                      </tr>

                    ))}

                </tbody>

              </table>

            {/* Pagination Controls */}
            {filteredQualifiedStudents.length > qualificationPageSize && (

              <div className="d-flex align-items-center justify-content-between gap-2 mt-3">

                <div className="text-muted small">

                  Page {qualificationPage} of {totalQualificationPages}

                </div>

                <div className="d-flex gap-2">

                  <button

                    className="btn btn-sm btn-outline-secondary rounded-3"

                    disabled={!canGoToPrevQualificationPage}

                    onClick={() => setQualificationPage(prev => Math.max(1, prev - 1))}

                  >

                    <i className="bi bi-chevron-left me-1" /> Previous

                  </button>

                  <button

                    className="btn btn-sm btn-outline-secondary rounded-3"

                    disabled={!canGoToNextQualificationPage}

                    onClick={() => setQualificationPage(prev => Math.min(totalQualificationPages, prev + 1))}

                  >

                    Next <i className="bi bi-chevron-right ms-1" />

                  </button>

                </div>

              </div>

            )}

            </div>

          </div>

        </div>

      </div>

      </div>

    </>

  )

}

