/** Shared persisted shape for per-student behavior data (single localStorage document). */

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

export function emptyStudentRecords(): StudentRecords {
  return { violations: [], achievements: [] }
}

export function makeRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function readAll(): Record<string, StudentRecords> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Record<string, StudentRecords>
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export function writeAll(all: Record<string, StudentRecords>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  try {
    window.dispatchEvent(new CustomEvent('spms-student-records-changed'))
  } catch {
    // ignore (non-browser)
  }
}

export function ensureStudentBucket(all: Record<string, StudentRecords>, studentId: string): StudentRecords {
  if (!all[studentId]) all[studentId] = emptyStudentRecords()
  return all[studentId]
}
