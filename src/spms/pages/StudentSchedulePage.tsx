import { useEffect, useState } from 'react'
import axios from 'axios'

type StudentInfo = {
  student_id: number
  first_name: string
  last_name: string
  section?: string | null
}

type LabView = {
  lab_id: number
  name: string
  faculty_name?: string | null
}

type RoomView = {
  room_id: number
  name: string
  building?: string | null
  capacity?: number | null
  labs: LabView[]
}

type SectionSchedule = {
  section_id: number
  section_name: string
  course?: { code?: string; title?: string } | null
  rooms: RoomView[]
}

export function StudentSchedulePage() {
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [schedules, setSchedules] = useState<SectionSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ student: StudentInfo; schedules: SectionSchedule[] }>('/api/scheduling/student-view')
      setStudent(res.data.student ?? null)
      setSchedules(res.data.schedules ?? [])
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,.06)' }}>
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-semibold mb-1">My Schedule</h6>
                <div className="spms-muted small">
                  {student
                    ? `${student.first_name} ${student.last_name} • ${student.section ?? 'No section'}`
                    : 'Schedule overview'}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void load()} disabled={loading}>
                <i className="bi bi-arrow-clockwise me-1" />
                Refresh
              </button>
            </div>
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
              <div className="spms-muted">No schedule found for your section yet.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {schedules.map((row) => (
                  <div key={row.section_id} className="border rounded-3 p-3" style={{ borderColor: 'rgba(15,23,42,.1)' }}>
                    <div className="fw-semibold">
                      {row.course?.code ?? 'Course'} - {row.course?.title ?? 'Untitled'}
                    </div>
                    <div className="spms-muted small mb-2">Section: {row.section_name}</div>
                    {row.rooms.length === 0 ? (
                      <div className="spms-muted small">No rooms yet.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                          <thead>
                            <tr className="small text-muted">
                              <th>Room</th>
                              <th>Labs</th>
                              <th>Faculty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.rooms.map((room) => (
                              <tr key={room.room_id}>
                                <td>{room.name}</td>
                                <td>
                                  {room.labs.length === 0
                                    ? 'No labs'
                                    : room.labs.map((l) => l.name).join(', ')}
                                </td>
                                <td>
                                  {room.labs.length === 0
                                    ? '—'
                                    : room.labs.map((l) => l.faculty_name ?? 'Unassigned').join(', ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

