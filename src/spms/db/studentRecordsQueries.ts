import { readAll, type StudentRecords } from './studentRecordsStorage'

/** Full in-memory snapshot (single localStorage read). */
export function snapshotAllStudentRecords(): Record<string, StudentRecords> {
  return readAll()
}

/** Map student id → counts for list views (registrar / faculty). */
export function getBehaviorCountIndex(): Record<string, { violations: number; achievements: number }> {
  const all = readAll()
  const index: Record<string, { violations: number; achievements: number }> = {}
  for (const [studentId, rec] of Object.entries(all)) {
    index[studentId] = {
      violations: rec.violations.length,
      achievements: rec.achievements.length,
    }
  }
  return index
}
