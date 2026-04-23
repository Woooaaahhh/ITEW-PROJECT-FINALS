import { useEffect, useState } from 'react'
import axios from 'axios'

type FacultyInfo = {
  user_id: number
  username: string
  email: string
  faculty_type?: string | null
}

type ScheduleItem = {
  course?: { code?: string; title?: string } | null
  section?: { section_id?: number; name?: string } | null
  room?: { room_id?: number; name?: string; building?: string | null } | null
  lab?: { lab_id?: number; name?: string; faculty_name?: string | null } | null
}

export function FacultySchedulePage() {
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null)
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ faculty: FacultyInfo; schedules: ScheduleItem[] }>('/api/scheduling/faculty-view')
      setFaculty(res.data.faculty ?? null)
      setSchedules(res.data.schedules ?? [])
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load faculty schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const groupedBySection = schedules.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const sectionName = item.section?.name?.trim() || 'No Section'
    if (!acc[sectionName]) acc[sectionName] = []
    acc[sectionName].push(item)
    return acc
  }, {})

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,.06)' }}>
          <div className="card-body d-flex align-items-center justify-content-between">
            <div>
              <h6 className="fw-semibold mb-1">My Assigned Schedule</h6>
              <div className="spms-muted small">
                {faculty ? `${faculty.username} (${faculty.faculty_type ?? 'Faculty'})` : 'Faculty schedule'}
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void load()} disabled={loading}>
              <i className="bi bi-arrow-clockwise me-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,.06)' }}>
          <div className="card-body">
            {loading ? (
              <div className="spms-muted">Loading schedule...</div>
            ) : error ? (
              <div className="alert alert-danger py-2 mb-0">{error}</div>
            ) : schedules.length === 0 ? (
              <div className="spms-muted">No assigned schedule yet.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {Object.entries(groupedBySection).map(([sectionName, items]) => (
                  <div key={sectionName} className="border rounded-3 p-3" style={{ borderColor: 'rgba(15,23,42,.1)' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-semibold">{sectionName}</div>
                      <span className="badge text-bg-light border">{items.length} assignment{items.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr className="small text-muted">
                            <th>Course</th>
                            <th>Room</th>
                            <th>Lab</th>
                            <th>Faculty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={`${sectionName}-${item.lab?.lab_id ?? 'lab'}-${item.room?.room_id ?? 'room'}-${idx}`}>
                              <td>{item.course ? `${item.course.code ?? ''} - ${item.course.title ?? ''}` : '—'}</td>
                              <td>
                                {item.room
                                  ? `${item.room.name ?? ''}${item.room.building ? ` (${item.room.building})` : ''}`
                                  : '—'}
                              </td>
                              <td>{item.lab?.name ?? '—'}</td>
                              <td>{item.lab?.faculty_name ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

