export function SectionsPage() {
  // replaced with real section management UI
  return (
    <SectionsManager />
  )
}

import { useEffect, useMemo, useState } from 'react'
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

  const [yearLevel, setYearLevel] = useState<'1st' | '2nd' | '3rd' | '4th'>('1st')
  const [section, setSection] = useState('')

  const grouped = useMemo(() => {
    const m = new Map<string, SectionRow[]>()
    for (const s of sections) {
      const key = s.year_level
      const arr = m.get(key) ?? []
      arr.push(s)
      m.set(key, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sections])

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

  return (
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
                      <th className="pe-4 py-3 fw-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="ps-4 py-4 spms-muted text-center">
                          No sections yet.
                        </td>
                      </tr>
                    ) : (
                      grouped.flatMap(([y, rows]) =>
                        rows.map((s, idx) => (
                          <tr key={s.section_id}>
                            <td className="ps-4 py-3">{idx === 0 ? <span className="fw-semibold">{y}</span> : <span className="spms-muted">—</span>}</td>
                            <td className="py-3 fw-semibold">{s.section}</td>
                            <td className="pe-4 py-3 spms-muted small">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</td>
                          </tr>
                        )),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
