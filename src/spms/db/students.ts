import { nowIso, openSpmsDb, type Student } from './spmsDb'
import axios from 'axios'
import { DEFAULT_DEMO_SPORTS } from './sports'
import { ensureSeededForDemo } from './studentRecordsSeed'
import { ensureSeededDemoAcademicRecords } from './academicRecords'
import { ensureSeededDemoStudentSkills } from './skills'
import {
  BULK_DEMO_STUDENT_COUNT,
  CORE_DEMO_STUDENT_IDS,
  bulkDemoStudentId,
  buildAllSeedDemoStudentIds,
} from './demoSeedUtils'

export type { Student } from './spmsDb'

type ApiStudentRow = {
  student_id: number
  first_name: string
  middle_name?: string | null
  last_name: string
  birthdate?: string | null
  gender?: string | null
  address?: string | null
  year_level?: string | null
  section?: string | null
  email?: string | null
  contact_number?: string | null
  profile_picture_data_url?: string | null
  medical_clearance_status?: string | null
  medical_clearance_updated_at?: string | null
  medical_clearance_notes?: string | null
  medical_height?: string | null
  medical_weight?: string | null
  medical_blood_pressure?: string | null
  medical_condition?: string | null
  medical_physician_name?: string | null
  medical_exam_date?: string | null
  medical_form_details?: string | null
  medical_document_data_url?: string | null
  medical_submitted_at?: string | null
}

function fromApiRow(row: ApiStudentRow): Student {
  const ts = nowIso()
  const statusRaw = row.medical_clearance_status
  const medicalClearanceStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'pending' ? statusRaw : 'pending'
  return {
    id: String(row.student_id),
    firstName: row.first_name ?? '',
    middleName: row.middle_name ?? '',
    lastName: row.last_name ?? '',
    birthdate: row.birthdate ?? '',
    gender: row.gender ?? '',
    address: row.address ?? '',
    email: row.email ?? '',
    contactNumber: row.contact_number ?? '',
    yearLevel: row.year_level ?? '',
    section: row.section ?? '',
    profilePictureDataUrl: row.profile_picture_data_url ?? null,
    sportsAffiliations: [],
    createdAt: ts,
    updatedAt: ts,
    medicalClearanceStatus,
    medicalClearanceUpdatedAt: row.medical_clearance_updated_at ?? null,
    medicalClearanceNotes: row.medical_clearance_notes ?? null,
    medicalHeight: row.medical_height ?? null,
    medicalWeight: row.medical_weight ?? null,
    medicalBloodPressure: row.medical_blood_pressure ?? null,
    medicalCondition: row.medical_condition ?? null,
    medicalPhysicianName: row.medical_physician_name ?? null,
    medicalExamDate: row.medical_exam_date ?? null,
    medicalFormDetails: row.medical_form_details ?? null,
    medicalDocumentDataUrl: row.medical_document_data_url ?? null,
    medicalSubmittedAt: row.medical_submitted_at ?? null,
  }
}

function notifyStudentsChanged() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('spms-students-changed'))
  } catch {
    /* ignore */
  }
}

function withEligibilityDefaults(s: Student): Student {
  return {
    ...s,
    sportsAffiliations: Array.isArray(s.sportsAffiliations) ? s.sportsAffiliations : [],
    medicalClearanceStatus: s.medicalClearanceStatus ?? 'pending',
    medicalClearanceUpdatedAt: s.medicalClearanceUpdatedAt ?? null,
    medicalClearanceNotes: s.medicalClearanceNotes ?? null,
    medicalHeight: s.medicalHeight ?? null,
    medicalWeight: s.medicalWeight ?? null,
    medicalBloodPressure: s.medicalBloodPressure ?? null,
    medicalCondition: s.medicalCondition ?? null,
    medicalPhysicianName: s.medicalPhysicianName ?? null,
    medicalExamDate: s.medicalExamDate ?? null,
    medicalFormDetails: s.medicalFormDetails ?? null,
    medicalDocumentDataUrl: s.medicalDocumentDataUrl ?? null,
    medicalSubmittedAt: s.medicalSubmittedAt ?? null,
  }
}

