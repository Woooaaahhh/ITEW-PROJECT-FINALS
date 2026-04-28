import { readAll, writeAll, makeRecordId, nowIso } from './studentRecordsStorage'
import { isSeedDemoStudentId } from './demoSeedUtils'

const SEEDED_KEY = 'spms_student_records_seeded_v2'

export function ensureSeededForDemo(studentIds: string[]) {
  try {
    if (studentIds.length === 0) return
    const all = readAll()
    let changed = false

    for (const studentId of studentIds) {
      if (!isSeedDemoStudentId(studentId)) continue
      if (all[studentId]) continue
      const ts = nowIso()
      const indexSeed = studentId.length
      const violationTypes = ['Attendance', 'Uniform', 'Conduct', 'Lateness', 'Classroom Discipline']
      const achievementCategories = ['Programming', 'Sports', 'Academic', 'Leadership', 'Creative']
      all[studentId] = {
        violations: [
          {
            id: makeRecordId('vio'),
            studentId,
            violation_type: violationTypes[indexSeed % violationTypes.length],
            description: 'Dummy violation record generated for system capacity demonstration.',
            date: `2026-0${(indexSeed % 8) + 1}-${String((indexSeed % 20) + 5).padStart(2, '0')}`,
            status: indexSeed % 3 === 0 ? 'Resolved' : 'Pending',
            createdAt: ts,
          },
        ],
        achievements: [
          {
            id: makeRecordId('ach'),
            studentId,
            title: 'Seeded Student Achievement',
            description: 'Dummy achievement record generated for system capacity demonstration.',
            date: `2026-0${(indexSeed % 8) + 1}-${String((indexSeed % 20) + 3).padStart(2, '0')}`,
            category: achievementCategories[indexSeed % achievementCategories.length],
            createdAt: ts,
          },
        ],
      }
      changed = true
    }

    if (changed) writeAll(all)
    localStorage.setItem(SEEDED_KEY, 'true')
  } catch {
    // ignore demo seeding issues (e.g., storage blocked)
  }
}
