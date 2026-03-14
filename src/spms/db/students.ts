import { openDB, type DBSchema } from 'idb'

export type Student = {
  id: string
  profilePictureDataUrl?: string | null
  firstName: string
  middleName?: string | null
  lastName: string
  birthdate?: string | null
  gender?: string | null
  address?: string | null
  email?: string | null
  contactNumber?: string | null
  yearLevel?: '1st' | '2nd' | '3rd' | '4th' | string | null
  section?: string | null
  createdAt: string
  updatedAt: string
}

type SpmsDb = DBSchema & {
  students: {
    key: string
    value: Student
    indexes: { 'by-updatedAt': string; 'by-lastName': string }
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

const DB_NAME = 'spms-db'
const DB_VERSION = 1

async function getDb() {
  return openDB<SpmsDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('students')) {
        const store = db.createObjectStore('students', { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-lastName', 'lastName')
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    },
  })
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  // not cryptographically secure; good enough for local DB key
  return `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listStudents(): Promise<Student[]> {
  const db = await getDb()
  const all = await db.getAll('students')
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const db = await getDb()
  return db.get('students', id)
}

export async function createStudent(input: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
  const db = await getDb()
  const ts = nowIso()
  const student: Student = {
    id: makeId(),
    createdAt: ts,
    updatedAt: ts,
    ...input,
  }
  await db.put('students', student)
  return student
}

export async function updateStudent(
  id: string,
  patch: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Student> {
  const db = await getDb()
  const existing = await db.get('students', id)
  if (!existing) throw new Error('Student not found')
  const updated: Student = { ...existing, ...patch, updatedAt: nowIso() }
  await db.put('students', updated)
  return updated
}

export async function deleteStudent(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('students', id)
}

export async function seedIfEmpty(): Promise<void> {
  const db = await getDb()
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
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  const tx = db.transaction(['students', 'meta'], 'readwrite')
  await Promise.all(demo.map((s) => tx.objectStore('students').put(s)))
  await tx.objectStore('meta').put({ key: 'seeded', value: 'true' })
  await tx.done
}

