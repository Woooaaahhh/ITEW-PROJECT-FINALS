import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type SectionRow = {
  section_id: number
  year_level: string
  section: string
  faculty_user_id?: number | null
  faculty_name?: string | null
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

type ScheduleStep = 1 | 2 | 3 | 4 | 5

function ModalShell({
  title,
  open,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!open) return null
  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''
  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className={`modal-dialog ${sizeClass} modal-dialog-centered`} role="document">
          <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body pt-2">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  )
}

function StepPill({
  active,
  disabled,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  title: string
  subtitle: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`spms-sched-step ${active ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="spms-sched-step__icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <span className="spms-sched-step__text">
        <span className="spms-sched-step__title">{title}</span>
        <span className="spms-sched-step__subtitle">{subtitle}</span>
      </span>
      <span className="spms-sched-step__chev" aria-hidden="true">
        <i className="bi bi-chevron-right" />
      </span>
    </button>
  )
}

export function SchedulingPage() {
  const [sections, setSections] = useState<SectionRow[]>([])
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [labs, setLabs] = useState<LabRow[]>([])
  const [faculty, setFaculty] = useState<FacultyRow[]>([])

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)

  const [loadingSections, setLoadingSections] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingLabs, setLoadingLabs] = useState(false)
  const [loadingFaculty, setLoadingFaculty] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  const [newRoom, setNewRoom] = useState({ name: '', building: '', capacity: '' })
  const [newLabName, setNewLabName] = useState('')

  const [editRoomModal, setEditRoomModal] = useState<RoomRow | null>(null)
  const [editRoom, setEditRoom] = useState({ name: '', building: '', capacity: '' })

  const [editLabModal, setEditLabModal] = useState<LabRow | null>(null)
  const [editLabName, setEditLabName] = useState('')

  const [assignFacultyId, setAssignFacultyId] = useState<string>('')
  const [step, setStep] = useState<ScheduleStep>(1)
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false)
  const [viewRoomsModalOpen, setViewRoomsModalOpen] = useState(false)
  const [createLabModalOpen, setCreateLabModalOpen] = useState(false)
  const [viewLabsModalOpen, setViewLabsModalOpen] = useState(false)
  const [assignFacultyModalOpen, setAssignFacultyModalOpen] = useState(false)
  const [completeSetupModalOpen, setCompleteSetupModalOpen] = useState(false)

  const [sectionQuery, setSectionQuery] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [labQuery, setLabQuery] = useState('')

  // Pagination for sections
  const [currentSectionPage, setCurrentSectionPage] = useState(1)
  const sectionsPerPage = 10

  const fetchSections = async () => {
    setLoadingSections(true)
    setError(null)
    try {
      const res = await axios.get<{ sections: SectionRow[] }>('/api/sections')
      const rows = res.data.sections ?? []
      setSections(rows)
      // Do NOT automatically select a section - preserve user's choice
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
      const url = `/api/scheduling/sections/${selectedSectionId}/rooms`
      const res = await axios.get<{ rooms: RoomRow[] }>(url)
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
    void fetchSections()
    void fetchFaculty()
  }, [])

  // Auto-select first section only on initial load if no section is selected
  useEffect(() => {
    if (sections.length > 0 && selectedSectionId === null) {
      setSelectedSectionId(sections[0].section_id)
    }
  }, [sections, selectedSectionId])

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
      const url = `/api/scheduling/sections/${selectedSectionId}/rooms`
      await axios.post(url, {
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

  const openEditRoom = (room: RoomRow) => {
    setEditRoomModal(room)
    setEditRoom({
      name: room.name ?? '',
      building: room.building ?? '',
      capacity: room.capacity == null ? '' : String(room.capacity),
    })
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

  const openEditLab = (lab: LabRow) => {
    setEditLabModal(lab)
    setEditLabName(lab.name ?? '')
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

  const canGoRooms = Boolean(selectedSectionId)
  const canGoLabs = Boolean(selectedSectionId && selectedRoomId)
  const canGoFaculty = Boolean(selectedSectionId && selectedRoomId && selectedLabId)

  const goToStep = (next: ScheduleStep) => {
    if (next === 2 && !canGoRooms) return
    if (next === 3 && !canGoLabs) return
    if (next === 4 && !canGoFaculty) return
    setStep(next)
  }

  const filteredSections = useMemo(() => {
    const q = sectionQuery.trim().toLowerCase()
    if (!q) return sections
    return sections.filter((s) => `${s.year_level} ${s.section} ${s.faculty_name ?? ''}`.toLowerCase().includes(q))
  }, [sections, sectionQuery])

  // Pagination calculations for sections
  const totalSectionPages = useMemo(() => Math.ceil(filteredSections.length / sectionsPerPage), [filteredSections.length, sectionsPerPage])
  
  const paginatedSections = useMemo(() => {
    const startIndex = (currentSectionPage - 1) * sectionsPerPage
    const endIndex = startIndex + sectionsPerPage
    return filteredSections.slice(startIndex, endIndex)
  }, [filteredSections, currentSectionPage, sectionsPerPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentSectionPage(1)
  }, [sectionQuery])

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter((r) => `${r.name} ${r.building ?? ''} ${r.capacity ?? ''}`.toLowerCase().includes(q))
  }, [rooms, roomQuery])

  const filteredLabs = useMemo(() => {
    const q = labQuery.trim().toLowerCase()
    if (!q) return labs
    return labs.filter((l) => `${l.name} ${facultyLabel(l.faculty_user_id)}`.toLowerCase().includes(q))
  }, [labs, labQuery, facultyById])

  return (
    <>
      <ModalShell title="Edit Room" open={Boolean(editRoomModal)} onClose={closeEditRoom}>
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
        <div className="modal-footer border-0 pt-3 px-0 pb-0">
          <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeEditRoom} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary rounded-3" onClick={() => void saveEditRoom()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </ModalShell>

      <ModalShell title="Edit Lab" open={Boolean(editLabModal)} onClose={closeEditLab}>
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
        <div className="modal-footer border-0 pt-3 px-0 pb-0">
          <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeEditLab} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary rounded-3" onClick={() => void saveEditLab()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </ModalShell>

      
      <ModalShell title="Create Room" open={createRoomModalOpen} onClose={() => setCreateRoomModalOpen(false)}>
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
          {error && (
            <div className="col-12">
              <div className="alert alert-danger py-2 mb-0">
                <i className="bi bi-exclamation-circle me-2" />
                {error}
              </div>
            </div>
          )}
          <div className="col-12 mt-3 d-flex justify-content-end">
            <button type="submit" className="btn btn-primary rounded-3" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Room'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell title="All Rooms" open={viewRoomsModalOpen} onClose={() => setViewRoomsModalOpen(false)} size="lg">
        {rooms.length === 0 ? (
          <div className="spms-muted small">No rooms yet.</div>
        ) : (
          <div className="list-group">
            {rooms.map((r) => (
              <button
                key={r.room_id}
                type="button"
                className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedRoomId === r.room_id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRoomId(r.room_id)
                  setViewRoomsModalOpen(false)
                }}
              >
                <div className="text-start">
                  <div className="fw-semibold">{r.name}</div>
                  <div className={`small ${selectedRoomId === r.room_id ? 'text-white-50' : 'text-muted'}`}>
                    {r.building ? `${r.building} • ` : ''}
                    {r.capacity != null ? `Cap ${r.capacity}` : 'No capacity set'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ModalShell>

      <ModalShell title="Create Lab" open={createLabModalOpen} onClose={() => setCreateLabModalOpen(false)}>
        <div className="spms-muted small mb-2">
          Room: <span className="fw-semibold">{selectedRoom?.name ?? 'No room selected'}</span>
        </div>
        <form onSubmit={createLab} className="row g-2">
          <div className="col-12">
            <label className="form-label small fw-semibold">Lab Name</label>
            <input className="form-control" value={newLabName} onChange={(e) => setNewLabName(e.target.value)} disabled={submitting || !selectedRoomId} placeholder="e.g. Computer Lab 1" />
          </div>
          {error && (
            <div className="col-12">
              <div className="alert alert-danger py-2 mb-0">
                <i className="bi bi-exclamation-circle me-2" />
                {error}
              </div>
            </div>
          )}
          <div className="col-12 mt-3 d-flex justify-content-end">
            <button type="submit" className="btn btn-primary rounded-3" disabled={submitting || !selectedRoomId}>
              {submitting ? 'Saving...' : 'Create Lab'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell title="All Labs" open={viewLabsModalOpen} onClose={() => setViewLabsModalOpen(false)} size="lg">
        {!selectedRoomId ? (
          <div className="spms-muted small">Select a room first.</div>
        ) : labs.length === 0 ? (
          <div className="spms-muted small">No labs yet for this room.</div>
        ) : (
          <div className="list-group">
            {labs.map((l) => (
              <button
                key={l.lab_id}
                type="button"
                className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedLabId === l.lab_id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLabId(l.lab_id)
                  setViewLabsModalOpen(false)
                }}
              >
                <div className="text-start">
                  <div className="fw-semibold">{l.name}</div>
                  <div className={`small ${selectedLabId === l.lab_id ? 'text-white-50' : 'text-muted'}`}>Faculty: {facultyLabel(l.faculty_user_id)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ModalShell>

      <ModalShell title="Assign Faculty" open={assignFacultyModalOpen} onClose={() => setAssignFacultyModalOpen(false)}>
        <div className="spms-muted small mb-2">
          Room: <span className="fw-semibold">{selectedRoom?.name ?? '—'}</span>
          <br />
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
        {error && (
          <div className="alert alert-danger py-2 mt-3 mb-0">
            <i className="bi bi-exclamation-circle me-2" />
            {error}
          </div>
        )}
        <div className="modal-footer border-0 pt-3 px-0 pb-0">
          <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setAssignFacultyModalOpen(false)} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary rounded-3" disabled={!selectedLab || submitting} onClick={() => void saveFacultyAssignment()}>
            {submitting ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </ModalShell>

      <div className="spms-sched-layout">
        <aside className="spms-sched-left">
          <div className="spms-card card border-0 spms-sched-left-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">Setup</div>
                <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => { void fetchSections(); void fetchFaculty(); }} disabled={loadingSections || loadingFaculty}>
                  <i className="bi bi-arrow-clockwise me-1" />
                  Refresh
                </button>
              </div>

              <div className="spms-sched-context mb-3">
                <div className="spms-sched-chip">
                  <span className="spms-sched-chip__k">Section</span>
                  <span className="spms-sched-chip__v">{selectedSection ? `${selectedSection.year_level} - ${selectedSection.section}` : '—'}</span>
                </div>
                <div className="spms-sched-chip">
                  <span className="spms-sched-chip__k">Room</span>
                  <span className="spms-sched-chip__v">{selectedRoom ? selectedRoom.name : '—'}</span>
                </div>
                <div className="spms-sched-chip">
                  <span className="spms-sched-chip__k">Lab</span>
                  <span className="spms-sched-chip__v">{selectedLab ? selectedLab.name : '—'}</span>
                </div>
              </div>

              <div className="spms-sched-steps">
                <StepPill
                  active={step === 1}
                  title="Section"
                  subtitle={selectedSection ? `${selectedSection.year_level} - ${selectedSection.section}` : 'Choose a section'}
                  icon="bi bi-diagram-3"
                  onClick={() => goToStep(1)}
                />
                <StepPill
                  active={step === 2}
                  disabled={!canGoRooms}
                  title="Room"
                  subtitle={selectedRoom ? selectedRoom.name : 'Pick a room'}
                  icon="bi bi-door-open"
                  onClick={() => goToStep(2)}
                />
                <StepPill
                  active={step === 3}
                  disabled={!canGoLabs}
                  title="Lab"
                  subtitle={selectedLab ? selectedLab.name : 'Pick a lab'}
                  icon="bi bi-pc-display"
                  onClick={() => goToStep(3)}
                />
                <StepPill
                  active={step === 4}
                  disabled={!canGoFaculty}
                  title="Faculty"
                  subtitle={selectedLab?.faculty_user_id ? facultyLabel(selectedLab.faculty_user_id) : 'Assign faculty'}
                  icon="bi bi-person-badge"
                  onClick={() => goToStep(4)}
                />
              </div>
            </div>
          </div>
        </aside>

        <section className="spms-sched-main">

        {step === 1 && (
          <div className="spms-card card border-0">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h6 className="fw-semibold mb-1">Choose a section</h6>
                    <div className="spms-muted small">This controls which rooms are available.</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchSections()} disabled={loadingSections}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input className="form-control" value={sectionQuery} onChange={(e) => setSectionQuery(e.target.value)} placeholder="Search sections..." />
                  </div>
                </div>

                <div className="mt-2">
                  {loadingSections ? (
                    <div className="spms-muted small py-2">Loading sections...</div>
                  ) : filteredSections.length === 0 ? (
                    <div className="spms-muted small py-2">No sections available. Please create sections in the Sections page first.</div>
                  ) : (
                    <>
                      <div className="list-group">
                        {paginatedSections.map((s) => (
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
                              <div className="fw-semibold">{s.year_level} - {s.section}</div>
                              <div className={`small ${selectedSectionId === s.section_id ? 'text-white-50' : 'text-muted'}`}>
                                {s.faculty_name ? `Faculty: ${s.faculty_name}` : 'No faculty assigned'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalSectionPages > 1 && (
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-3">
                          <div className="spms-muted small">
                            Showing {((currentSectionPage - 1) * sectionsPerPage) + 1} to {Math.min(currentSectionPage * sectionsPerPage, filteredSections.length)} of {filteredSections.length} sections
                          </div>
                          <div className="btn-group" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={currentSectionPage === 1}
                              onClick={() => setCurrentSectionPage(currentSectionPage - 1)}
                            >
                              <i className="bi bi-chevron-left" /> Previous
                            </button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalSectionPages) }, (_, i) => {
                              let pageNum
                              if (totalSectionPages <= 5) {
                                pageNum = i + 1
                              } else if (currentSectionPage <= 3) {
                                pageNum = i + 1
                              } else if (currentSectionPage >= totalSectionPages - 2) {
                                pageNum = totalSectionPages - 4 + i
                              } else {
                                pageNum = currentSectionPage - 2 + i
                              }
                              return (
                                <button
                                  key={pageNum}
                                  type="button"
                                  className={`btn btn-sm ${currentSectionPage === pageNum ? 'btn-primary' : 'btn-outline-primary'}`}
                                  onClick={() => setCurrentSectionPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                            
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={currentSectionPage === totalSectionPages}
                              onClick={() => setCurrentSectionPage(currentSectionPage + 1)}
                            >
                              Next <i className="bi bi-chevron-right" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn btn-primary rounded-4 px-4"
                    onClick={() => goToStep(2)}
                    disabled={!selectedSectionId}
                  >
                    Next: Rooms
                  </button>
                </div>
              </div>
          </div>
        )}

        {step === 2 && (
          <div className="spms-card card border-0">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h6 className="fw-semibold mb-1">Rooms</h6>
                    <div className="spms-muted small">
                      {selectedSection ? (
                        <>Section: <span className="fw-semibold">{selectedSection.year_level} - {selectedSection.section}</span></>
                      ) : (
                        'Select a section first.'
                      )}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    <button type="button" className="btn btn-sm btn-primary rounded-3" disabled={!selectedSectionId} onClick={() => setCreateRoomModalOpen(true)}>
                      <i className="bi bi-plus-lg me-1" />
                      Create
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-3" disabled={!selectedSectionId} onClick={() => setViewRoomsModalOpen(true)}>
                      <i className="bi bi-list-ul me-1" />
                      View all
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchRooms()} disabled={loadingRooms || !selectedSectionId}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input className="form-control" value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} placeholder="Search rooms..." disabled={!selectedSectionId} />
                  </div>
                </div>
                <div className="mt-2">
                  {!selectedSectionId ? (
                    <div className="spms-muted small py-2">No section selected.</div>
                  ) : loadingRooms ? (
                    <div className="spms-muted small py-2">Loading rooms...</div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="spms-muted small py-2">No rooms yet for this section.</div>
                  ) : (
                    <div className="list-group">
                      {filteredRooms.map((r) => (
                        <button key={r.room_id} type="button" className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedRoomId === r.room_id ? 'active' : ''}`} onClick={() => setSelectedRoomId(r.room_id)}>
                          <div className="me-2 text-start">
                            <div className="fw-semibold">{r.name}</div>
                            <div className={`small ${selectedRoomId === r.room_id ? 'text-white-50' : 'text-muted'}`}>{r.building ? `${r.building} • ` : ''}{r.capacity != null ? `Cap ${r.capacity}` : 'No capacity set'}</div>
                          </div>
                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              className={`btn btn-sm ${selectedRoomId === r.room_id ? 'btn-outline-light' : 'btn-outline-secondary'} rounded-3`}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditRoom(r) }}
                              disabled={submitting}
                              aria-label="Edit room"
                            >
                              <i className="bi bi-pencil" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(1)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Section
                  </button>
                  <button type="button" className="btn btn-primary rounded-4 px-4" onClick={() => goToStep(3)} disabled={!canGoLabs}>
                    Continue to Lab <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
          </div>
        )}

        {step === 3 && (
          <div className="spms-card card border-0">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h6 className="fw-semibold mb-1">Labs</h6>
                    <div className="spms-muted small">
                      {selectedRoom ? <>Room: <span className="fw-semibold">{selectedRoom.name}</span></> : 'Select a room first.'}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    <button type="button" className="btn btn-sm btn-primary rounded-3" disabled={!selectedRoomId} onClick={() => setCreateLabModalOpen(true)}>
                      <i className="bi bi-plus-lg me-1" />
                      Create
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-3" disabled={!selectedRoomId} onClick={() => setViewLabsModalOpen(true)}>
                      <i className="bi bi-list-ul me-1" />
                      View all
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => selectedRoomId && void fetchLabs(selectedRoomId)} disabled={loadingLabs || !selectedRoomId}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-search" />
                    </span>
                    <input className="form-control" value={labQuery} onChange={(e) => setLabQuery(e.target.value)} placeholder="Search labs or faculty..." disabled={!selectedRoomId} />
                  </div>
                </div>
                <div className="mt-2">
                  {!selectedRoomId ? (
                    <div className="spms-muted small py-2">No room selected.</div>
                  ) : loadingLabs ? (
                    <div className="spms-muted small py-2">Loading labs...</div>
                  ) : filteredLabs.length === 0 ? (
                    <div className="spms-muted small py-2">No labs yet for this room.</div>
                  ) : (
                    <div className="list-group">
                      {filteredLabs.map((l) => (
                        <button key={l.lab_id} type="button" className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedLabId === l.lab_id ? 'active' : ''}`} onClick={() => setSelectedLabId(l.lab_id)}>
                          <div className="me-2 text-start">
                            <div className="fw-semibold">{l.name}</div>
                            <div className={`small ${selectedLabId === l.lab_id ? 'text-white-50' : 'text-muted'}`}>Faculty: {facultyLabel(l.faculty_user_id)}</div>
                          </div>
                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              className={`btn btn-sm ${selectedLabId === l.lab_id ? 'btn-outline-light' : 'btn-outline-secondary'} rounded-3`}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditLab(l) }}
                              disabled={submitting}
                              aria-label="Edit lab"
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${selectedLabId === l.lab_id ? 'btn-outline-light' : 'btn-outline-primary'} rounded-3`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedLabId(l.lab_id)
                                setAssignFacultyModalOpen(true)
                              }}
                              disabled={submitting}
                              aria-label="Assign faculty"
                            >
                              <i className="bi bi-person-plus" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(2)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Rooms
                  </button>
                  <button type="button" className="btn btn-primary rounded-4 px-4" onClick={() => goToStep(4)} disabled={!canGoFaculty}>
                    Continue to Faculty <i className="bi bi-arrow-right ms-1" />
                  </button>
                </div>
              </div>
          </div>
        )}

        {step === 4 && (
          <div className="spms-card card border-0">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <h6 className="fw-semibold mb-1">Faculty assignment</h6>
                    <div className="spms-muted small">
                      {selectedLab ? (
                        <>
                          Room: <span className="fw-semibold">{selectedRoom?.name ?? '—'}</span> • Lab: <span className="fw-semibold">{selectedLab.name}</span>
                        </>
                      ) : (
                        'Select a lab first.'
                      )}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-primary rounded-3" disabled={!selectedLabId} onClick={() => setAssignFacultyModalOpen(true)}>
                      <i className="bi bi-person-plus me-1" />
                      Assign
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  {selectedLab?.faculty_user_id ? (
                    <div className="alert alert-info py-2 mb-0">
                      <i className="bi bi-person-check me-2" />
                      Assigned to: {facultyLabel(selectedLab.faculty_user_id)}
                    </div>
                  ) : (
                    <div className="alert alert-warning py-2 mb-0">
                      <i className="bi bi-person-dash me-2" />
                      No faculty assigned to this lab yet.
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-outline-secondary rounded-4 px-4" onClick={() => goToStep(3)}>
                    <i className="bi bi-arrow-left me-1" /> Back to Lab
                  </button>
                  <button type="button" className="btn btn-success rounded-4 px-4" disabled={!selectedLab} onClick={() => setCompleteSetupModalOpen(true)}>
                    <i className="bi bi-check-circle me-1" /> Complete Setup
                  </button>
                </div>
              </div>
          </div>
        )}

        {completeSetupModalOpen && (
          <>
            <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold">Setup Complete! 🎉</h5>
                    <button type="button" className="btn-close" onClick={() => setCompleteSetupModalOpen(false)} aria-label="Close" />
                  </div>
                  <div className="modal-body pt-2">
                    <div className="text-center mb-4">
                      <div className="display-1 mb-3">🎊</div>
                      <h6 className="fw-bold text-success mb-2">Scheduling Setup Successful!</h6>
                      <p className="text-muted">The scheduling setup has been completed successfully.</p>
                    </div>
                    
                    <div className="card bg-light border-0 rounded-3">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3">Setup Details</h6>
                        <div className="row g-2">
                          <div className="col-12">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Section:</span>
                              <span className="fw-semibold">{selectedSection?.year_level} - {selectedSection?.section}</span>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Room:</span>
                              <span className="fw-semibold">{selectedRoom?.name || '—'}</span>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Lab:</span>
                              <span className="fw-semibold">{selectedLab?.name || '—'}</span>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Faculty:</span>
                              <span className="fw-semibold">
                                {selectedLab?.faculty_user_id 
                                  ? facultyLabel(selectedLab.faculty_user_id)
                                  : 'Unassigned'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0 pt-0">
                    <div className="d-flex gap-2 w-100">
                      <button type="button" className="btn btn-outline-secondary rounded-3 flex-fill" onClick={() => setCompleteSetupModalOpen(false)}>
                        Close
                      </button>
                      <button type="button" className="btn btn-primary rounded-3 flex-fill" onClick={() => {
                      setCompleteSetupModalOpen(false)
                      // Reset to start for new setup
                      setStep(1)
                      setSelectedSectionId(null)
                      setSelectedRoomId(null)
                      setSelectedLabId(null)
                      setAssignFacultyId('')
                    }}>
                        Create New Setup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" onClick={() => setCompleteSetupModalOpen(false)} />
          </>
        )}

        {error && (
          <div className="alert alert-danger py-2 mb-0 mt-3">
            <i className="bi bi-exclamation-circle me-2" />
            {error}
          </div>
        )}
        </section>
      </div>
    </>
  )
}