type EligibilityPatch = Pick<
  Student,
  | 'sportsAffiliations'
  | 'medicalClearanceStatus'
  | 'medicalClearanceUpdatedAt'
  | 'medicalClearanceNotes'
  | 'medicalHeight'
  | 'medicalWeight'
  | 'medicalBloodPressure'
  | 'medicalCondition'
  | 'medicalPhysicianName'
  | 'medicalExamDate'
  | 'medicalFormDetails'
  | 'medicalDocumentDataUrl'
  | 'medicalSubmittedAt'
>

function pickEligibility(s: Student | undefined | null): Partial<EligibilityPatch> {
  if (!s) return {}
  return {
    sportsAffiliations: s.sportsAffiliations ?? [],
    medicalClearanceStatus: s.medicalClearanceStatus ?? 'pending',
    medicalClearanceUpdatedAt: s.medicalClearanceUpdatedAt ?? null,
    medicalClearanceNotes: s.medicalClearanceNotes ?? null,
    medicalHeight: s.medicalHeight ?? null,
    medicalWeight: s.medicalWeight ?? null,
    medicalBloodPressure: s.medicalBloodPressure ?? null,
    medicalCondition: s.medicalCondition ?? null,
    medicalPhysicianName: s.medicalPhysicianName ?? null,
    medicalExamDate: s.medicalExamDate ?? null,
    medicalFormDetails: s.medicalFormDetails ?? null,
    medicalDocumentDataUrl: s.medicalDocumentDataUrl ?? null,
    medicalSubmittedAt: s.medicalSubmittedAt ?? null,
  }
}

async function upsertLocalEligibility(base: Student, eligibility: Partial<EligibilityPatch>): Promise<Student> {
  const db = await openSpmsDb()
  const existing = await db.get('students', base.id)
  const updated: Student = withEligibilityDefaults({
    ...(existing ?? base),
    ...base,
    ...pickEligibility(existing ? withEligibilityDefaults(existing) : undefined),
    ...eligibility,
    updatedAt: nowIso(),
  })
  await db.put('students', updated)
  return updated
}

