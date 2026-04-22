import { nowIso, openSpmsDb, type Student } from './spmsDb'
import axios from 'axios'

export type { Student } from './spmsDb'

type CacheEntry<T> = {
  value: T
  fetchedAtMs: number
}

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
    // Keep module-level caches coherent across pages.
    clearStudentMemoryCache()
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

const STUDENTS_CACHE_TTL_MS = 30_000
let studentsCache: CacheEntry<Student[]> | null = null
let studentsInFlight: Promise<Student[]> | null = null

const studentByIdCache = new Map<string, CacheEntry<Student | undefined>>()
const studentByIdInFlight = new Map<string, Promise<Student | undefined>>()

function isFreshEntry<T>(entry: CacheEntry<T> | null, ttlMs: number): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.fetchedAtMs < ttlMs
}

function setStudentsCache(value: Student[]) {
  studentsCache = { value, fetchedAtMs: Date.now() }
}

function setStudentByIdCache(id: string, value: Student | undefined) {
  studentByIdCache.set(id, { value, fetchedAtMs: Date.now() })
}

function clearStudentMemoryCache() {
  studentsCache = null
  studentsInFlight = null
  studentByIdCache.clear()
  studentByIdInFlight.clear()
}

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
  const cache = studentsCache
  if (isFreshEntry(cache, STUDENTS_CACHE_TTL_MS)) return cache.value
  if (studentsInFlight) return studentsInFlight

  // Prefer backend API (MongoDB) so admin/faculty views show the true shared dataset.
  // Fallback to local IndexedDB for offline mode or student-role routes.
  studentsInFlight = (async () => {
    try {
      const res = await axios.get<{ students: ApiStudentRow[] }>('/api/students')
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
          const retryRes = await axios.get<{ students: ApiStudentRow[] }>('/api/students')
          const retryAll = (retryRes.data.students ?? []).map(fromApiRow)
          const db = await openSpmsDb()
          const local = await db.getAll('students')
          const localById = new Map(local.map((s) => [s.id, withEligibilityDefaults(s)]))
          const mergedRetry = retryAll
            .map(withEligibilityDefaults)
            .map((st) => ({ ...st, ...pickEligibility(localById.get(st.id)) }))
            .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

          setStudentsCache(mergedRetry)
          return mergedRetry
        }
      }

      const db = await openSpmsDb()
      const local = await db.getAll('students')
      const localById = new Map(local.map((s) => [s.id, withEligibilityDefaults(s)]))
      const merged = all
        .map(withEligibilityDefaults)
        .map((st) => ({ ...st, ...pickEligibility(localById.get(st.id)) }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

      setStudentsCache(merged)
      return merged
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
          setStudentsCache([])
          return []
        }
      }

      const out = all.map(withEligibilityDefaults).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      setStudentsCache(out)
      return out
    } finally {
      studentsInFlight = null
    }
  })()

  return studentsInFlight
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const cached = (studentByIdCache.get(id) ?? null) as CacheEntry<Student | undefined> | null
  if (isFreshEntry(cached, STUDENTS_CACHE_TTL_MS)) return cached.value
  const inflight = studentByIdInFlight.get(id)
  if (inflight) return inflight

  const task = (async () => {
    try {
      const res = await axios.get<{ student: ApiStudentRow }>(`/api/students/${encodeURIComponent(id)}`)
      const base = withEligibilityDefaults(fromApiRow(res.data.student))
      const db = await openSpmsDb()
      const local = await db.get('students', id)
      const merged = { ...base, ...pickEligibility(local ? withEligibilityDefaults(local) : undefined) }
      setStudentByIdCache(id, merged)
      return merged
    } catch {
      const db = await openSpmsDb()
      const s = await db.get('students', id)
      const out = s ? withEligibilityDefaults(s) : undefined
      setStudentByIdCache(id, out)
      return out
    } finally {
      studentByIdInFlight.delete(id)
    }
  })()

  studentByIdInFlight.set(id, task)
  return task
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
