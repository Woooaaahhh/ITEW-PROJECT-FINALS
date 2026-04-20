import { nowIso, openSpmsDb, type Student } from './spmsDb'
import axios from 'axios'

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
}

function fromApiRow(row: ApiStudentRow): Student {
  const ts = nowIso()
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
    medicalClearanceStatus: 'pending',
    medicalClearanceUpdatedAt: null,
    medicalClearanceNotes: null,
    medicalHeight: null,
    medicalWeight: null,
    medicalBloodPressure: null,
    medicalCondition: null,
    medicalPhysicianName: null,
    medicalExamDate: null,
    medicalFormDetails: null,
    medicalDocumentDataUrl: null,
    medicalSubmittedAt: null,
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

/** Fixed keys so concurrent seed runs upsert the same rows instead of creating duplicates. */
const SEED_STUDENT_IDS = {
  alyssa: 'S-seed-alyssa-santos',
  jerome: 'S-seed-jerome-reyes',
  demo: 'S-seed-student-demo',
} as const

const DEMO_SEED_EMAILS = [
  'alyssa.santos@school.edu',
  'jerome.reyes@school.edu',
  'student@spms.edu',
] as const

const STABLE_ID_BY_DEMO_EMAIL: Record<(typeof DEMO_SEED_EMAILS)[number], string> = {
  'alyssa.santos@school.edu': SEED_STUDENT_IDS.alyssa,
  'jerome.reyes@school.edu': SEED_STUDENT_IDS.jerome,
  'student@spms.edu': SEED_STUDENT_IDS.demo,
}

function normEmail(e: string) {
  return e.toLowerCase().trim()
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
  if (seeded?.value === 'true') return

  const existing = await db.count('students')
  if (existing > 0) {
    await db.put('meta', { key: 'seeded', value: 'true' })
    return
  }

  const ts = nowIso()
  const demo: Student[] = [
    {
      id: SEED_STUDENT_IDS.alyssa,
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
      sportsAffiliations: [],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: SEED_STUDENT_IDS.jerome,
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
      sportsAffiliations: [],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: SEED_STUDENT_IDS.demo,
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
      sportsAffiliations: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const tx = db.transaction(['students', 'meta'], 'readwrite')
  await Promise.all(demo.map((s) => tx.objectStore('students').put(s)))
  await tx.objectStore('meta').put({ key: 'seeded', value: 'true' })
  await tx.done
  notifyStudentsChanged()
}

export async function listStudents(): Promise<Student[]> {
  // Prefer backend API (MongoDB) so admin/faculty views show the true shared dataset.
  // Fallback to local IndexedDB for offline mode or student-role routes.
  try {
    const res = await axios.get<{ students: ApiStudentRow[] }>('/api/students')
    const apiStudents = (res.data.students ?? []).map(fromApiRow).map(withEligibilityDefaults)
    const db = await openSpmsDb()
    const local = await db.getAll('students')
    const localById = new Map(local.map((s) => [s.id, withEligibilityDefaults(s)]))
    const merged = apiStudents.map((st) => ({ ...st, ...pickEligibility(localById.get(st.id)) }))
    return merged.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
  } catch {
    const db = await openSpmsDb()
    const all = await db.getAll('students')
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

  // Prefer backend API for shared dataset; if it fails, fallback to IndexedDB (legacy/demo).
  try {
    const res = await axios.put<{ student: ApiStudentRow }>(`/api/students/${encodeURIComponent(id)}`, payload)
    const base = withEligibilityDefaults(fromApiRow(res.data.student))
    const merged = hasEligibilityFields ? await upsertLocalEligibility(base, eligibilityPatch) : base
    notifyStudentsChanged()
    return merged
  } catch {
    const db = await openSpmsDb()
    const existing = await db.get('students', id)
    if (!existing) throw new Error('Student not found')
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
