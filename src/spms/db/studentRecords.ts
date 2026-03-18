export type ViolationRecord = {
  id: string
  studentId: string
  violation_type: string
  description: string
  date: string // yyyy-mm-dd
  status: 'Pending' | 'Resolved' | string
  createdAt: string // ISO
}

export type AchievementRecord = {
  id: string
  studentId: string
  title: string
  description: string
  date: string // yyyy-mm-dd
  category?: string
  createdAt: string // ISO
}

export type StudentRecords = {
  violations: ViolationRecord[]
  achievements: AchievementRecord[]
}

const STORAGE_KEY = 'spms_student_records_v1'
const SEEDED_KEY = 'spms_student_records_seeded_v1'

function nowIso() {
  return new Date().toISOString()
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readAll(): Record<string, StudentRecords> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Record<string, StudentRecords>
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, StudentRecords>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function ensureSeededForDemo(studentIds: string[]) {
  try {
    const seeded = localStorage.getItem(SEEDED_KEY)
    if (seeded === 'true') return
    if (studentIds.length === 0) return

    const firstId = studentIds[0]
    const all = readAll()
    if (!all[firstId]) {
      all[firstId] = {
        violations: [
          {
            id: makeId('vio'),
            studentId: firstId,
            violation_type: 'Attendance',
            description: 'Late arrival (3 times) during the first week.',
            date: '2026-03-10',
            status: 'Pending',
            createdAt: nowIso(),
          },
        ],
        achievements: [
          {
            id: makeId('ach'),
            studentId: firstId,
            title: 'Hackathon Participant',
            description: 'Participated in campus-wide hackathon and completed final demo.',
            date: '2026-03-08',
            category: 'Programming',
            createdAt: nowIso(),
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

export function getStudentRecords(studentId: string): StudentRecords {
  const all = readAll()
  return (
    all[studentId] ?? {
      violations: [],
      achievements: [],
    }
  )
}

export function addViolation(
  studentId: string,
  input: Omit<ViolationRecord, 'id' | 'studentId' | 'createdAt'>,
): ViolationRecord {
  const all = readAll()
  const current = all[studentId] ?? { violations: [], achievements: [] }

  const record: ViolationRecord = {
    id: makeId('vio'),
    studentId,
    createdAt: nowIso(),
    ...input,
  }

  const next: StudentRecords = {
    ...current,
    violations: [record, ...current.violations].sort((a, b) => (a.date < b.date ? 1 : -1)),
  }

  all[studentId] = next
  writeAll(all)
  return record
}

export function addAchievement(
  studentId: string,
  input: Omit<AchievementRecord, 'id' | 'studentId' | 'createdAt'>,
): AchievementRecord {
  const all = readAll()
  const current = all[studentId] ?? { violations: [], achievements: [] }

  const record: AchievementRecord = {
    id: makeId('ach'),
    studentId,
    createdAt: nowIso(),
    ...input,
  }

  const next: StudentRecords = {
    ...current,
    achievements: [record, ...current.achievements].sort((a, b) => (a.date < b.date ? 1 : -1)),
  }

  all[studentId] = next
  writeAll(all)
  return record
}

