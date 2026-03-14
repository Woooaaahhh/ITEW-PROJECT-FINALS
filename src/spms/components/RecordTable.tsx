export type RecordRow = {
  recordType: string
  description: string
  date: string
}

type RecordTableProps = {
  title: string
  rows: RecordRow[]
  emptyMessage?: string
}

export function RecordTable({ title, rows, emptyMessage = 'No records yet.' }: RecordTableProps) {
  return (
    <div
      className="spms-card card border-0 overflow-hidden"
      style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}
    >
      <div className="card-header bg-transparent border-bottom px-4 py-3">
        <h6 className="fw-semibold mb-0">{title}</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 spms-table">
            <thead>
              <tr className="spms-muted small">
                <th className="ps-4 py-3 fw-semibold">Record Type</th>
                <th className="py-3 fw-semibold">Description</th>
                <th className="pe-4 py-3 fw-semibold text-end">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="ps-4 py-4 spms-muted text-center">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i}>
                    <td className="ps-4 py-3">{r.recordType}</td>
                    <td className="py-3">{r.description}</td>
                    <td className="pe-4 py-3 text-end spms-muted small">{r.date}</td>
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
