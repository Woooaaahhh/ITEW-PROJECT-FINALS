import { readAll, writeAll, makeRecordId, nowIso } from './studentRecordsStorage'

const SEEDED_KEY = 'spms_student_records_seeded_v1'

export function ensureSeededForDemo(studentIds: string[]) {
  try {
    const seeded = localStorage.getItem(SEEDED_KEY)
    if (seeded === 'true') return
    if (studentIds.length === 0) return

    const firstId = studentIds[0]
    const all = readAll()
    if (!all[firstId]) {
      const ts = nowIso()
      all[firstId] = {
        violations: [
          {
            id: makeRecordId('vio'),
            studentId: firstId,
            violation_type: 'Attendance',
            description: 'Late arrival (3 times) during the first week.',
            date: '2026-03-10',
            status: 'Pending',
            createdAt: ts,
          },
        ],
        achievements: [
          {
            id: makeRecordId('ach'),
            studentId: firstId,
            title: 'Hackathon Participant',
            description: 'Participated in campus-wide hackathon and completed final demo.',
            date: '2026-03-08',
            category: 'Programming',
            createdAt: ts,
          },
        ],
      }
      writeAll(all)
    }

    localStorage.setItem(SEEDED_KEY, 'true')
  } catch {
    // ignore demo seeding issues (e.g., storage blocked)
  }
}
