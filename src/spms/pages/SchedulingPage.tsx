import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type CourseRow = {
  course_id: number
  code: string
  title: string
  created_at?: string | null
  updated_at?: string | null
}

type SectionRow = {
  section_id: number
  course_id: number
  name: string
  created_at?: string | null
  updated_at?: string | null
}

type RoomRow = {
  room_id: number
  section_id?: number
  name: string
  building?: string | null
  capacity?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type LabRow = {
  lab_id: number
  room_id: number
  name: string
  faculty_user_id?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type FacultyRow = {
  user_id: number
  username: string
  email: string
  faculty_type?: string | null
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

type ScheduleStep = 1 | 2 | 3 | 4 | 5

export function SchedulingPage() {
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [sections, setSections] = useState<SectionRow[]>([])
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [labs, setLabs] = useState<LabRow[]>([])
  const [faculty, setFaculty] = useState<FacultyRow[]>([])

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingLabs, setLoadingLabs] = useState(false)
  const [loadingFaculty, setLoadingFaculty] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedCourse = useMemo(
    () => courses.find((r) => r.course_id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )
  const selectedSection = useMemo(
    () => sections.find((r) => r.section_id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  )
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.room_id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )
  const selectedLab = useMemo(
    () => labs.find((l) => l.lab_id === selectedLabId) ?? null,
    [labs, selectedLabId],
  )
  const facultyById = useMemo(() => new Map(faculty.map((f) => [f.user_id, f])), [faculty])
  const facultyLabel = (facultyUserId?: number | null) => {
    if (!facultyUserId) return 'Unassigned'
    const row = facultyById.get(Number(facultyUserId))
    return row ? `${row.username} (#${row.user_id})` : `#${facultyUserId}`
  }

  const [newCourse, setNewCourse] = useState({ code: '', title: '' })
  const [newSectionName, setNewSectionName] = useState('')
  const [newRoom, setNewRoom] = useState({ name: '', building: '', capacity: '' })
  const [newLabName, setNewLabName] = useState('')

  const [editRoomModal, setEditRoomModal] = useState<RoomRow | null>(null)
  const [editRoom, setEditRoom] = useState({ name: '', building: '', capacity: '' })

  const [editLabModal, setEditLabModal] = useState<LabRow | null>(null)
  const [editLabName, setEditLabName] = useState('')

  const [assignFacultyId, setAssignFacultyId] = useState<string>('')
  const [step, setStep] = useState<ScheduleStep>(1)
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false)
  const [createSectionModalOpen, setCreateSectionModalOpen] = useState(false)
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false)
  const [viewRoomsModalOpen, setViewRoomsModalOpen] = useState(false)
  const [createLabModalOpen, setCreateLabModalOpen] = useState(false)
  const [viewLabsModalOpen, setViewLabsModalOpen] = useState(false)
  const [assignFacultyModalOpen, setAssignFacultyModalOpen] = useState(false)

  const fetchCourses = async () => {
    setLoadingCourses(true)
    setError(null)
    try {
      const res = await axios.get<{ courses: CourseRow[] }>('/api/scheduling/courses')
      const rows = res.data.courses ?? []
      setCourses(rows)
      setSelectedCourseId((prev) => prev ?? rows[0]?.course_id ?? null)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load courses.')
    } finally {
      setLoadingCourses(false)
    }
  }

  const fetchSections = async (courseId: number) => {
    setLoadingSections(true)
    setError(null)
    try {
      const res = await axios.get<{ sections: SectionRow[] }>(`/api/scheduling/courses/${courseId}/sections`)
      const rows = res.data.sections ?? []
      setSections(rows)
      setSelectedSectionId((prev) => prev ?? rows[0]?.section_id ?? null)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load sections.')
      setSections([])
      setSelectedSectionId(null)
    } finally {
      setLoadingSections(false)
    }
  }

  const fetchRooms = async () => {
    setLoadingRooms(true)
    setError(null)
    if (!selectedSectionId) {
      setRooms([])
      setSelectedRoomId(null)
      setLoadingRooms(false)
      return
    }
    try {
      const res = await axios.get<{ rooms: RoomRow[] }>(`/api/scheduling/sections/${selectedSectionId}/rooms`)
      const rows = res.data.rooms ?? []
      setRooms(rows)
      setSelectedRoomId((prev) => prev ?? rows[0]?.room_id ?? null)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load rooms.')
    } finally {
      setLoadingRooms(false)
    }
  }

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = newCourse.code.trim()
    const title = newCourse.title.trim()
    if (!code || !title) {
      setError('Please enter course code and title.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/scheduling/courses', { code, title })
      setNewCourse({ code: '', title: '' })
      setCreateCourseModalOpen(false)
      await fetchCourses()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create course.')
    } finally {
      setSubmitting(false)
    }
  }

  const createSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      setError('Select a course first.')
      return
    }
    setError(null)
    const name = newSectionName.trim()
    if (!name) {
      setError('Please enter section name.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post(`/api/scheduling/courses/${selectedCourseId}/sections`, { name })
      setNewSectionName('')
      setCreateSectionModalOpen(false)
      await fetchSections(selectedCourseId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create section.')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchLabs = async (roomId: number) => {
    setLoadingLabs(true)
    setError(null)
    try {
      const res = await axios.get<{ labs: LabRow[] }>(`/api/scheduling/rooms/${roomId}/labs`)
      const rows = res.data.labs ?? []
      setLabs(rows)
      setSelectedLabId((prev) => prev ?? rows[0]?.lab_id ?? null)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load labs.')
      setLabs([])
      setSelectedLabId(null)
    } finally {
      setLoadingLabs(false)
    }
  }

  const fetchFaculty = async () => {
    setLoadingFaculty(true)
    setError(null)
    try {
      const res = await axios.get<{ faculty: FacultyRow[] }>('/api/scheduling/faculty')
      setFaculty(res.data.faculty ?? [])
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load faculty list.')
    } finally {
      setLoadingFaculty(false)
    }
  }

  useEffect(() => {
    void fetchCourses()
    void fetchFaculty()
  }, [])

  useEffect(() => {
    if (!selectedCourseId) {
      setSections([])
      setSelectedSectionId(null)
      return
    }
    setSelectedSectionId(null)
    void fetchSections(selectedCourseId)
  }, [selectedCourseId])

  useEffect(() => {
    if (!selectedSectionId) {
      setRooms([])
      setSelectedRoomId(null)
      return
    }
    setSelectedRoomId(null)
    void fetchRooms()
  }, [selectedSectionId])

  useEffect(() => {
    if (!selectedRoomId) {
      setLabs([])
      setSelectedLabId(null)
      return
    }
    setSelectedLabId(null)
    void fetchLabs(selectedRoomId)
  }, [selectedRoomId])

  useEffect(() => {
    if (!selectedLab) {
      setAssignFacultyId('')
      return
    }
    setAssignFacultyId(selectedLab.faculty_user_id ? String(selectedLab.faculty_user_id) : '')
  }, [selectedLab?.lab_id])

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSectionId) {
      setError('Select a section first.')
      return
    }
    setError(null)
    const name = newRoom.name.trim()
    if (!name) {
      setError('Please enter a room name.')
      return
    }
    const building = newRoom.building.trim()
    const capRaw = newRoom.capacity.trim()
    const capacity = capRaw ? Number(capRaw) : null
    if (capRaw && (capacity == null || !Number.isFinite(capacity) || capacity < 0)) {
      setError('Capacity must be a number (0 or more).')
      return
    }

    setSubmitting(true)
    try {
      await axios.post(`/api/scheduling/sections/${selectedSectionId}/rooms`, {
        name,
        building: building || null,
        capacity,
      })
      setNewRoom({ name: '', building: '', capacity: '' })
      setCreateRoomModalOpen(false)
      await fetchRooms()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create room.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeEditRoom = () => {
    setEditRoomModal(null)
    setEditRoom({ name: '', building: '', capacity: '' })
  }

  const saveEditRoom = async () => {
    if (!editRoomModal) return
    setError(null)
    const name = editRoom.name.trim()
    if (!name) {
      setError('Please enter a room name.')
      return
    }
    const building = editRoom.building.trim()
    const capRaw = editRoom.capacity.trim()
    const capacity = capRaw ? Number(capRaw) : null
    if (capRaw && (capacity == null || !Number.isFinite(capacity) || capacity < 0)) {
      setError('Capacity must be a number (0 or more).')
      return
    }
    setSubmitting(true)
    try {
      await axios.put(`/api/scheduling/rooms/${editRoomModal.room_id}`, {
        name,
        building: building || null,
        capacity,
      })
      closeEditRoom()
      await fetchRooms()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update room.')
    } finally {
      setSubmitting(false)
    }
  }

  const createLab = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoomId) {
      setError('Select a room first.')
      return
    }
    setError(null)
    const name = newLabName.trim()
    if (!name) {
      setError('Please enter a lab name.')
      return
    }
    setSubmitting(true)
    try {
      await axios.post(`/api/scheduling/rooms/${selectedRoomId}/labs`, { name })
      setNewLabName('')
      setCreateLabModalOpen(false)
      await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create lab.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeEditLab = () => {
    setEditLabModal(null)
    setEditLabName('')
  }

  const saveEditLab = async () => {
    if (!editLabModal) return
    setError(null)
    const name = editLabName.trim()
    if (!name) {
      setError('Please enter a lab name.')
      return
    }
    setSubmitting(true)
    try {
      await axios.put(`/api/scheduling/labs/${editLabModal.lab_id}`, { name })
      closeEditLab()
      if (selectedRoomId) await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update lab.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveFacultyAssignment = async () => {
    if (!selectedLab) {
      setError('Select a lab first.')
      return
    }
    setError(null)
    const facultyId = assignFacultyId ? Number(assignFacultyId) : null
    if (assignFacultyId && !Number.isFinite(facultyId)) {
      setError('Invalid faculty selection.')
      return
    }
    setSubmitting(true)
    try {
      await axios.put(`/api/scheduling/labs/${selectedLab.lab_id}`, { faculty_user_id: facultyId })
      setAssignFacultyModalOpen(false)
      if (selectedRoomId) await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to assign faculty.')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoSections = Boolean(selectedCourseId)
  const canGoRooms = Boolean(selectedCourseId && selectedSectionId)
  const canGoLabs = Boolean(selectedCourseId && selectedSectionId && selectedRoomId)
  const canGoFaculty = Boolean(selectedCourseId && selectedSectionId && selectedRoomId && selectedLabId)

  const goToStep = (next: ScheduleStep) => {
    if (next === 2 && !canGoSections) return
    if (next === 3 && !canGoRooms) return
    if (next === 4 && !canGoLabs) return
    if (next === 5 && !canGoFaculty) return
    setStep(next)
  }

  return (
    <>
      {editRoomModal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Room</h5>
                  <button type="button" className="btn-close" onClick={closeEditRoom} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Room Name</label>
                      <input className="form-control" value={editRoom.name} onChange={(e) => setEditRoom((p) => ({ ...p, name: e.target.value }))} disabled={submitting} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Building (optional)</label>
                      <input className="form-control" value={editRoom.building} onChange={(e) => setEditRoom((p) => ({ ...p, building: e.target.value }))} disabled={submitting} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Capacity (optional)</label>
                      <input className="form-control" inputMode="numeric" value={editRoom.capacity} onChange={(e) => setEditRoom((p) => ({ ...p, capacity: e.target.value }))} disabled={submitting} />
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2 mt-3 mb-0">
                      <i className="bi bi-exclamation-circle me-2" />
                      {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeEditRoom} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary rounded-3" onClick={() => void saveEditRoom()} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeEditRoom} />
        </>
      )}

      {editLabModal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Lab</h5>
                  <button type="button" className="btn-close" onClick={closeEditLab} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Lab Name</label>
                      <input className="form-control" value={editLabName} onChange={(e) => setEditLabName(e.target.value)} disabled={submitting} />
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2 mt-3 mb-0">
                      <i className="bi bi-exclamation-circle me-2" />
                      {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeEditLab} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary rounded-3" onClick={() => void saveEditLab()} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeEditLab} />
        </>
      )}

      {createCourseModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Create Course</h5>
                  <button type="button" className="btn-close" onClick={() => setCreateCourseModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <form onSubmit={createCourse} className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Course Code</label>
                      <input className="form-control" value={newCourse.code} onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))} disabled={submitting} placeholder="e.g. BSIT" />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Course Title</label>
                      <input className="form-control" value={newCourse.title} onChange={(e) => setNewCourse((p) => ({ ...p, title: e.target.value }))} disabled={submitting} placeholder="e.g. Bachelor of Science in IT" />
                    </div>
                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary rounded-3" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Create Course'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setCreateCourseModalOpen(false)} />
        </>
      )}

      {createSectionModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Create Section</h5>
                  <button type="button" className="btn-close" onClick={() => setCreateSectionModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="spms-muted small mb-2">Course: <span className="fw-semibold">{selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : 'No course selected'}</span></div>
                  <form onSubmit={createSection} className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Section Name</label>
                      <input className="form-control" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} disabled={submitting || !selectedCourseId} placeholder="e.g. BSIT-3A" />
                    </div>
                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary rounded-3" disabled={submitting || !selectedCourseId}>
                        {submitting ? 'Saving...' : 'Create Section'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setCreateSectionModalOpen(false)} />
        </>
      )}

      {createRoomModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Create Room</h5>
                  <button type="button" className="btn-close" onClick={() => setCreateRoomModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <form onSubmit={createRoom} className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Room Name</label>
                      <input className="form-control" value={newRoom.name} onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))} disabled={submitting} placeholder="e.g. Room 301" />
                    </div>
                    <div className="col-7">
                      <label className="form-label small fw-semibold">Building</label>
                      <input className="form-control" value={newRoom.building} onChange={(e) => setNewRoom((p) => ({ ...p, building: e.target.value }))} disabled={submitting} placeholder="optional" />
                    </div>
                    <div className="col-5">
                      <label className="form-label small fw-semibold">Capacity</label>
                      <input className="form-control" inputMode="numeric" value={newRoom.capacity} onChange={(e) => setNewRoom((p) => ({ ...p, capacity: e.target.value }))} disabled={submitting} placeholder="optional" />
                    </div>
                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary rounded-3" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Create Room'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setCreateRoomModalOpen(false)} />
        </>
      )}

      {viewRoomsModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">All Created Rooms</h5>
                  <button type="button" className="btn-close" onClick={() => setViewRoomsModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  {rooms.length === 0 ? (
                    <div className="spms-muted small">No rooms yet.</div>
                  ) : (
                    <div className="list-group">
                      {rooms.map((r) => (
                        <button key={r.room_id} type="button" className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedRoomId === r.room_id ? 'active' : ''}`} onClick={() => { setSelectedRoomId(r.room_id); setViewRoomsModalOpen(false) }}>
                          <div className="text-start">
                            <div className="fw-semibold">{r.name}</div>
                            <div className={`small ${selectedRoomId === r.room_id ? 'text-white-50' : 'text-muted'}`}>{r.building ? `${r.building} • ` : ''}{r.capacity != null ? `Cap ${r.capacity}` : 'No capacity set'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setViewRoomsModalOpen(false)} />
        </>
      )}

      {createLabModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Create Lab</h5>
                  <button type="button" className="btn-close" onClick={() => setCreateLabModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="spms-muted small mb-2">Room: <span className="fw-semibold">{selectedRoom?.name ?? 'No room selected'}</span></div>
                  <form onSubmit={createLab} className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Lab Name</label>
                      <input className="form-control" value={newLabName} onChange={(e) => setNewLabName(e.target.value)} disabled={submitting || !selectedRoomId} placeholder="e.g. Computer Lab 1" />
                    </div>
                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary rounded-3" disabled={submitting || !selectedRoomId}>
                        {submitting ? 'Saving...' : 'Create Lab'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setCreateLabModalOpen(false)} />
        </>
      )}

      {viewLabsModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">All Created Labs</h5>
                  <button type="button" className="btn-close" onClick={() => setViewLabsModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  {!selectedRoomId ? (
                    <div className="spms-muted small">Select a room first.</div>
                  ) : labs.length === 0 ? (
                    <div className="spms-muted small">No labs yet for this room.</div>
                  ) : (
                    <div className="list-group">
                      {labs.map((l) => (
                        <button key={l.lab_id} type="button" className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedLabId === l.lab_id ? 'active' : ''}`} onClick={() => { setSelectedLabId(l.lab_id); setViewLabsModalOpen(false) }}>
                          <div className="text-start">
                            <div className="fw-semibold">{l.name}</div>
                            <div className={`small ${selectedLabId === l.lab_id ? 'text-white-50' : 'text-muted'}`}>Faculty: {facultyLabel(l.faculty_user_id)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setViewLabsModalOpen(false)} />
        </>
      )}

      {assignFacultyModalOpen && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Assign Faculty</h5>
                  <button type="button" className="btn-close" onClick={() => setAssignFacultyModalOpen(false)} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="spms-muted small mb-2">
                    Room: <span className="fw-semibold">{selectedRoom?.name ?? '—'}</span><br />
                    Lab: <span className="fw-semibold">{selectedLab?.name ?? '—'}</span>
                  </div>
                  <label className="form-label small fw-semibold">Faculty</label>
                  <select className="form-select" value={assignFacultyId} onChange={(e) => setAssignFacultyId(e.target.value)} disabled={!selectedLab || submitting || loadingFaculty}>
                    <option value="">Unassigned</option>
                    {faculty.map((f) => (
                      <option key={f.user_id} value={String(f.user_id)}>
                        {f.username} ({f.faculty_type ?? 'Faculty'})
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 d-flex justify-content-end">
                    <button type="button" className="btn btn-primary rounded-3" disabled={!selectedLab || submitting} onClick={() => void saveFacultyAssignment()}>
                      {submitting ? 'Saving...' : 'Save Assignment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setAssignFacultyModalOpen(false)} />
        </>
      )}

      <div className="row g-4">
        <div className="col-12">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="row g-2 row-cols-1 row-cols-sm-2 row-cols-lg-5">
                <div className="col">
                  <button type="button" className={`w-100 text-start border rounded-3 p-3 ${step === 1 ? 'bg-primary text-white border-primary' : 'bg-white border-light-subtle'}`} onClick={() => goToStep(1)}>
                    <div className="fw-semibold">Course</div>
                    <div className={`small ${step === 1 ? 'text-white-50' : 'text-muted'}`}>{selectedCourse ? selectedCourse.code : 'Choose course'}</div>
                  </button>
                </div>
                <div className="col">
                  <button type="button" className={`w-100 text-start border rounded-3 p-3 ${step === 2 ? 'bg-primary text-white border-primary' : 'bg-white border-light-subtle'}`} onClick={() => goToStep(2)} disabled={!canGoSections}>
                    <div className="fw-semibold">Section</div>
                    <div className={`small ${step === 2 ? 'text-white-50' : 'text-muted'}`}>{selectedSection ? selectedSection.name : 'Choose section'}</div>
                  </button>
                </div>
                <div className="col">
                  <button type="button" className={`w-100 text-start border rounded-3 p-3 ${step === 3 ? 'bg-primary text-white border-primary' : 'bg-white border-light-subtle'}`} onClick={() => goToStep(3)} disabled={!canGoRooms}>
                    <div className="fw-semibold">Rooms</div>
                    <div className={`small ${step === 3 ? 'text-white-50' : 'text-muted'}`}>{selectedRoom ? selectedRoom.name : 'Choose room'}</div>
                  </button>
                </div>
                <div className="col">
                  <button type="button" className={`w-100 text-start border rounded-3 p-3 ${step === 4 ? 'bg-primary text-white border-primary' : 'bg-white border-light-subtle'}`} onClick={() => goToStep(4)} disabled={!canGoLabs}>
                    <div className="fw-semibold">Lab</div>
                    <div className={`small ${step === 4 ? 'text-white-50' : 'text-muted'}`}>{selectedLab ? selectedLab.name : 'Choose lab'}</div>
                  </button>
                </div>
                <div className="col">
                  <button type="button" className={`w-100 text-start border rounded-3 p-3 ${step === 5 ? 'bg-primary text-white border-primary' : 'bg-white border-light-subtle'}`} onClick={() => goToStep(5)} disabled={!canGoFaculty}>
                    <div className="fw-semibold">Faculty</div>
                    <div className={`small ${step === 5 ? 'text-white-50' : 'text-muted'}`}>{selectedLab?.faculty_user_id ? `Assigned ${facultyLabel(selectedLab.faculty_user_id)}` : 'Assign faculty'}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="col-12">
            <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Course</h6>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary rounded-4 px-4" onClick={() => setCreateCourseModalOpen(true)}>
                    Create Course
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div className="fw-semibold">Course List</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-3"
                    onClick={() => void fetchCourses()}
                    disabled={loadingCourses}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                </div>

                <div className="mt-2">
                  {loadingCourses ? (
                    <div className="spms-muted small py-2">Loading courses...</div>
                  ) : courses.length === 0 ? (
                    <div className="spms-muted small py-2">No courses yet.</div>
                  ) : (
                    <div className="list-group">
                      {courses.map((c) => (
                        <button
                          type="button"
                          key={c.course_id}
                          className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${
                            selectedCourseId === c.course_id ? 'active' : ''
                          }`}
                          onClick={() => setSelectedCourseId(c.course_id)}
                          disabled={submitting}
                        >
                          <div className="me-2 text-start">
                            <div className="fw-semibold">{c.code}</div>
                            <div className={`small ${selectedCourseId === c.course_id ? 'text-white-50' : 'text-muted'}`}>
                              {c.title}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn btn-primary rounded-4 px-4"
                    onClick={() => goToStep(2)}
                    disabled={!canGoSections}
                  >
                    Continue to Section <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="col-12">
            <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
              <div className="card-body">
                <h6 className="fw-semibold mb-1">Section</h6>
                <div className="spms-muted small mb-3">
                  {selectedCourse ? (
                    <>Selected course: <span className="fw-semibold">{selectedCourse.code} - {selectedCourse.title}</span></>
                  ) : (
                    'Select a course first.'
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary rounded-4 px-4"
                    disabled={!selectedCourseId}
                    onClick={() => setCreateSectionModalOpen(true)}
                  >
                    Create Section
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div className="fw-semibold">Section List</div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-3"
                    onClick={() => selectedCourseId && void fetchSections(selectedCourseId)}
                    disabled={loadingSections || !selectedCourseId}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                </div>

                <div className="mt-2">
                  {!selectedCourseId ? (
                    <div className="spms-muted small py-2">No course selected.</div>
                  ) : loadingSections ? (
                    <div className="spms-muted small py-2">Loading sections...</div>
                  ) : sections.length === 0 ? (
                    <div className="spms-muted small py-2">No sections yet for this course.</div>
                  ) : (
                    <div className="list-group">
                      {sections.map((s) => (
                        <button
                          type="button"
                          key={s.section_id}
                          className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${
                            selectedSectionId === s.section_id ? 'active' : ''
                          }`}
                          onClick={() => setSelectedSectionId(s.section_id)}
                          disabled={submitting}
                        >
                          <div className="me-2 text-start">
                            <div className="fw-semibold">{s.name}</div>
                            <div className={`small ${selectedSectionId === s.section_id ? 'text-white-50' : 'text-muted'}`}>Section ID: {s.section_id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(1)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Course
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary rounded-4 px-4"
                    onClick={() => goToStep(3)}
                    disabled={!canGoRooms}
                  >
                    Continue to Rooms <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="col-12">
            <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
              <div className="card-body">
                <h6 className="fw-semibold mb-1">Rooms</h6>
                <div className="spms-muted small mb-3">
                  {selectedSection ? (
                    <>Selected section: <span className="fw-semibold">{selectedSection.name}</span></>
                  ) : (
                    'Select a section first.'
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary rounded-4 px-4" disabled={!selectedSectionId} onClick={() => setCreateRoomModalOpen(true)}>
                    Create Room
                  </button>
                  <button type="button" className="btn btn-outline-primary rounded-4 px-4" disabled={!selectedSectionId} onClick={() => setViewRoomsModalOpen(true)}>
                    View All Created Rooms
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div className="fw-semibold">Room List</div>
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchRooms()} disabled={loadingRooms || !selectedSectionId}>
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                </div>
                <div className="mt-2">
                  {!selectedSectionId ? (
                    <div className="spms-muted small py-2">No section selected.</div>
                  ) : loadingRooms ? (
                    <div className="spms-muted small py-2">Loading rooms...</div>
                  ) : rooms.length === 0 ? (
                    <div className="spms-muted small py-2">No rooms yet for this section.</div>
                  ) : (
                    <div className="list-group">
                      {rooms.map((r) => (
                        <button key={r.room_id} type="button" className={`list-group-item list-group-item-action ${selectedRoomId === r.room_id ? 'active' : ''}`} onClick={() => setSelectedRoomId(r.room_id)}>
                          <div className="fw-semibold">{r.name}</div>
                          <div className={`small ${selectedRoomId === r.room_id ? 'text-white-50' : 'text-muted'}`}>{r.building ? `${r.building} • ` : ''}{r.capacity != null ? `Cap ${r.capacity}` : 'No capacity set'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(2)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Section
                  </button>
                  <button type="button" className="btn btn-primary rounded-4 px-4" onClick={() => goToStep(4)} disabled={!canGoLabs}>
                    Continue to Lab <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="col-12">
            <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
              <div className="card-body">
                <h6 className="fw-semibold mb-1">Lab</h6>
                <div className="spms-muted small mb-3">
                  {selectedRoom ? <>Selected room: <span className="fw-semibold">{selectedRoom.name}</span></> : 'Select a room first.'}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary rounded-4 px-4" disabled={!selectedRoomId} onClick={() => setCreateLabModalOpen(true)}>
                    Create Lab
                  </button>
                  <button type="button" className="btn btn-outline-primary rounded-4 px-4" disabled={!selectedRoomId} onClick={() => setViewLabsModalOpen(true)}>
                    View All Created Labs
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-4">
                  <div className="fw-semibold">Lab List</div>
                  <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => selectedRoomId && void fetchLabs(selectedRoomId)} disabled={loadingLabs || !selectedRoomId}>
                    <i className="bi bi-arrow-clockwise me-1" />
                    Refresh
                  </button>
                </div>
                <div className="mt-2">
                  {!selectedRoomId ? (
                    <div className="spms-muted small py-2">No room selected.</div>
                  ) : loadingLabs ? (
                    <div className="spms-muted small py-2">Loading labs...</div>
                  ) : labs.length === 0 ? (
                    <div className="spms-muted small py-2">No labs yet for this room.</div>
                  ) : (
                    <div className="list-group">
                      {labs.map((l) => (
                        <button key={l.lab_id} type="button" className={`list-group-item list-group-item-action ${selectedLabId === l.lab_id ? 'active' : ''}`} onClick={() => setSelectedLabId(l.lab_id)}>
                          <div className="fw-semibold">{l.name}</div>
                          <div className={`small ${selectedLabId === l.lab_id ? 'text-white-50' : 'text-muted'}`}>Faculty: {facultyLabel(l.faculty_user_id)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(3)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Rooms
                  </button>
                  <button type="button" className="btn btn-primary rounded-4 px-4" onClick={() => goToStep(5)} disabled={!canGoFaculty}>
                    Continue to Faculty <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="col-12">
            <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
              <div className="card-body">
                <h6 className="fw-semibold mb-1">Faculty Assignment</h6>
                <div className="spms-muted small mb-3">
                  {selectedLab ? (
                    <>
                      Selected lab: <span className="fw-semibold">{selectedLab.name}</span> (
                      <span className="fw-semibold">{selectedRoom?.name ?? 'No room'}</span>)
                    </>
                  ) : (
                    'Select a lab first.'
                  )}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary rounded-4 px-4"
                    disabled={!selectedLab}
                    onClick={() => setAssignFacultyModalOpen(true)}
                  >
                    Assign Faculty 
                  </button>
                  <div className="spms-muted small align-self-center">
                    {loadingFaculty ? 'Loading faculty list...' : `Faculty available: ${faculty.length}`}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="fw-semibold mb-2">Details</div>
                  <div className="small">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Room</span>
                      <span className="fw-semibold">{selectedRoom?.name ?? '—'}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Lab created</span>
                      <span className="fw-semibold">{fmtDate(selectedLab?.created_at ?? null)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Lab updated</span>
                      <span className="fw-semibold">{fmtDate(selectedLab?.updated_at ?? null)}</span>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-start mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(4)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Lab
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="col-12">
            <div className="alert alert-danger py-2 mb-0">
              <i className="bi bi-exclamation-circle me-2" />
              {error}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

