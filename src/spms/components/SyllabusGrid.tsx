import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createSyllabus, listSyllabi, type Syllabus } from '../db/instructionDb'

interface SyllabusCardProps {
  syllabus: Syllabus
  onView: (syllabus: Syllabus) => void
  onManage: (syllabus: Syllabus) => void
}

function SyllabusCard({ syllabus, onView, onManage }: SyllabusCardProps) {
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'faculty'

  return (
    <div className="spms-syllabus-card card border-0 h-100" style={{
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(15, 23, 42, .08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}>
      <div className="card-body d-flex flex-column p-4">
        <div className="flex-grow-1">
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div className="flex-grow-1">
              <h5 className="card-title fw-bold mb-2" style={{ 
                color: '#1e293b',
                fontSize: '1.1rem',
                lineHeight: '1.4'
              }}>
                {syllabus.title}
              </h5>
              {syllabus.courseCode && (
                <span className="badge bg-primary bg-opacity-10 text-primary mb-2" style={{
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {syllabus.courseCode}
                </span>
              )}
            </div>
            <div className="ms-2">
              <i className="bi bi-book text-primary" style={{ fontSize: '1.5rem' }} />
            </div>
          </div>
          
          {syllabus.description && (
            <p className="card-text text-muted small mb-3" style={{
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {syllabus.description}
            </p>
          )}
          
          <div className="d-flex align-items-center text-muted small mb-3">
            <i className="bi bi-clock me-1" />
            <span>Updated {new Date(syllabus.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="d-flex gap-2 mt-auto">
          <button
            className="btn btn-outline-primary btn-sm flex-grow-1 rounded-3"
            onClick={() => onView(syllabus)}
            style={{
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="bi bi-eye me-1" />
            View
          </button>
          {canManage && (
            <button
              className="btn btn-primary btn-sm flex-grow-1 rounded-3"
              onClick={() => onManage(syllabus)}
              style={{
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="bi bi-gear me-1" />
              Manage
            </button>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .spms-syllabus-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(15, 23, 42, .12);
        }
        
        .spms-syllabus-card:hover .btn-outline-primary {
          background-color: #0d9488;
          border-color: #0d9488;
          color: white;
        }
        
        .spms-syllabus-card:hover .btn-primary {
          background-color: #0f766e;
          border-color: #0f766e;
        }
      `}</style>
    </div>
  )
}

interface SyllabusGridProps {
  onViewSyllabus: (syllabus: Syllabus) => void
  onManageSyllabus: (syllabus: Syllabus) => void
}

export function SyllabusGrid({ onViewSyllabus, onManageSyllabus }: SyllabusGridProps) {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const canCreate = user?.role === 'admin' || user?.role === 'faculty'
  
  const [newSyllabus, setNewSyllabus] = useState({
    title: '',
    courseCode: '',
    description: ''
  })

  const loadSyllabi = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSyllabi()
      setSyllabi(data)
    } catch (err) {
      console.error('Failed to load syllabi:', err)
      setError('Failed to load syllabi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSyllabus.title.trim()) {
      setError('Syllabus title is required')
      return
    }
    
    setSubmitting(true)
    setError(null)
    try {
      await createSyllabus({
        title: newSyllabus.title.trim(),
        courseCode: newSyllabus.courseCode.trim() || undefined,
        description: newSyllabus.description.trim() || undefined
      })
      
      setNewSyllabus({ title: '', courseCode: '', description: '' })
      setShowCreateForm(false)
      await loadSyllabi()
    } catch (err) {
      console.error('Failed to create syllabus:', err)
      setError('Failed to create syllabus')
    } finally {
      setSubmitting(false)
    }
  }

  useState(() => {
    loadSyllabi()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading syllabi...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle me-2" />
        {error}
        <button className="btn btn-outline-danger btn-sm ms-2" onClick={loadSyllabi}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="syllabus-grid-container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1e293b' }}>
            Syllabus Library
          </h2>
          <p className="text-muted mb-0">
            Browse and manage course syllabi and curriculum materials
          </p>
        </div>
        {canCreate && (
          <button
            className="btn btn-primary rounded-3 px-4"
            onClick={() => setShowCreateForm(true)}
            style={{
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(13, 148, 136, .3)'
            }}
          >
            <i className="bi bi-plus-circle me-2" />
            Create Syllabus
          </button>
        )}
      </div>

      {/* Create Syllabus Modal */}
      {showCreateForm && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0" style={{ borderRadius: 16 }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Create New Syllabus</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateForm(false)}
                />
              </div>
              <form onSubmit={handleCreateSyllabus}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Syllabus Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter syllabus title"
                      value={newSyllabus.title}
                      onChange={(e) => setNewSyllabus({ ...newSyllabus, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., CS101, MATH201"
                      value={newSyllabus.courseCode}
                      onChange={(e) => setNewSyllabus({ ...newSyllabus, courseCode: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Brief description of the syllabus..."
                      value={newSyllabus.description}
                      onChange={(e) => setNewSyllabus({ ...newSyllabus, description: e.target.value })}
                    />
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2">
                      <i className="bi bi-exclamation-circle me-2" />
                      {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3"
                    onClick={() => setShowCreateForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Syllabus'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowCreateForm(false)} />
        </div>
      )}

      {/* Syllabus Grid */}
      {syllabi.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-4">
            <i className="bi bi-book text-muted" style={{ fontSize: '4rem' }} />
          </div>
          <h4 className="text-muted mb-2">No syllabi available</h4>
          <p className="text-muted mb-4">
            {canCreate ? 'Create your first syllabus to get started.' : 'Syllabi will appear here once they are created.'}
          </p>
          {canCreate && (
            <button
              className="btn btn-primary rounded-3 px-4"
              onClick={() => setShowCreateForm(true)}
            >
              <i className="bi bi-plus-circle me-2" />
              Create Your First Syllabus
            </button>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {syllabi.map((syllabus) => (
            <div key={syllabus.id} className="col-12 col-md-6 col-lg-4">
              <SyllabusCard
                syllabus={syllabus}
                onView={onViewSyllabus}
                onManage={onManageSyllabus}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .syllabus-grid-container {
          padding: 2rem 0;
        }
        
        @media (max-width: 768px) {
          .syllabus-grid-container {
            padding: 1rem 0;
          }
        }
      `}</style>
    </div>
  )
}
