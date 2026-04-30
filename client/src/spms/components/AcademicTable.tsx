export type AcademicRow = {
  schoolYear: string
  semester: string
  gwa: string
  honors?: string
}

type AcademicTableProps = {
  rows: AcademicRow[]
  loading?: boolean
}

export function AcademicTable({ rows, loading }: AcademicTableProps) {
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
        <h6 className="fw-semibold mb-0">Academic Progress</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 spms-table">
            <thead>
              <tr className="spms-muted small">
                <th className="ps-4 py-3 fw-semibold">School Year</th>
                <th className="py-3 fw-semibold">Semester</th>
                <th className="py-3 fw-semibold">GWA</th>
                <th className="pe-4 py-3 fw-semibold">Honors</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ps-4 py-4 spms-muted text-center">
                    No academic records yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i}>
                    <td className="ps-4 py-3">{r.schoolYear}</td>
                    <td className="py-3">{r.semester}</td>
                    <td className="py-3 fw-semibold">{r.gwa}</td>
                    <td className="pe-4 py-3">{r.honors ?? '—'}</td>
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
