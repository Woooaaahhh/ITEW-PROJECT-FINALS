import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSport, deleteSport, listSports, seedSportsIfEmpty, updateSport } from '../db/sports'
import type { Sport } from '../db/spmsDb'

function normalize(s: string) {
  return s.toLowerCase().trim()
}

export function FacultySportsPage() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      await seedSportsIfEmpty()
      const all = await listSports()
      setSports(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sports list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = normalize(search)
    if (!q) return sports
    return sports.filter((s) => normalize(s.name).includes(q))
  }, [sports, search])

  const activeCount = useMemo(() => sports.filter((s) => s.isActive).length, [sports])

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h5 className="fw-bold mb-1">Sports List</h5>
              <div className="spms-muted small mb-0">
                Manage the official sports list used for try-out eligibility.
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link to="/students" className="btn btn-outline-primary rounded-4">
                <i className="bi bi-people me-1" /> View Students
              </Link>
              <Link to="/faculty" className="btn btn-outline-secondary rounded-4">
                Back to Dashboard
              </Link>
            </div>
          </div>

          <hr className="my-3" />

          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-6">
              <label className="form-label fw-semibold">Add sport</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-plus-circle" /></span>
                <input
                  className="form-control"
                  placeholder="e.g., Basketball"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || !newName.trim()}
                  onClick={async () => {
                    setSaving(true)
                    setError(null)
                    try {
                      await createSport({ name: newName })
                      setNewName('')
                      await refresh()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to add sport')
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label fw-semibold">Search</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  className="form-control"
                  placeholder="Search sports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          ) : null}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <span className="spms-chip">
              <i className="bi bi-check2-circle" /> {activeCount} active
            </span>
            <span className="spms-chip">
              <i className="bi bi-list-ul" /> {sports.length} total
            </span>
          </div>
        </div>
      </div>

      <div className="spms-card card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="fw-bold">
            <i className="bi bi-dribbble me-2" /> Sports
          </div>
          <span className="spms-chip"><i className="bi bi-filter" /> {filtered.length} shown</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table spms-table table-hover align-middle mb-0">
              <thead className="border-bottom">
                <tr>
                  <th className="ps-3">Sport</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="ps-3 py-4" colSpan={3}>
                      <div className="spms-muted">Loading sports...</div>
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className="ps-3 py-4" colSpan={3}>
                      <div className="spms-muted">No sports matched your search.</div>
                    </td>
                  </tr>
                ) : null}
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-3">
                      <input
                        className="form-control form-control-sm"
                        defaultValue={s.name}
                        onBlur={async (e) => {
                          const next = e.currentTarget.value.trim()
                          if (!next || next === s.name) return
                          setError(null)
                          try {
                            await updateSport(s.id, { name: next })
                            await refresh()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to rename sport')
                            e.currentTarget.value = s.name
                          }
                        }}
                      />
                    </td>
                    <td>
                      {s.isActive ? (
                        <span className="badge text-bg-success">Active</span>
                      ) : (
                        <span className="badge text-bg-secondary">Inactive</span>
                      )}
                    </td>
                    <td className="text-end pe-3">
                      <div className="d-inline-flex gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                          onClick={async () => {
                            setError(null)
                            try {
                              await updateSport(s.id, { isActive: !s.isActive })
                              await refresh()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to update sport')
                            }
                          }}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={async () => {
                            const ok = window.confirm(`Delete "${s.name}"? This will not remove it from existing student records.`)
                            if (!ok) return
                            setError(null)
                            try {
                              await deleteSport(s.id)
                              await refresh()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to delete sport')
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

