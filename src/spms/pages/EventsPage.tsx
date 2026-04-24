/** Client-side routing: this screen is a React Router <Route> target; shown without a full page reload. */
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../auth/AuthContext'

type EventRow = {
  event_id: number
  title: string
  subtitle?: string | null
  category: 'curricular' | 'extra-curricular'
  location: string
  start_date: string
  end_date: string
  description: string
  image_url?: string | null
  created_at?: string
}

export function EventsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState<null | EventRow>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [category, setCategory] = useState<'curricular' | 'extra-curricular'>('curricular')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ events: EventRow[] }>('/api/events')
      setEvents(res.data.events)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEvents()
  }, [])

  const resetForm = () => {
    setTitle('')
    setSubtitle('')
    setCategory('curricular')
    setLocation('')
    setStartDate('')
    setEndDate('')
    setDescription('')
    setImageUrl('')
    setShowCreateModal(false)
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !location.trim() || !startDate || !endDate || !description.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      setError('End date must be after start date.')
      return
    }

    setSubmitting(true)
    try {
      await axios.post('/api/events', {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        category,
        location: location.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
      })
      resetForm()
      await fetchEvents()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create event.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal) return

    setError(null)

    if (!title.trim() || !location.trim() || !startDate || !endDate || !description.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      setError('End date must be after start date.')
      return
    }

    setSubmitting(true)
    try {
      await axios.put(`/api/events/${editModal.event_id}`, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        category,
        location: location.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim(),
        image_url: imageUrl.trim() || undefined,
      })
      setEditModal(null)
      resetForm()
      await fetchEvents()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update event.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteEvent = async (event: EventRow) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) return

    try {
      await axios.delete(`/api/events/${event.event_id}`)
      await fetchEvents()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to delete event.')
    }
  }

  const openEditModal = (event: EventRow) => {
    setEditModal(event)
    setTitle(event.title)
    setSubtitle(event.subtitle || '')
    setCategory(event.category)
    setLocation(event.location)
    setStartDate(new Date(event.start_date).toISOString().slice(0, 16))
    setEndDate(new Date(event.end_date).toISOString().slice(0, 16))
    setDescription(event.description)
    setImageUrl(event.image_url || '')
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">Events</h4>
              <p className="text-muted mb-0">View upcoming curricular and extra-curricular events</p>
            </div>
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Event
              </button>
            )}
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="row">
            {events.map((event) => (
              <div key={event.event_id} className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      className="card-img-top"
                      alt={event.title}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  )}
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span
                        className={`badge ${event.category === 'curricular' ? 'bg-primary' : 'bg-success'}`}
                      >
                        {event.category === 'curricular' ? 'Curricular' : 'Extra-curricular'}
                      </span>
                      {isAdmin && (
                        <div className="dropdown">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            type="button"
                            data-bs-toggle="dropdown"
                          >
                            <i className="bi bi-three-dots"></i>
                          </button>
                          <ul className="dropdown-menu">
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => openEditModal(event)}
                              >
                                <i className="bi bi-pencil me-2"></i>
                                Edit
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => deleteEvent(event)}
                              >
                                <i className="bi bi-trash me-2"></i>
                                Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                    <h5 className="card-title">{event.title}</h5>
                    {event.subtitle && (
                      <h6 className="card-subtitle mb-2 text-muted">{event.subtitle}</h6>
                    )}
                    <div className="mb-2">
                      <small className="text-muted">
                        <i className="bi bi-geo-alt me-1"></i>
                        {event.location}
                      </small>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">
                        <i className="bi bi-calendar-event me-1"></i>
                        {formatDateTime(event.start_date)} - {formatDateTime(event.end_date)}
                      </small>
                    </div>
                    <p className="card-text flex-grow-1">{event.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x display-1 text-muted mb-3"></i>
              <h5 className="text-muted">No events found</h5>
              <p className="text-muted">There are no upcoming events at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {isAdmin && showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Event</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={createEvent}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Subtitle</label>
                      <input
                        type="text"
                        className="form-control"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Optional tagline"
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as 'curricular' | 'extra-curricular')}
                        required
                      >
                        <option value="curricular">Curricular</option>
                        <option value="extra-curricular">Extra-curricular</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Location <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Start Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        End Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isAdmin && editModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Event</h5>
                <button type="button" className="btn-close" onClick={() => setEditModal(null)}></button>
              </div>
              <form onSubmit={updateEvent}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Subtitle</label>
                      <input
                        type="text"
                        className="form-control"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Optional tagline"
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as 'curricular' | 'extra-curricular')}
                        required
                      >
                        <option value="curricular">Curricular</option>
                        <option value="extra-curricular">Extra-curricular</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Location <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Start Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        End Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}