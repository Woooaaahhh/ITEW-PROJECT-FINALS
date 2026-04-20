import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type RoomRow = {
  room_id: number
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

export function SchedulingPage() {
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [labs, setLabs] = useState<LabRow[]>([])
  const [faculty, setFaculty] = useState<FacultyRow[]>([])

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)

  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingLabs, setLoadingLabs] = useState(false)
  const [loadingFaculty, setLoadingFaculty] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.room_id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )
  const selectedLab = useMemo(
    () => labs.find((l) => l.lab_id === selectedLabId) ?? null,
    [labs, selectedLabId],
  )

  const [newRoom, setNewRoom] = useState({ name: '', building: '', capacity: '' })
  const [newLabName, setNewLabName] = useState('')

  const [editRoomModal, setEditRoomModal] = useState<RoomRow | null>(null)
  const [editRoom, setEditRoom] = useState({ name: '', building: '', capacity: '' })

  const [editLabModal, setEditLabModal] = useState<LabRow | null>(null)
  const [editLabName, setEditLabName] = useState('')

  const [assignFacultyId, setAssignFacultyId] = useState<string>('')

  const fetchRooms = async () => {
    setLoadingRooms(true)
    setError(null)
    try {
      const res = await axios.get<{ rooms: RoomRow[] }>('/api/scheduling/rooms')
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
    void fetchRooms()
    void fetchFaculty()
  }, [])

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
      await axios.post('/api/scheduling/rooms', {
        name,
        building: building || null,
        capacity,
      })
      setNewRoom({ name: '', building: '', capacity: '' })
      await fetchRooms()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create room.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditRoom = (r: RoomRow) => {
    setError(null)
    setEditRoomModal(r)
    setEditRoom({
      name: r.name ?? '',
      building: r.building ?? '',
      capacity: r.capacity == null ? '' : String(r.capacity),
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

  const deleteRoom = async (r: RoomRow) => {
    setError(null)
    const ok = window.confirm(`Delete room "${r.name}"?\n\nThis will also delete labs under it.`)
    if (!ok) return
    setSubmitting(true)
    try {
      await axios.delete(`/api/scheduling/rooms/${r.room_id}`)
      if (selectedRoomId === r.room_id) {
        setSelectedRoomId(null)
        setSelectedLabId(null)
        setLabs([])
      }
      await fetchRooms()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to delete room.')
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
      await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create lab.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditLab = (l: LabRow) => {
    setError(null)
    setEditLabModal(l)
    setEditLabName(l.name ?? '')
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

  const deleteLab = async (l: LabRow) => {
    setError(null)
    const ok = window.confirm(`Delete lab "${l.name}"?`)
    if (!ok) return
    setSubmitting(true)
    try {
      await axios.delete(`/api/scheduling/labs/${l.lab_id}`)
      if (selectedLabId === l.lab_id) setSelectedLabId(null)
      if (selectedRoomId) await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to delete lab.')
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
      if (selectedRoomId) await fetchLabs(selectedRoomId)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to assign faculty.')
    } finally {
      setSubmitting(false)
    }
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

      <div className="row g-4">
        <div className="col-12 col-xl-4">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-3">Rooms</h6>
              <form onSubmit={createRoom} className="d-flex flex-column gap-2">
                <div>
                  <label className="form-label small fw-semibold">Room Name</label>
                  <input className="form-control" value={newRoom.name} onChange={(e) => setNewRoom((p) => ({ ...p, name: e.target.value }))} disabled={submitting} placeholder="e.g. Room 301" />
                </div>
                <div className="row g-2">
                  <div className="col-7">
                    <label className="form-label small fw-semibold">Building</label>
                    <input className="form-control" value={newRoom.building} onChange={(e) => setNewRoom((p) => ({ ...p, building: e.target.value }))} disabled={submitting} placeholder="optional" />
                  </div>
                  <div className="col-5">
                    <label className="form-label small fw-semibold">Capacity</label>
                    <input className="form-control" inputMode="numeric" value={newRoom.capacity} onChange={(e) => setNewRoom((p) => ({ ...p, capacity: e.target.value }))} disabled={submitting} placeholder="optional" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary rounded-4 py-2 fw-semibold mt-2" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Create Room'}
                </button>
              </form>

              <div className="d-flex align-items-center justify-content-between mt-4">
                <div className="fw-semibold">Room List</div>
                <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchRooms()} disabled={loadingRooms}>
                  <i className="bi bi-arrow-clockwise me-1" />
                  Refresh
                </button>
              </div>

              <div className="mt-2">
                {loadingRooms ? (
                  <div className="spms-muted small py-2">Loading rooms...</div>
                ) : rooms.length === 0 ? (
                  <div className="spms-muted small py-2">No rooms yet.</div>
                ) : (
                  <div className="list-group">
                    {rooms.map((r) => (
                      <button
                        type="button"
                        key={r.room_id}
                        className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedRoomId === r.room_id ? 'active' : ''}`}
                        onClick={() => setSelectedRoomId(r.room_id)}
                        disabled={submitting}
                      >
                        <div className="me-2 text-start">
                          <div className="fw-semibold">{r.name}</div>
                          <div className={`small ${selectedRoomId === r.room_id ? 'text-white-50' : 'text-muted'}`}>
                            {r.building ? `${r.building} • ` : ''}
                            {r.capacity != null ? `Cap ${r.capacity}` : 'No capacity set'}
                          </div>
                        </div>
                        <div className="btn-group btn-group-sm">
                          <button type="button" className={`btn ${selectedRoomId === r.room_id ? 'btn-light' : 'btn-outline-secondary'} rounded-3`} onClick={(e) => { e.stopPropagation(); openEditRoom(r) }} disabled={submitting}>
                            Edit
                          </button>
                          <button type="button" className={`btn ${selectedRoomId === r.room_id ? 'btn-outline-light' : 'btn-outline-danger'} rounded-3`} onClick={(e) => { e.stopPropagation(); void deleteRoom(r) }} disabled={submitting}>
                            Delete
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-1">Labs</h6>
              <div className="spms-muted small mb-3">
                {selectedRoom ? (
                  <>Selected room: <span className="fw-semibold">{selectedRoom.name}</span></>
                ) : (
                  'Select a room to manage its labs.'
                )}
              </div>

              <form onSubmit={createLab} className="d-flex flex-column gap-2">
                <div>
                  <label className="form-label small fw-semibold">New Lab Name</label>
                  <input className="form-control" value={newLabName} onChange={(e) => setNewLabName(e.target.value)} disabled={submitting || !selectedRoomId} placeholder="e.g. Computer Lab 1" />
                </div>
                <button type="submit" className="btn btn-primary rounded-4 py-2 fw-semibold" disabled={submitting || !selectedRoomId}>
                  {submitting ? 'Saving...' : 'Add Lab'}
                </button>
              </form>

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
                      <button
                        type="button"
                        key={l.lab_id}
                        className={`list-group-item list-group-item-action d-flex align-items-start justify-content-between ${selectedLabId === l.lab_id ? 'active' : ''}`}
                        onClick={() => setSelectedLabId(l.lab_id)}
                        disabled={submitting}
                      >
                        <div className="me-2 text-start">
                          <div className="fw-semibold">{l.name}</div>
                          <div className={`small ${selectedLabId === l.lab_id ? 'text-white-50' : 'text-muted'}`}>
                            Faculty: {l.faculty_user_id ? `#${l.faculty_user_id}` : 'Unassigned'}
                          </div>
                        </div>
                        <div className="btn-group btn-group-sm">
                          <button type="button" className={`btn ${selectedLabId === l.lab_id ? 'btn-light' : 'btn-outline-secondary'} rounded-3`} onClick={(e) => { e.stopPropagation(); openEditLab(l) }} disabled={submitting}>
                            Edit
                          </button>
                          <button type="button" className={`btn ${selectedLabId === l.lab_id ? 'btn-outline-light' : 'btn-outline-danger'} rounded-3`} onClick={(e) => { e.stopPropagation(); void deleteLab(l) }} disabled={submitting}>
                            Delete
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-1">Faculty Assignment</h6>
              <div className="spms-muted small mb-3">
                {selectedLab ? (
                  <>Selected lab: <span className="fw-semibold">{selectedLab.name}</span></>
                ) : (
                  'Select a lab to assign a faculty.'
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Faculty</label>
                <select
                  className="form-select"
                  value={assignFacultyId}
                  onChange={(e) => setAssignFacultyId(e.target.value)}
                  disabled={!selectedLab || submitting || loadingFaculty}
                >
                  <option value="">Unassigned</option>
                  {faculty.map((f) => (
                    <option key={f.user_id} value={String(f.user_id)}>
                      {f.username} ({f.faculty_type ?? 'Faculty'})
                    </option>
                  ))}
                </select>
                <div className="spms-muted small mt-2">
                  {loadingFaculty ? 'Loading faculty list...' : `Faculty available: ${faculty.length}`}
                </div>
              </div>

              <button type="button" className="btn btn-primary rounded-4 py-2 fw-semibold w-100" disabled={!selectedLab || submitting} onClick={() => void saveFacultyAssignment()}>
                {submitting ? 'Saving...' : 'Save Assignment'}
              </button>

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

              {error && (
                <div className="alert alert-danger py-2 mt-3 mb-0">
                  <i className="bi bi-exclamation-circle me-2" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

