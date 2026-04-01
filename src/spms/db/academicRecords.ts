export type AcademicSemesterLabel = '1st Semester' | '2nd Semester' | 'Summer'

export type AcademicRecord = {
  id: string
  studentId: string
  schoolYear: string
  semester: AcademicSemesterLabel
  gwa: number
  honors: string
  createdAt: string
  updatedAt: string
}

export const ACADEMIC_SEMESTERS: AcademicSemesterLabel[] = ['1st Semester', '2nd Semester', 'Summer']

const STORAGE_KEY = 'spms_academic_records_v1'
const SEEDED_KEY = 'spms_academic_records_seeded_v1'

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  return `acr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readAll(): Record<string, AcademicRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Record<string, AcademicRecord[]>
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, AcademicRecord[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

/** Start year from "2024-2025" or "2024–2025"; fallback 0 */
export function parseSchoolYearStart(schoolYear: string): number {
  const m = String(schoolYear).trim().match(/^(\d{4})\s*[-–]\s*(\d{4})$/)
  if (m) return Number(m[1]) || 0
  const single = String(schoolYear).trim().match(/^(\d{4})$/)
  return single ? Number(single[1]) || 0 : 0
}

export function semesterOrder(semester: string): number {
  const s = semester.trim().toLowerCase()
  if (s.includes('1st') || s === '1') return 1
  if (s.includes('2nd') || s === '2') return 2
  if (s.includes('summer')) return 3
  return 0
}

/** Positive if a is chronologically after b */
export function compareAcademicChronology(a: AcademicRecord, b: AcademicRecord): number {
  const ya = parseSchoolYearStart(a.schoolYear)
  const yb = parseSchoolYearStart(b.schoolYear)
  if (ya !== yb) return ya - yb
  return semesterOrder(a.semester) - semesterOrder(b.semester)
}

export function getAcademicRecords(studentId: string): AcademicRecord[] {
  const all = readAll()
  return [...(all[studentId] ?? [])]
}

export function listAcademicRecordsSortedNewestFirst(studentId: string): AcademicRecord[] {
  return getAcademicRecords(studentId).sort((a, b) => compareAcademicChronology(b, a))
}

/** Latest term by school year + semester; null if none */
export function getCurrentAcademicRecord(studentId: string): AcademicRecord | null {
  const list = getAcademicRecords(studentId)
  if (list.length === 0) return null
  return list.reduce((best, r) => (compareAcademicChronology(r, best) > 0 ? r : best))
}

export function isCurrentAcademicRecord(studentId: string, recordId: string): boolean {
  const current = getCurrentAcademicRecord(studentId)
  return current?.id === recordId
}

function normalizeSemester(s: string): AcademicSemesterLabel | null {
  const t = s.trim()
  for (const opt of ACADEMIC_SEMESTERS) {
    if (opt === t) return opt
  }
  return null
}

export function validateGwa(gwa: number): string | null {
  if (Number.isNaN(gwa) || gwa < 1 || gwa > 5) {
    return 'GWA must be between 1.00 and 5.00'
  }
  return null
}

export function ensureAcademicSeededForDemo(studentIds: string[]) {
  try {
    const seeded = localStorage.getItem(SEEDED_KEY)
    if (seeded === 'true') return
    if (studentIds.length === 0) return

    const firstId = studentIds[0]
    const all = readAll()
    if (!all[firstId]?.length) {
      const t = nowIso()
      all[firstId] = [
        {
          id: makeId(),
          studentId: firstId,
          schoolYear: '2024-2025',
          semester: '1st Semester',
          gwa: 1.75,
          honors: "Dean's List",
          createdAt: t,
          updatedAt: t,
        },
        {
          id: makeId(),
          studentId: firstId,
          schoolYear: '2024-2025',
          semester: '2nd Semester',
          gwa: 1.5,
          honors: "Dean's List",
          createdAt: t,
          updatedAt: t,
        },
      ]
      writeAll(all)
    }

    localStorage.setItem(SEEDED_KEY, 'true')
  } catch {
    // ignore
  }
}

export function addAcademicRecord(
  studentId: string,
  input: Omit<AcademicRecord, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>,
): { ok: true; record: AcademicRecord } | { ok: false; error: string } {
  const sem = normalizeSemester(input.semester)
  if (!sem) return { ok: false, error: 'Invalid semester' }
  const sy = String(input.schoolYear).trim()
  if (!sy) return { ok: false, error: 'School year is required' }
  const gwaErr = validateGwa(input.gwa)
  if (gwaErr) return { ok: false, error: gwaErr }

  const all = readAll()
  const list = [...(all[studentId] ?? [])]
  const dup = list.some(
    (r) =>
      r.schoolYear.trim().toLowerCase() === sy.toLowerCase() &&
      normalizeSemester(r.semester) === sem,
  )
  if (dup) return { ok: false, error: 'A record for this school year and semester already exists. Edit it instead.' }

  const t = nowIso()
  const record: AcademicRecord = {
    id: makeId(),
    studentId,
    schoolYear: sy,
    semester: sem,
    gwa: Math.round(input.gwa * 100) / 100,
    honors: String(input.honors ?? '').trim(),
    createdAt: t,
    updatedAt: t,
  }
  list.push(record)
  all[studentId] = list
  writeAll(all)
  return { ok: true, record }
}

export function updateAcademicRecord(
  studentId: string,
  recordId: string,
  input: Partial<Pick<AcademicRecord, 'schoolYear' | 'semester' | 'gwa' | 'honors'>>,
): { ok: true; record: AcademicRecord } | { ok: false; error: string } {
  const all = readAll()
  const list = [...(all[studentId] ?? [])]
  const idx = list.findIndex((r) => r.id === recordId)
  if (idx < 0) return { ok: false, error: 'Record not found' }

  const prev = list[idx]
  const schoolYear = input.schoolYear !== undefined ? String(input.schoolYear).trim() : prev.schoolYear
  if (!schoolYear) return { ok: false, error: 'School year is required' }

  const semRaw = input.semester !== undefined ? input.semester : prev.semester
  const sem = normalizeSemester(semRaw)
  if (!sem) return { ok: false, error: 'Invalid semester' }

  const gwa = input.gwa !== undefined ? input.gwa : prev.gwa
  const gwaErr = validateGwa(gwa)
  if (gwaErr) return { ok: false, error: gwaErr }

  const honors = input.honors !== undefined ? String(input.honors).trim() : prev.honors

  const clash = list.some(
    (r, i) =>
      i !== idx &&
      r.schoolYear.trim().toLowerCase() === schoolYear.toLowerCase() &&
      normalizeSemester(r.semester) === sem,
  )
  if (clash) return { ok: false, error: 'Another record already uses this school year and semester.' }

  const updated: AcademicRecord = {
    ...prev,
    schoolYear,
    semester: sem,
    gwa: Math.round(gwa * 100) / 100,
    honors,
    updatedAt: nowIso(),
  }
  list[idx] = updated
  all[studentId] = list
  writeAll(all)
  return { ok: true, record: updated }
}