function makeId() {
  // not cryptographically secure; good enough for local DB key
  return `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const DEMO_SEED_EMAILS = [
  'alyssa.santos@school.edu',
  'jerome.reyes@school.edu',
  'student@spms.edu',
] as const

const STABLE_ID_BY_DEMO_EMAIL: Record<(typeof DEMO_SEED_EMAILS)[number], string> = {
  'alyssa.santos@school.edu': CORE_DEMO_STUDENT_IDS.alyssa,
  'jerome.reyes@school.edu': CORE_DEMO_STUDENT_IDS.jerome,
  'student@spms.edu': CORE_DEMO_STUDENT_IDS.demo,
}

function normEmail(e: string) {
  return e.toLowerCase().trim()
}

const demoFirstNames = [
  'Alex', 'Bianca', 'Carlo', 'Diana', 'Ethan', 'Faith', 'Gabriel', 'Hannah', 'Ivan', 'Jasmine',
  'Kyle', 'Lara', 'Marco', 'Nina', 'Owen', 'Paula', 'Quinn', 'Rafael', 'Sabrina', 'Tristan',
]

const demoLastNames = [
  'Alvarez', 'Bautista', 'Castillo', 'Dela Cruz', 'Evangelista', 'Fernandez', 'Garcia', 'Hernandez',
  'Ignacio', 'Jimenez', 'Lopez', 'Mendoza', 'Navarro', 'Ortega', 'Perez', 'Ramos', 'Santiago',
  'Torres', 'Valdez', 'Zamora',
]

const demoSections = ['BSIT-1A', 'BSIT-2A', 'BSIT-3A', 'BSIT-4A', 'BSBA-1B', 'BSED-3C']

function createBulkDemoStudent(index: number, ts: string): Student {
  const firstName = demoFirstNames[index % demoFirstNames.length]
  const lastName = demoLastNames[Math.floor(index / demoFirstNames.length) % demoLastNames.length]
  const yearLevel = `${(index % 4) + 1}${(index % 4) === 0 ? 'st' : (index % 4) === 1 ? 'nd' : (index % 4) === 2 ? 'rd' : 'th'}`
  const section = demoSections[index % demoSections.length]
  const submitted = index % 5 !== 0
  const approved = index % 4 !== 0
  const medicalStatus = submitted ? (approved ? 'approved' : 'pending') : 'pending'
  const demoSportIds = DEFAULT_DEMO_SPORTS.map((sport) => sport.id)
  return {
    id: bulkDemoStudentId(index + 1),
    firstName,
    middleName: '',
    lastName: `${lastName} ${String.fromCharCode(65 + (index % 26))}.`,
    birthdate: `200${index % 8}-0${(index % 9) + 1}-${String(((index * 3) % 27) + 1).padStart(2, '0')}`,
    gender: index % 2 === 0 ? 'Male' : 'Female',
    address: `Barangay ${((index % 20) + 1).toString().padStart(2, '0')}, Demo City`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}.${index + 1}@demo.spms.edu`,
    contactNumber: `0917${String(1000000 + index).slice(-7)}`,
    yearLevel,
    section,
    profilePictureDataUrl: null,
    sportsAffiliations: [demoSportIds[index % demoSportIds.length], demoSportIds[(index + 2) % demoSportIds.length]],
    createdAt: ts,
    updatedAt: ts,
    medicalClearanceStatus: medicalStatus,
    medicalClearanceUpdatedAt: ts,
    medicalClearanceNotes: approved ? 'Approved for seeded demonstration data.' : 'Pending faculty review.',
    medicalHeight: `${150 + (index % 30)} cm`,
    medicalWeight: `${45 + (index % 35)} kg`,
    medicalBloodPressure: `${110 + (index % 15)}/${70 + (index % 10)}`,
    medicalCondition: index % 6 === 0 ? 'Seasonal allergies' : 'Fit to participate',
    medicalPhysicianName: `Dr. Demo ${(index % 12) + 1}`,
    medicalExamDate: `2026-0${(index % 9) + 1}-${String((index % 20) + 1).padStart(2, '0')}`,
    medicalFormDetails: 'Auto-generated medical record for system capacity testing.',
    medicalDocumentDataUrl: null,
    medicalSubmittedAt: submitted ? ts : null,
  }
}

