import { nowIso, openSpmsDb, type Student } from './spmsDb'

export type { Student } from './spmsDb'

function withEligibilityDefaults(s: Student): Student {
  return {
    ...s,
    sportsAffiliations: Array.isArray(s.sportsAffiliations) ? s.sportsAffiliations : [],
  }
}

function makeId() {
  // not cryptographically secure; good enough for local DB key
  return `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listStudents(): Promise<Student[]> {
  const db = await openSpmsDb()
  const all = await db.getAll('students')
  return all
    .map(withEligibilityDefaults)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const db = await openSpmsDb()
  const s = await db.get('students', id)
  return s ? withEligibilityDefaults(s) : undefined
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
  return withEligibilityDefaults(student)
}

export async function updateStudent(
  id: string,
  patch: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Student> {
  const db = await openSpmsDb()
  const existing = await db.get('students', id)
  if (!existing) throw new Error('Student not found')
  const updated: Student = { ...existing, ...patch, updatedAt: nowIso() }
  await db.put('students', updated)
  return withEligibilityDefaults(updated)
}

export async function deleteStudent(id: string): Promise<void> {
  const db = await openSpmsDb()
  await db.delete('students', id)
}

export async function seedIfEmpty(): Promise<void> {
  const db = await openSpmsDb()
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
      id: makeId(),
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
      id: makeId(),
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
      id: makeId(),
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
}

