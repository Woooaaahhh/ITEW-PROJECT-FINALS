import { openDB, type IDBPDatabase } from 'idb'
import { type SpmsDb } from './spmsDb'

// Academic Entity Types
export type Syllabus = {
  id: string
  title: string
  courseCode: string
  description: string
  createdBy: string // Admin/Registrar user ID
  createdAt: string
  updatedAt: string
}

export type Curriculum = {
  id: string
  name: string
  syllabusId: string
  createdBy: string // Faculty user ID
  createdAt: string
  updatedAt: string
}

export type Lesson = {
  id: string
  title: string
  week: number
  content: string
  curriculumId: string
  createdBy: string // Faculty user ID
  createdAt: string
  updatedAt: string
}

// Extended database schema with academic tables
export type AcademicDb = SpmsDb & {
  syllabi: {
    key: string
    value: Syllabus
    indexes: { 'by-courseCode': string; 'by-createdBy': string; 'by-createdAt': string }
  }
  curricula: {
    key: string
    value: Curriculum
    indexes: { 'by-syllabusId': string; 'by-createdBy': string; 'by-createdAt': string }
  }
  lessons: {
    key: string
    value: Lesson
    indexes: { 'by-curriculumId': string; 'by-createdBy': string; 'by-week': number; 'by-createdAt': string }
  }
}

// Database version increment for academic schema
const ACADEMIC_DB_VERSION = 7

export async function openAcademicDb(): Promise<IDBPDatabase<AcademicDb>> {
  return openDB<AcademicDb>('spms-db', ACADEMIC_DB_VERSION, {
    upgrade(db, _oldVersion) {
      // Create existing stores (if they don't exist)
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
        const studentSkills = db.createObjectStore('studentSkills', { keyPath: ['studentId', 'skillId'] })
        studentSkills.createIndex('by-studentId', 'studentId')
        studentSkills.createIndex('by-skillId', 'skillId')
        studentSkills.createIndex('by-createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }

      // Create new academic stores
      if (!db.objectStoreNames.contains('syllabi')) {
        const syllabusStore = db.createObjectStore('syllabi', { keyPath: 'id' })
        syllabusStore.createIndex('by-courseCode', 'courseCode')
        syllabusStore.createIndex('by-createdBy', 'createdBy')
        syllabusStore.createIndex('by-createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains('curricula')) {
        const curriculumStore = db.createObjectStore('curricula', { keyPath: 'id' })
        curriculumStore.createIndex('by-syllabusId', 'syllabusId')
        curriculumStore.createIndex('by-createdBy', 'createdBy')
        curriculumStore.createIndex('by-createdAt', 'createdAt')
      }

      if (!db.objectStoreNames.contains('lessons')) {
        const lessonStore = db.createObjectStore('lessons', { keyPath: 'id' })
        lessonStore.createIndex('by-curriculumId', 'curriculumId')
        lessonStore.createIndex('by-createdBy', 'createdBy')
        lessonStore.createIndex('by-week', 'week')
        lessonStore.createIndex('by-createdAt', 'createdAt')
      }
    },
  })
}

// Helper functions for generating IDs
export function generateSyllabusId(): string {
  return `syllabus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateCurriculumId(): string {
  return `curriculum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateLessonId(): string {
  return `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
