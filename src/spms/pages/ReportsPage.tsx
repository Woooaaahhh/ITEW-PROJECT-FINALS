import { useEffect, useMemo, useState } from 'react'
import avatarUrl from '../../assets/react.svg'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function exportTableToCsv(rows: Student[], filename: string) {
  const headers = ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Contact', 'Gender', 'Address']
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const rowToCsv = (s: Student) =>
    [s.id, fullName(s), s.yearLevel ?? '', s.section ?? '', s.email ?? '', s.contactNumber ?? '', s.gender ?? '', s.address ?? ''].map(escape).join(',')
  const csv = [headers.map(escape).join(','), ...rows.map(rowToCsv)].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSection, setFilterSection] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = normalize(search)
    const y = normalize(filterYear)
    const sec = normalize(filterSection)
    return students.filter((s) => {
      const hitSearch =
        !q ||
        fullName(s).toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      const hitYear = !y || normalize(s.yearLevel ?? '') === y
      const hitSection = !sec || normalize(s.section ?? '') === sec
      return hitSearch && hitYear && hitSection
    })
  }, [students, search, filterYear, filterSection])

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-4">
        <div className="spms-card card spms-no-print">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">
              <i className="bi bi-funnel me-2" /> Report Filters
            </div>
            <span className="spms-chip"><i className="bi bi-sliders" /> Criteria</span>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Search</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  className="form-control"
                  placeholder="Name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Year Level</label>
              <select
                className="form-select"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Section</label>
              <select
                className="form-select"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="">All</option>
                <option value="BSIT-2A">BSIT-2A</option>
                <option value="BSBA-1B">BSBA-1B</option>
                <option value="BSED-3C">BSED-3C</option>
                <option value="BSIT-4A">BSIT-4A</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-4 px-4"
                onClick={() => {
                  setSearch('')
                  setFilterYear('')
                  setFilterSection('')
                }}
              >
                Reset
              </button>
            </div>
            <hr className="my-3" />
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-outline-primary rounded-4"
                onClick={() => exportTableToCsv(filtered, `spms-report-${new Date().toISOString().slice(0, 10)}.csv`)}
              >
                <i className="bi bi-filetype-csv me-1" /> Export CSV
              </button>
              <button type="button" className="btn btn-primary rounded-4" onClick={() => window.print()}>
                <i className="bi bi-printer me-1" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="spms-card card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">
              <i className="bi bi-table me-2" /> Report Results
            </div>
            <span className="spms-chip">
              <i className="bi bi-check2-square" /> {filtered.length} matched
            </span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table spms-table table-hover align-middle mb-0">
                <thead className="border-bottom">
                  <tr>
                    <th className="ps-3">Student</th>
                    <th>Year</th>
                    <th>Section</th>
                    <th>Email</th>
                    <th className="text-end pe-3">GWA</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={5}>
                        <div className="spms-muted">Loading...</div>
                      </td>
                    </tr>
                  ) : null}
                  {!loading && filtered.length === 0 ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={5}>
                        <div className="spms-muted">No students matched your filters.</div>
                      </td>
                    </tr>
                  ) : null}
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <img className="spms-avatar" src={s.profilePictureDataUrl || avatarUrl} alt="" />
                          <div>
                            <div className="fw-semibold">{fullName(s)}</div>
                            <div className="spms-muted small">{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.yearLevel ?? '—'}</td>
                      <td>{s.section ?? '—'}</td>
                      <td>{s.email ?? '—'}</td>
                      <td className="text-end pe-3">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
