import {
  ensureStudentBucket,
  makeRecordId,
  nowIso,
  readAll,
  writeAll,
  type ViolationRecord,
} from './studentRecordsStorage'

export type { ViolationRecord }

export function getViolations(studentId: string): ViolationRecord[] {
  const all = readAll()
  return all[studentId]?.violations ?? []
}

export function addViolation(
  studentId: string,
  input: Omit<ViolationRecord, 'id' | 'studentId' | 'createdAt'>,
): ViolationRecord {
  const all = readAll()
  const current = ensureStudentBucket(all, studentId)

  const record: ViolationRecord = {
    id: makeRecordId('vio'),
    studentId,
    createdAt: nowIso(),
    ...input,
  }

  all[studentId] = {
    ...current,
    violations: [record, ...current.violations].sort((a, b) => (a.date < b.date ? 1 : -1)),
  }
  writeAll(all)
  return record
}
