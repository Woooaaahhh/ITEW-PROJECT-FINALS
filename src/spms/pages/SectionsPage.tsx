/** Client-side routing: this screen is a React Router <Route> target; shown without a full page reload. */
export function SectionsPage() {
  // replaced with real section management UI
  return (
    <SectionsManager />
  )
}

import { useEffect, useState } from 'react'
import axios from 'axios'

type SectionRow = {
  section_id: number
  year_level: string
  section: string
  created_at?: string | null
}

function SectionsManager() {
  const [sections, setSections] = useState<SectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState<null | SectionRow>(null)
  const [editYearLevel, setEditYearLevel] = useState<'1st' | '2nd' | '3rd' | '4th'>('1st')
  const [editSection, setEditSection] = useState('')

  const [yearLevel, setYearLevel] = useState<'1st' | '2nd' | '3rd' | '4th'>('1st')
  const [section, setSection] = useState('')

  const fetchSections = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ sections: SectionRow[] }>('/api/sections')
      setSections(res.data.sections)
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load sections.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSections()
  }, [])

  const createSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const sec = section.trim()
    if (!sec) {
      setError('Please enter a section name (e.g. BSIT-2A).')
      return
    }

    setSubmitting(true)
    try {
      await axios.post('/api/sections', { year_level: yearLevel, section: sec })
      setSection('')
      await fetchSections()
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create section.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (s: SectionRow) => {
    setError(null)
    setEditModal(s)
    setEditYearLevel((s.year_level as typeof editYearLevel) ?? '1st')
    setEditSection(s.section)
  }

  const closeEdit = () => {
    setEditModal(null)
    setEditSection('')
    setError(null)
  }

  const saveEdit = async () => {
    if (!editModal) return
    setError(null)
    const sec = editSection.trim()
    if (!sec) {
      setError('Please enter a section name (e.g. BSIT-2A).')
      return
    }
    setSubmitting(true)
    try {
      await axios.put(`/api/sections/${editModal.section_id}`, { year_level: editYearLevel, section: sec })
      closeEdit()
      await fetchSections()
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update section.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteSection = async (s: SectionRow) => {
    setError(null)
    const ok = window.confirm(`Delete section "${s.section}" (${s.year_level})?\n\nThis will remove it from the Section list and from the Add Student dropdown.`)
    if (!ok) return
    setSubmitting(true)
    try {
      await axios.delete(`/api/sections/${s.section_id}`)
      await fetchSections()
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to delete section.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {editModal && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0" style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(2,6,23,.25)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Section</h5>
                  <button type="button" className="btn-close" onClick={closeEdit} aria-label="Close" />
                </div>
                <div className="modal-body pt-2">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Year Level</label>
                      <select className="form-select" value={editYearLevel} onChange={(e) => setEditYearLevel(e.target.value as typeof editYearLevel)} disabled={submitting}>
                        <option value="1st">1st</option>
                        <option value="2nd">2nd</option>
                        <option value="3rd">3rd</option>
                        <option value="4th">4th</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Section</label>
                      <input className="form-control" value={editSection} onChange={(e) => setEditSection(e.target.value)} disabled={submitting} />
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
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={closeEdit} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary rounded-3" onClick={() => void saveEdit()} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeEdit} />
        </>
      )}

      <div className="row g-4">
      <div className="col-12 col-xl-4">
        <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-body">
            <h6 className="fw-semibold mb-3">Create Section</h6>
            <form onSubmit={createSection} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Year Level</label>
                <select className="form-select" value={yearLevel} onChange={(e) => setYearLevel(e.target.value as typeof yearLevel)} disabled={submitting}>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                </select>
              </div>
              <div>
                <label className="form-label small fw-semibold">Section</label>
                <input className="form-control" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. BSIT-2A" disabled={submitting} />
              </div>

              {error && (
                <div className="alert alert-danger py-2 mb-0">
                  <i className="bi bi-exclamation-circle me-2" />
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary rounded-4 py-2 fw-semibold" disabled={submitting}>
                {submitting ? 'Saving...' : 'Create Section'}
              </button>
            </form>
            <div className="spms-muted small mt-3">
              Newly created sections will appear in <span className="fw-semibold">Add Student</span>.
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="spms-card card border-0 overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-header bg-transparent border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
            <h6 className="fw-semibold mb-0">Sections</h6>
            <button type="button" className="btn btn-sm btn-outline-secondary rounded-3" onClick={() => void fetchSections()} disabled={loading}>
              <i className="bi bi-arrow-clockwise me-1" />
              Refresh
            </button>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 spms-muted">Loading sections...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead>
                    <tr className="spms-muted small">
                      <th className="ps-4 py-3 fw-semibold">Year Level</th>
                      <th className="py-3 fw-semibold">Section</th>
                      <th className="py-3 fw-semibold">Created</th>
                      <th className="pe-4 py-3 fw-semibold text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                          No sections yet.
                        </td>
                      </tr>
                    ) : (
                      sections.map((s) => (
                        <tr key={s.section_id}>
                          <td className="ps-4 py-3 fw-semibold">{s.year_level}</td>
                          <td className="py-3 fw-semibold">{s.section}</td>
                          <td className="py-3 spms-muted small">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                          <td className="pe-4 py-3 text-end">
                            <div className="btn-group btn-group-sm">
                              <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => openEdit(s)} disabled={submitting}>
                                Edit
                              </button>
                              <button type="button" className="btn btn-outline-danger rounded-3" onClick={() => void deleteSection(s)} disabled={submitting}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
