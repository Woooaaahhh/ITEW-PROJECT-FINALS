import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** Faculty decision: pending (awaiting review or no submission), approved, rejected. Legacy: cleared→approved, not_cleared→rejected */
export type MedicalClearanceStatus = 'pending' | 'approved' | 'rejected'

export type StudentEligibility = {
  sportsAffiliations?: string[] | null
  medicalClearanceStatus?: MedicalClearanceStatus | string | null
  medicalClearanceUpdatedAt?: string | null
  medicalClearanceNotes?: string | null
  /** Student-submitted medical form (faculty reviews) */
  medicalHeight?: string | null
  medicalWeight?: string | null
  medicalBloodPressure?: string | null
  medicalCondition?: string | null
  medicalPhysicianName?: string | null
  medicalExamDate?: string | null
  /** Extra notes / health status narrative (optional) */
  medicalFormDetails?: string | null
  /** Data URL: image/* or application/pdf */
  medicalDocumentDataUrl?: string | null
  medicalSubmittedAt?: string | null
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
  studentId: string
  skillId: string
  createdAt: string
}

export type Syllabus = {
  id: string
  title: string
  description?: string | null
  courseCode?: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type CurriculumUnit = {
  id: string
  syllabusId: string
  title: string
  description?: string | null
  orderIndex: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type Lesson = {
  id: string
  syllabusId: string
  curriculumUnitId?: string | null
  title: string
  content?: string | null
  weekNumber?: number | null
  orderIndex: number
  isArchived: boolean
  attachments?: LessonAttachment[]
  createdAt: string
  updatedAt: string
}

export type LessonAttachment = {
  id: string
  lessonId: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  uploadedAt: string
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
    indexes: { 'by-name': string; 'by-category': string; 'by-updatedAt': string; 'by-active': number }
  }
  studentSkills: {
    key: [string, string] // [studentId, skillId]
    value: StudentSkill
    indexes: { 'by-studentId': string; 'by-skillId': string; 'by-createdAt': string }
  }
  syllabi: {
    key: string
    value: Syllabus
    indexes: { 'by-updatedAt': string; 'by-title': string; 'by-courseCode': string }
  }
  curriculumUnits: {
    key: string
    value: CurriculumUnit
    indexes: { 'by-syllabusId': string; 'by-orderIndex': number }
  }
  lessons: {
    key: string
    value: Lesson
    indexes: { 'by-syllabusId': string; 'by-curriculumUnitId': string; 'by-updatedAt': string; 'by-orderIndex': number }
  }
  lessonAttachments: {
    key: string
    value: LessonAttachment
    indexes: { 'by-lessonId': string }
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

const DB_NAME = 'spms-db'
/** Must never be lower than the version already in the user's browser, or openDB throws VersionError. */
const DB_VERSION = 9

export async function openSpmsDb(): Promise<IDBPDatabase<SpmsDb>> {
  return openDB<SpmsDb>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
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
      // Only rebuild studentSkills when migrating from before v4 (wrong keyPath). Do not wipe on v4→v5 bumps.
      if (oldVersion > 0 && oldVersion < 4 && db.objectStoreNames.contains('studentSkills')) {
        db.deleteObjectStore('studentSkills')
      }
      if (!db.objectStoreNames.contains('studentSkills')) {
        const studentSkills = db.createObjectStore('studentSkills', { keyPath: ['studentId', 'skillId'] })
        studentSkills.createIndex('by-studentId', 'studentId')
        studentSkills.createIndex('by-skillId', 'skillId')
        studentSkills.createIndex('by-createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains('syllabi')) {
        const store = db.createObjectStore('syllabi', { keyPath: 'id' })
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-title', 'title')
        store.createIndex('by-courseCode', 'courseCode')
      }
      if (!db.objectStoreNames.contains('curriculumUnits')) {
        const store = db.createObjectStore('curriculumUnits', { keyPath: 'id' })
        store.createIndex('by-syllabusId', 'syllabusId')
        store.createIndex('by-orderIndex', 'orderIndex')
      }
      if (!db.objectStoreNames.contains('lessons')) {
        const store = db.createObjectStore('lessons', { keyPath: 'id' })
        store.createIndex('by-syllabusId', 'syllabusId')
        store.createIndex('by-curriculumUnitId', 'curriculumUnitId')
        store.createIndex('by-updatedAt', 'updatedAt')
        store.createIndex('by-orderIndex', 'orderIndex')
      }
      if (!db.objectStoreNames.contains('lessonAttachments')) {
        const store = db.createObjectStore('lessonAttachments', { keyPath: 'id' })
        store.createIndex('by-lessonId', 'lessonId')
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

