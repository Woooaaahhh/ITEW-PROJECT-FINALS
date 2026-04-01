export function formatStudentRecordDate(isoOrYmd: string) {
  const d = new Date(isoOrYmd)
  return Number.isNaN(d.getTime()) ? isoOrYmd : d.toLocaleDateString()
}
