import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../auth/AuthContext'

type SyllabusRow = {
  syllabus_id: number
  title: string
  description?: string
  course_code?: string
  faculty_user_id?: number | null
  faculty_name?: string | null
  is_archived?: number
}

type LessonRow = {
  lesson_id: number
  syllabus_id: number
  title: string
  content?: string
  curriculum_unit?: string
  week_number?: number | null
  order_index: number
  is_archived?: number
}

type FacultyRow = {
  user_id: number
  username: string
  faculty_type?: string | null
}

export function InstructionModulePage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'faculty'
  const canAssignCourseFaculty = user?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syllabi, setSyllabi] = useState<SyllabusRow[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [faculty, setFaculty] = useState<FacultyRow[]>([])
  const [loadingFaculty, setLoadingFaculty] = useState(false)
  const [selectedFacultyUserId, setSelectedFacultyUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [newSyllabus, setNewSyllabus] = useState({ title: '', faculty_user_id: '' })
  const [newLesson, setNewLesson] = useState({ title: '', curriculum_unit: '', week_number: '', content: '' })

  const selectedSyllabus = useMemo(
    () => syllabi.find((row) => row.syllabus_id === selectedId) ?? null,
    [syllabi, selectedId],
  )
  const facultyNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const f of faculty) map.set(f.user_id, f.username)
    return map
  }, [faculty])

  const fetchSyllabi = async () => {
    const res = await axios.get<{ syllabi: SyllabusRow[] }>('/api/instruction/syllabi')
    const rows = res.data.syllabi ?? []
    setSyllabi(rows)
    setSelectedId((prev) => prev ?? rows[0]?.syllabus_id ?? null)
  }

  const fetchLessons = async (syllabusId: number) => {
    const res = await axios.get<{ lessons: LessonRow[] }>(`/api/instruction/syllabi/${syllabusId}/lessons`)
    setLessons((res.data.lessons ?? []).sort((a, b) => a.order_index - b.order_index))
  }

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      await fetchSyllabi()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load instruction data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (!canAssignCourseFaculty) return
    const fetchFaculty = async () => {
      setLoadingFaculty(true)
      try {
        const res = await axios.get<{ faculty: FacultyRow[] }>('/api/scheduling/faculty')
        setFaculty(res.data.faculty ?? [])
      } catch {
        setError('Failed to load faculty list.')
      } finally {
        setLoadingFaculty(false)
      }
    }
    void fetchFaculty()
  }, [canAssignCourseFaculty])

  useEffect(() => {
    if (!selectedId) {
      setLessons([])
      setSelectedFacultyUserId('')
      return
    }
    void fetchLessons(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!selectedSyllabus) {
      setSelectedFacultyUserId('')
      return
    }
    setSelectedFacultyUserId(selectedSyllabus.faculty_user_id ? String(selectedSyllabus.faculty_user_id) : '')
  }, [selectedSyllabus?.syllabus_id, selectedSyllabus?.faculty_user_id])

  const createSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    if (!newSyllabus.title.trim()) {
      setError('Syllabus title is required.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/instruction/syllabi', {
        title: newSyllabus.title.trim(),
        course_code: '',
        description: '',
        faculty_user_id: canAssignCourseFaculty
          ? (newSyllabus.faculty_user_id ? Number(newSyllabus.faculty_user_id) : null)
          : undefined,
      })
      setNewSyllabus({ title: '', faculty_user_id: '' })
      await fetchSyllabi()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const createLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit || !selectedId) return
    setError(null)
    if (!newLesson.title.trim()) {
      setError('Lesson title is required.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/instruction/lessons', {
        syllabus_id: selectedId,
        title: newLesson.title.trim(),
        curriculum_unit: newLesson.curriculum_unit.trim(),
        week_number: newLesson.week_number ? Number(newLesson.week_number) : null,
        content: newLesson.content.trim(),
      })
      setNewLesson({ title: '', curriculum_unit: '', week_number: '', content: '' })
      await fetchLessons(selectedId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveCurriculum = async () => {
    if (!canEdit || !selectedId) return
    setSubmitting(true)
    setError(null)
    try {
      await axios.put(`/api/instruction/syllabi/${selectedId}/curriculum`, {
        lessons: lessons.map((row, idx) => ({
          lesson_id: row.lesson_id,
          order_index: idx + 1,
          curriculum_unit: row.curriculum_unit ?? '',
          week_number: row.week_number ?? null,
        })),
      })
      await fetchLessons(selectedId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to save curriculum order.')
    } finally {
      setSubmitting(false)
    }
  }

  const moveLesson = (lessonId: number, dir: -1 | 1) => {
    setLessons((prev) => {
      const idx = prev.findIndex((x) => x.lesson_id === lessonId)
      if (idx < 0) return prev
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, item)
      return copy.map((row, i) => ({ ...row, order_index: i + 1 }))
    })
  }

  const archiveSyllabus = async () => {
    if (!canEdit || !selectedId) return
    const ok = window.confirm('Archive this syllabus and all its lessons?')
    if (!ok) return
    setSubmitting(true)
    try {
      await axios.delete(`/api/instruction/syllabi/${selectedId}`)
      setSelectedId(null)
      await fetchSyllabi()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to archive syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const editSyllabus = async () => {
    if (!canEdit || !selectedSyllabus) return
    const title = window.prompt('Syllabus title', selectedSyllabus.title)
    if (title === null) return
    setSubmitting(true)
    try {
      await axios.put(`/api/instruction/syllabi/${selectedSyllabus.syllabus_id}`, {
        title: title.trim(),
        course_code: '',
        description: '',
      })
      await fetchSyllabi()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveAssignedFaculty = async () => {
    if (!canAssignCourseFaculty || !selectedSyllabus) return
    setSubmitting(true)
    setError(null)
    try {
      await axios.put(`/api/instruction/syllabi/${selectedSyllabus.syllabus_id}`, {
        faculty_user_id: selectedFacultyUserId ? Number(selectedFacultyUserId) : null,
      })
      await fetchSyllabi()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to assign faculty.')
    } finally {
      setSubmitting(false)
    }
  }

  const archiveLesson = async (lessonId: number) => {
    if (!canEdit || !selectedId) return
    const ok = window.confirm('Archive this lesson?')
    if (!ok) return
    setSubmitting(true)
    try {
      await axios.delete(`/api/instruction/lessons/${lessonId}`)
      await fetchLessons(selectedId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to archive lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  const editLesson = async (row: LessonRow) => {
    if (!canEdit) return
    const title = window.prompt('Lesson title', row.title)
    if (title === null) return
    const unit = window.prompt('Curriculum unit', row.curriculum_unit ?? '')
    if (unit === null) return
    const weekRaw = window.prompt('Week number (optional)', row.week_number ? String(row.week_number) : '')
    if (weekRaw === null) return
    const content = window.prompt('Lesson content', row.content ?? '')
    if (content === null) return
    const weekNumber = weekRaw.trim() ? Number(weekRaw.trim()) : null
    setSubmitting(true)
    try {
      await axios.put(`/api/instruction/lessons/${row.lesson_id}`, {
        title: title.trim(),
        curriculum_unit: unit.trim(),
        week_number: weekNumber,
        content: content.trim(),
      })
      if (selectedId) await fetchLessons(selectedId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-4">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-2">Syllabus</h6>
            {canEdit ? (
              <form onSubmit={createSyllabus} className="d-flex flex-column gap-2 mb-3">
                <input className="form-control" placeholder="Syllabus title" value={newSyllabus.title} onChange={(e) => setNewSyllabus((v) => ({ ...v, title: e.target.value }))} disabled={submitting} />
                {canAssignCourseFaculty ? (
                  <select className="form-select" value={newSyllabus.faculty_user_id} onChange={(e) => setNewSyllabus((v) => ({ ...v, faculty_user_id: e.target.value }))} disabled={submitting || loadingFaculty}>
                    <option value="">Assigned faculty (optional)</option>
                    {faculty.map((f) => (
                      <option key={f.user_id} value={String(f.user_id)}>
                        {f.username} ({f.faculty_type ?? 'Faculty'})
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="submit" className="btn btn-primary btn-sm rounded-3" disabled={submitting}>Create syllabus</button>
              </form>
            ) : null}

            {loading ? <div className="spms-muted small">Loading…</div> : null}
            {!loading && syllabi.length === 0 ? <div className="spms-muted small">No syllabus available yet.</div> : null}
            <div className="list-group">
              {syllabi.map((row) => (
                <button
                  key={row.syllabus_id}
                  type="button"
                  className={`list-group-item list-group-item-action ${row.syllabus_id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(row.syllabus_id)}
                >
                  <div className="fw-semibold">{row.title}</div>
                  <div className="small opacity-75">Faculty: {row.faculty_name || (row.faculty_user_id ? (facultyNameById.get(row.faculty_user_id) ?? `#${row.faculty_user_id}`) : 'Unassigned')}</div>
                </button>
              ))}
            </div>
            {canEdit && selectedId ? (
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => void editSyllabus()} disabled={submitting}>
                  Edit selected syllabus
                </button>
                <button type="button" className="btn btn-outline-warning btn-sm rounded-3" onClick={() => void archiveSyllabus()} disabled={submitting}>
                  Archive selected syllabus
                </button>
              </div>
            ) : null}
            {canAssignCourseFaculty && selectedId ? (
              <div className="mt-3 border rounded-3 p-2">
                <div className="small fw-semibold mb-2">Assign faculty</div>
                <div className="d-flex gap-2">
                  <select className="form-select form-select-sm" value={selectedFacultyUserId} onChange={(e) => setSelectedFacultyUserId(e.target.value)} disabled={submitting || loadingFaculty}>
                    <option value="">Unassigned</option>
                    {faculty.map((f) => (
                      <option key={f.user_id} value={String(f.user_id)}>
                        {f.username} ({f.faculty_type ?? 'Faculty'})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-primary rounded-3" onClick={() => void saveAssignedFaculty()} disabled={submitting}>
                    Save
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-1">Lessons and Curriculum</h6>
            <p className="spms-muted small mb-3">
              {selectedSyllabus ? `${selectedSyllabus.title}${selectedSyllabus.course_code ? ` (${selectedSyllabus.course_code})` : ''}` : 'Select a syllabus to view lessons.'}
            </p>

            {canEdit && selectedId ? (
              <form onSubmit={createLesson} className="row g-2 mb-3">
                <div className="col-12 col-md-6">
                  <input className="form-control" placeholder="Lesson title" value={newLesson.title} onChange={(e) => setNewLesson((v) => ({ ...v, title: e.target.value }))} disabled={submitting} />
                </div>
                <div className="col-6 col-md-3">
                  <input className="form-control" placeholder="Curriculum unit" value={newLesson.curriculum_unit} onChange={(e) => setNewLesson((v) => ({ ...v, curriculum_unit: e.target.value }))} disabled={submitting} />
                </div>
                <div className="col-6 col-md-3">
                  <input className="form-control" type="number" min={1} max={52} placeholder="Week #" value={newLesson.week_number} onChange={(e) => setNewLesson((v) => ({ ...v, week_number: e.target.value }))} disabled={submitting} />
                </div>
                <div className="col-12">
                  <textarea className="form-control" rows={3} placeholder="Lesson content" value={newLesson.content} onChange={(e) => setNewLesson((v) => ({ ...v, content: e.target.value }))} disabled={submitting} />
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm rounded-3" disabled={submitting || !selectedId}>Add lesson</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => void saveCurriculum()} disabled={submitting || lessons.length === 0}>
                    Save curriculum order
                  </button>
                </div>
              </form>
            ) : null}

            {error ? (
              <div className="alert alert-danger py-2">
                <i className="bi bi-exclamation-circle me-2" />
                {error}
              </div>
            ) : null}

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr className="small spms-muted">
                    <th>Order</th>
                    <th>Lesson</th>
                    <th>Curriculum</th>
                    <th>Week</th>
                    <th>Content</th>
                    {canEdit ? <th className="text-end">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {selectedId && lessons.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 6 : 5} className="py-3 spms-muted text-center">No lessons yet.</td>
                    </tr>
                  ) : null}
                  {!selectedId ? (
                    <tr>
                      <td colSpan={canEdit ? 6 : 5} className="py-3 spms-muted text-center">Select a syllabus first.</td>
                    </tr>
                  ) : null}
                  {lessons.map((row, idx) => (
                    <tr key={row.lesson_id}>
                      <td className="fw-semibold">{idx + 1}</td>
                      <td className="fw-semibold">{row.title}</td>
                      <td>{row.curriculum_unit || '—'}</td>
                      <td>{row.week_number ?? '—'}</td>
                      <td className="small">{row.content || '—'}</td>
                      {canEdit ? (
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => moveLesson(row.lesson_id, -1)} disabled={idx === 0}>
                              <i className="bi bi-arrow-up" />
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => moveLesson(row.lesson_id, 1)} disabled={idx === lessons.length - 1}>
                              <i className="bi bi-arrow-down" />
                            </button>
                            <button type="button" className="btn btn-outline-danger" onClick={() => void archiveLesson(row.lesson_id)} disabled={submitting}>
                              Archive
                            </button>
                            <button type="button" className="btn btn-outline-primary" onClick={() => void editLesson(row)} disabled={submitting}>
                              Edit
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
