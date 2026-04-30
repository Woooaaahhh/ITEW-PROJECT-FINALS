import {
  ensureStudentBucket,
  makeRecordId,
  nowIso,
  readAll,
  writeAll,
  type AchievementRecord,
} from './studentRecordsStorage'

export type { AchievementRecord }

export function getAchievements(studentId: string): AchievementRecord[] {
  const all = readAll()
  return all[studentId]?.achievements ?? []
}

export function addAchievement(
  studentId: string,
  input: Omit<AchievementRecord, 'id' | 'studentId' | 'createdAt'>,
): AchievementRecord {
  const all = readAll()
  const current = ensureStudentBucket(all, studentId)

  const record: AchievementRecord = {
    id: makeRecordId('ach'),
    studentId,
    createdAt: nowIso(),
    ...input,
  }

  all[studentId] = {
    ...current,
    achievements: [record, ...current.achievements].sort((a, b) => (a.date < b.date ? 1 : -1)),
  }
  writeAll(all)
  return record
}
