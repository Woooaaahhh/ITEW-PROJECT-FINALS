import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type StudentEligibility = {
  sportsAffiliations?: string[] | null
}

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
} & StudentEligibility

export type Sport = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type Skill = {
  id: string
  name: string
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type StudentSkill = {
<<<<<<< HEAD
=======
  id: string
>>>>>>> c3ead31561f6c7cec8811b9d86271761a50150cd
  studentId: string
  skillId: string
  createdAt: string
}

export type SpmsDb = DBSchema & {
  students: {
    key: string
    value: Student
    indexes: { 'by-updatedAt': string; 'by-lastName': string }
  }
  sports: {
    key: string
    value: Sport
    indexes: { 'by-name': string; 'by-updatedAt': string; 'by-active': number }
  }
  skills: {
    key: string
    value: Skill
<<<<<<< HEAD
    indexes: { 'by-name': string; 'by-updatedAt': string; 'by-active': number; 'by-category': string }
  }
  studentSkills: {
    key: [string, string] // [studentId, skillId]
=======
    indexes: { 'by-name': string; 'by-category': string; 'by-updatedAt': string; 'by-active': number }
  }
  studentSkills: {
    key: string
>>>>>>> c3ead31561f6c7cec8811b9d86271761a50150cd
    value: StudentSkill
    indexes: { 'by-studentId': string; 'by-skillId': string; 'by-createdAt': string }
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

const DB_NAME = 'spms-db'
const DB_VERSION = 3

export async function openSpmsDb(): Promise<IDBPDatabase<SpmsDb>> {
  return openDB<SpmsDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('students')) {
        const store = db.createObjectStore('students', { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-lastName', 'lastName')
      }
      if (!db.objectStoreNames.contains('sports')) {
        const store = db.createObjectStore('sports', { keyPath: 'id' })
        store.createIndex('by-name', 'name')
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-active', 'isActive')
      }
      if (!db.objectStoreNames.contains('skills')) {
        const store = db.createObjectStore('skills', { keyPath: 'id' })
        store.createIndex('by-name', 'name')
        store.createIndex('by-category', 'category')
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-active', 'isActive')
      }
      if (!db.objectStoreNames.contains('studentSkills')) {
<<<<<<< HEAD
        const store = db.createObjectStore('studentSkills', { keyPath: ['studentId', 'skillId'] })
=======
        const store = db.createObjectStore('studentSkills', { keyPath: 'id' })
>>>>>>> c3ead31561f6c7cec8811b9d86271761a50150cd
        store.createIndex('by-studentId', 'studentId')
        store.createIndex('by-skillId', 'skillId')
        store.createIndex('by-createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    },
  })
}

export function nowIso() {
  return new Date().toISOString()
}