function buildSeedStudents(ts: string): Student[] {
  const core: Student[] = [
    {
      id: CORE_DEMO_STUDENT_IDS.alyssa,
      firstName: 'Alyssa',
      middleName: 'M.',
      lastName: 'Santos',
      birthdate: '2006-07-15',
      gender: 'Female',
      address: 'Brgy. Example, City, Province',
      email: 'alyssa.santos@school.edu',
      contactNumber: '09xx xxx xxxx',
      yearLevel: '2nd',
      section: 'BSIT-2A',
      profilePictureDataUrl: null,
      sportsAffiliations: [DEFAULT_DEMO_SPORTS[0].id],
      createdAt: ts,
      updatedAt: ts,
      medicalClearanceStatus: 'approved',
      medicalClearanceUpdatedAt: ts,
      medicalClearanceNotes: 'Approved for tryouts.',
      medicalHeight: '162 cm',
      medicalWeight: '53 kg',
      medicalBloodPressure: '112/74',
      medicalCondition: 'Fit to participate',
      medicalPhysicianName: 'Dr. Elena Cruz',
      medicalExamDate: '2026-02-14',
      medicalFormDetails: 'Routine physical exam completed.',
      medicalDocumentDataUrl: null,
      medicalSubmittedAt: ts,
    },
    {
      id: CORE_DEMO_STUDENT_IDS.jerome,
      firstName: 'Jerome',
      middleName: 'D.',
      lastName: 'Reyes',
      birthdate: '2007-02-10',
      gender: 'Male',
      address: 'City, Province',
      email: 'jerome.reyes@school.edu',
      contactNumber: '09xx xxx xxxx',
      yearLevel: '1st',
      section: 'BSBA-1B',
      profilePictureDataUrl: null,
      sportsAffiliations: [DEFAULT_DEMO_SPORTS[1].id],
      createdAt: ts,
      updatedAt: ts,
      medicalClearanceStatus: 'pending',
      medicalClearanceUpdatedAt: ts,
      medicalClearanceNotes: 'Awaiting faculty review.',
      medicalHeight: '170 cm',
      medicalWeight: '60 kg',
      medicalBloodPressure: '118/76',
      medicalCondition: 'Fit to participate',
      medicalPhysicianName: 'Dr. Marco Sy',
      medicalExamDate: '2026-02-16',
      medicalFormDetails: 'Submitted medical requirements.',
      medicalDocumentDataUrl: null,
      medicalSubmittedAt: ts,
    },
    {
      id: CORE_DEMO_STUDENT_IDS.demo,
      firstName: 'Student',
      middleName: 'Demo',
      lastName: 'User',
      birthdate: '2006-01-01',
      gender: 'Male',
      address: 'Campus Address',
      email: 'student@spms.edu',
      contactNumber: '09xx xxx xxxx',
      yearLevel: '2nd',
      section: 'BSIT-2A',
      profilePictureDataUrl: null,
      sportsAffiliations: [DEFAULT_DEMO_SPORTS[2].id],
      createdAt: ts,
      updatedAt: ts,
      medicalClearanceStatus: 'approved',
      medicalClearanceUpdatedAt: ts,
      medicalClearanceNotes: 'Demo student cleared for activities.',
      medicalHeight: '168 cm',
      medicalWeight: '58 kg',
      medicalBloodPressure: '116/75',
      medicalCondition: 'Fit to participate',
      medicalPhysicianName: 'Dr. Mira Tan',
      medicalExamDate: '2026-02-18',
      medicalFormDetails: 'Demo medical form complete.',
      medicalDocumentDataUrl: null,
      medicalSubmittedAt: ts,
    },
  ]

  const bulk = Array.from({ length: BULK_DEMO_STUDENT_COUNT }, (_, index) => createBulkDemoStudent(index, ts))
  return [...core, ...bulk]
}

