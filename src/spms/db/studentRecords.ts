/**
 * Aggregate API over violations + achievements (same storage document).
 * Prefer importing from `./violations` or `./achievements` when working in one domain.
 */
import type { StudentRecords } from './studentRecordsStorage'
import { getAchievements } from './achievements'
import { getViolations } from './violations'

export type { ViolationRecord, AchievementRecord, StudentRecords } from './studentRecordsStorage'

export { getViolations, addViolation } from './violations'
export { getAchievements, addAchievement } from './achievements'
export { ensureSeededForDemo } from './studentRecordsSeed'
export { snapshotAllStudentRecords, getBehaviorCountIndex } from './studentRecordsQueries'

export function getStudentRecords(studentId: string): StudentRecords {
  return {
    violations: getViolations(studentId),
    achievements: getAchievements(studentId),
  }
}
