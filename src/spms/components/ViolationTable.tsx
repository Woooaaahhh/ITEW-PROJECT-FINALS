export type ViolationRow = {
  id?: string
  violationType: string
  description: string
  dateRecorded: string
  status: string
}

type ViolationTableProps = {
  rows: ViolationRow[]
  loading?: boolean
}

export function ViolationTable({ rows, loading }: ViolationTableProps) {
  if (loading) {
    return (
      <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
        <div className="card-body">
          <div className="spms-muted small">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="spms-card card border-0 overflow-hidden"
      style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
    >
      <div className="card-header bg-transparent border-bottom px-4 py-3">
        <h6 className="fw-semibold mb-0">Violations</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 spms-table">
            <thead>
              <tr className="spms-muted small">
                <th className="ps-4 py-3 fw-semibold">Violation Type</th>
                <th className="py-3 fw-semibold">Description</th>
                <th className="py-3 fw-semibold">Date Recorded</th>
                <th className="pe-4 py-3 fw-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                    No violations recorded.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id ?? `${r.violationType}-${r.dateRecorded}-${i}`}>
                    <td className="ps-4 py-3">{r.violationType}</td>
                    <td className="py-3">{r.description}</td>
                    <td className="py-3 spms-muted small">{r.dateRecorded}</td>
                    <td className="pe-4 py-3">
                      <span
                        className="badge rounded-pill"
                        style={{
                          background: r.status.toLowerCase() === 'resolved' ? 'rgba(34, 197, 94, .15)' : 'rgba(234, 179, 8, .15)',
                          color: r.status.toLowerCase() === 'resolved' ? '#15803d' : '#a16207',
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