function mergeApiAndLocalStudents(apiStudents: Student[], localStudents: Student[]) {
  const localById = new Map(localStudents.map((student) => [student.id, withEligibilityDefaults(student)]))
  const merged = apiStudents.map(withEligibilityDefaults).map((student) => {
    const local = localById.get(student.id)
    return local ? { ...student, ...pickEligibility(local) } : student
  })

  for (const local of localStudents.map(withEligibilityDefaults)) {
    if (!localById.has(local.id)) continue
    if (!merged.some((student) => student.id === local.id)) {
      merged.push(local)
    }
  }

  return merged.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

/** Removes extra rows for built-in demo emails (e.g. after a race double-seeded the DB). */
async function dedupeDemoStudentsByEmail(db: Awaited<ReturnType<typeof openSpmsDb>>): Promise<void> {
  const all = await db.getAll('students')
  for (const email of DEMO_SEED_EMAILS) {
    const matches = all.filter((s) => normEmail(s.email ?? '') === email)
    if (matches.length <= 1) continue
    const preferredId = STABLE_ID_BY_DEMO_EMAIL[email]
    const keeper =
      matches.find((m) => m.id === preferredId) ??
      [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    for (const m of matches) {
      if (m.id !== keeper.id) await db.delete('students', m.id)
    }
  }
}

/** Serializes seeding — many pages call seedIfEmpty(); without this, parallel runs each insert 3 students. */
let seedChain: Promise<void> = Promise.resolve()

async function runSeededWork(): Promise<void> {
  const db = await openSpmsDb()
  await dedupeDemoStudentsByEmail(db)

  const seeded = await db.get('meta', 'seeded')
  const expectedDemoIds = new Set<string>(buildAllSeedDemoStudentIds())
  const existingStudents = await db.getAll('students')
  const existingById = new Map(existingStudents.map((student) => [student.id, student]))
  const allDemoStudents = buildSeedStudents(nowIso())

  const missingDemoStudents = allDemoStudents.filter((student) => !existingById.has(student.id))
  if (seeded?.value === 'true' && missingDemoStudents.length === 0) return

  const tx = db.transaction(['students', 'meta'], 'readwrite')
  await Promise.all(missingDemoStudents.map((student) => tx.objectStore('students').put(student)))
  await tx.objectStore('meta').put({ key: 'seeded', value: 'true' })
  await tx.done

  const demoStudentIds = existingStudents
    .map((student) => student.id)
    .filter((studentId) => expectedDemoIds.has(studentId))
    .concat(missingDemoStudents.map((student) => student.id))
  ensureSeededForDemo(demoStudentIds)
  ensureSeededDemoAcademicRecords(demoStudentIds)
  await ensureSeededDemoStudentSkills(demoStudentIds)
  notifyStudentsChanged()
}

export async function listStudents(): Promise<Student[]> {
  // Prefer backend API (MongoDB) so admin/faculty views show the true shared dataset.
  // Fallback to local IndexedDB for offline mode or student-role routes.
  try {
    const res = await axios.get<{ students: ApiStudentRow[] }>('/api/students?includeHeavy=false')
    const all = (res.data.students ?? []).map(fromApiRow)

    // Only check for data issues if we have multiple students and API returned data
    if (all.length > 1) {
      const uniqueNames = new Set(all.map((s) => `${s.firstName} ${s.lastName}`))
      // Only clear cache if we have a clear data duplication issue AND it's a known problem name
      if (
        uniqueNames.size === 1 &&
        all[0] &&
        (all[0].firstName.includes('Kristy') || all[0].lastName.includes('Abernathy'))
      ) {
        // Clear cache and retry API call once
        await clearStudentCache()
        const retryRes = await axios.get<{ students: ApiStudentRow[] }>('/api/students?includeHeavy=false')
        const retryAll = (retryRes.data.students ?? []).map(fromApiRow)
        const db = await openSpmsDb()
        const local = await db.getAll('students')
        return mergeApiAndLocalStudents(retryAll, local)
      }
    }

    const db = await openSpmsDb()
    const local = await db.getAll('students')
    return mergeApiAndLocalStudents(all, local)
  } catch {
    const db = await openSpmsDb()
    const all = await db.getAll('students')

    // Only clear IndexedDB cache if we have the specific Kristy Abernathy duplication issue
    if (all.length > 1) {
      const uniqueNames = new Set(all.map((s) => `${s.firstName} ${s.lastName}`))
      if (
        uniqueNames.size === 1 &&
        all[0] &&
        (all[0].firstName.includes('Kristy') || all[0].lastName.includes('Abernathy'))
      ) {
        // Clear cache to force fresh API call on next attempt
        await clearStudentCache()
        return []
      }
    }

    return all
      .map(withEligibilityDefaults)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export async function getStudent(id: string): Promise<Student | undefined> {
  try {
    const res = await axios.get<{ student: ApiStudentRow }>(`/api/students/${encodeURIComponent(id)}`)
    const base = withEligibilityDefaults(fromApiRow(res.data.student))
    const db = await openSpmsDb()
    const local = await db.get('students', id)
    return { ...base, ...pickEligibility(local ? withEligibilityDefaults(local) : undefined) }
  } catch {
    const db = await openSpmsDb()
    const s = await db.get('students', id)
    return s ? withEligibilityDefaults(s) : undefined
  }
}

export async function createStudent(input: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const db = await openSpmsDb()
  const ts = nowIso()
  const student: Student = {
    id: makeId(),
    createdAt: ts,
    updatedAt: ts,
    ...input,
  }
  await db.put('students', student)
  notifyStudentsChanged()
  return withEligibilityDefaults(student)
}

export async function updateStudent(
  id: string,
  patch: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Student> {
  const payload: Record<string, unknown> = {}
  if (patch.firstName !== undefined) payload.first_name = patch.firstName
  if (patch.middleName !== undefined) payload.middle_name = patch.middleName
  if (patch.lastName !== undefined) payload.last_name = patch.lastName
  if (patch.birthdate !== undefined) payload.birthdate = patch.birthdate
  if (patch.gender !== undefined) payload.gender = patch.gender
  if (patch.address !== undefined) payload.address = patch.address
  if (patch.email !== undefined) payload.school_email = patch.email
  if (patch.contactNumber !== undefined) payload.contact_number = patch.contactNumber
  if (patch.yearLevel !== undefined) payload.year_level = patch.yearLevel
  if (patch.section !== undefined) payload.section = patch.section
  if (patch.profilePictureDataUrl !== undefined) payload.profile_picture_data_url = patch.profilePictureDataUrl

  const isMedicalPatch =
    patch.medicalClearanceStatus !== undefined ||
    patch.medicalClearanceUpdatedAt !== undefined ||
    patch.medicalClearanceNotes !== undefined ||
    patch.medicalHeight !== undefined ||
    patch.medicalWeight !== undefined ||
    patch.medicalBloodPressure !== undefined ||
    patch.medicalCondition !== undefined ||
    patch.medicalPhysicianName !== undefined ||
    patch.medicalExamDate !== undefined ||
    patch.medicalFormDetails !== undefined ||
    patch.medicalDocumentDataUrl !== undefined ||
    patch.medicalSubmittedAt !== undefined
  if (patch.sportsAffiliations !== undefined) payload.sports_affiliations = patch.sportsAffiliations
  if (patch.medicalClearanceStatus !== undefined) payload.medical_clearance_status = patch.medicalClearanceStatus
  if (patch.medicalClearanceUpdatedAt !== undefined) payload.medical_clearance_updated_at = patch.medicalClearanceUpdatedAt
  if (patch.medicalClearanceNotes !== undefined) payload.medical_clearance_notes = patch.medicalClearanceNotes
  if (patch.medicalHeight !== undefined) payload.medical_height = patch.medicalHeight
  if (patch.medicalWeight !== undefined) payload.medical_weight = patch.medicalWeight
  if (patch.medicalBloodPressure !== undefined) payload.medical_blood_pressure = patch.medicalBloodPressure
  if (patch.medicalCondition !== undefined) payload.medical_condition = patch.medicalCondition
  if (patch.medicalPhysicianName !== undefined) payload.medical_physician_name = patch.medicalPhysicianName
  if (patch.medicalExamDate !== undefined) payload.medical_exam_date = patch.medicalExamDate
  if (patch.medicalFormDetails !== undefined) payload.medical_form_details = patch.medicalFormDetails
  if (patch.medicalDocumentDataUrl !== undefined) payload.medical_document_data_url = patch.medicalDocumentDataUrl
  if (patch.medicalSubmittedAt !== undefined) payload.medical_submitted_at = patch.medicalSubmittedAt

  const eligibilityPatch: Partial<EligibilityPatch> = {}
  if (patch.sportsAffiliations !== undefined) eligibilityPatch.sportsAffiliations = patch.sportsAffiliations
  if (patch.medicalClearanceStatus !== undefined) eligibilityPatch.medicalClearanceStatus = patch.medicalClearanceStatus
  if (patch.medicalClearanceUpdatedAt !== undefined) eligibilityPatch.medicalClearanceUpdatedAt = patch.medicalClearanceUpdatedAt
  if (patch.medicalClearanceNotes !== undefined) eligibilityPatch.medicalClearanceNotes = patch.medicalClearanceNotes
  if (patch.medicalHeight !== undefined) eligibilityPatch.medicalHeight = patch.medicalHeight
  if (patch.medicalWeight !== undefined) eligibilityPatch.medicalWeight = patch.medicalWeight
  if (patch.medicalBloodPressure !== undefined) eligibilityPatch.medicalBloodPressure = patch.medicalBloodPressure
  if (patch.medicalCondition !== undefined) eligibilityPatch.medicalCondition = patch.medicalCondition
  if (patch.medicalPhysicianName !== undefined) eligibilityPatch.medicalPhysicianName = patch.medicalPhysicianName
  if (patch.medicalExamDate !== undefined) eligibilityPatch.medicalExamDate = patch.medicalExamDate
  if (patch.medicalFormDetails !== undefined) eligibilityPatch.medicalFormDetails = patch.medicalFormDetails
  if (patch.medicalDocumentDataUrl !== undefined) eligibilityPatch.medicalDocumentDataUrl = patch.medicalDocumentDataUrl
  if (patch.medicalSubmittedAt !== undefined) eligibilityPatch.medicalSubmittedAt = patch.medicalSubmittedAt

  const hasApiFields = Object.keys(payload).length > 0
  const hasEligibilityFields = Object.keys(eligibilityPatch).length > 0

  if (!hasApiFields && hasEligibilityFields) {
    const base = await getStudent(id)
    if (!base) throw new Error('Student not found')
    const updated = await upsertLocalEligibility(base, eligibilityPatch)
    notifyStudentsChanged()
    return updated
  }

  // Prefer backend API for shared dataset; fallback to IndexedDB for legacy/demo ids.
  try {
    const res = await axios.put<{ student: ApiStudentRow }>(`/api/students/${encodeURIComponent(id)}`, payload)
    const base = withEligibilityDefaults(fromApiRow(res.data.student))
    const merged = hasEligibilityFields ? await upsertLocalEligibility(base, eligibilityPatch) : base
    notifyStudentsChanged()
    return merged
  } catch (e) {
    // Medical submissions must persist to the shared backend (faculty review depends on it).
    // Falling back to IndexedDB would make the student think it saved, but staff would never see it.
    if (isMedicalPatch) {
      if (axios.isAxiosError(e)) {
        const message = (e.response?.data as { message?: string } | undefined)?.message
        throw new Error(message || `Failed to save medical record (HTTP ${e.response?.status ?? 'unknown'})`)
      }
      throw e instanceof Error ? e : new Error('Failed to save medical record')
    }

    // If API fails, try IndexedDB fallback
    const db = await openSpmsDb()
    const existing = await db.get('students', id)
    if (!existing) {
      // If student doesn't exist locally, try to fetch from API first
      try {
        const res = await axios.get<{ student: ApiStudentRow }>(`/api/students/${encodeURIComponent(id)}`)
        const apiStudent = withEligibilityDefaults(fromApiRow(res.data.student))
        const updated: Student = { ...apiStudent, ...patch, updatedAt: nowIso() }
        await db.put('students', updated)
        notifyStudentsChanged()
        return withEligibilityDefaults(updated)
      } catch {
        throw new Error(`Student with ID ${id} not found in both API and local database`)
      }
    }
    const updated: Student = { ...existing, ...patch, updatedAt: nowIso() }
    await db.put('students', updated)
    notifyStudentsChanged()
    return withEligibilityDefaults(updated)
  }
}

export async function deleteStudent(id: string): Promise<void> {
  try {
    await axios.delete(`/api/students/${encodeURIComponent(id)}`)
    notifyStudentsChanged()
    return
  } catch {
    const db = await openSpmsDb()
    await db.delete('students', id)
    notifyStudentsChanged()
  }
}

export async function seedIfEmpty(): Promise<void> {
  const task = seedChain.then(() => runSeededWork())
  seedChain = task.catch(() => {})
  return task
}

export async function clearStudentCache(): Promise<void> {
  const db = await openSpmsDb()
  const tx = db.transaction('students', 'readwrite')
  await tx.objectStore('students').clear()
  await tx.done
}
