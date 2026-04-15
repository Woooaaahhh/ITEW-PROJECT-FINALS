import { openSpmsDb, nowIso, type Syllabus, type CurriculumUnit, type Lesson, type LessonAttachment } from './spmsDb'

export type { Syllabus, CurriculumUnit, Lesson, LessonAttachment }

function makeId() {
  return `SYL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function makeCurriculumId() {
  return `CUR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function makeLessonId() {
  return `LES-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function makeAttachmentId() {
  return `ATT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// SYLLABUS OPERATIONS
export async function createSyllabus(data: {
  title: string
  description?: string
  courseCode?: string
}): Promise<Syllabus> {
  const db = await openSpmsDb()
  const ts = nowIso()
  const syllabus: Syllabus = {
    id: makeId(),
    title: data.title,
    description: data.description ?? null,
    courseCode: data.courseCode ?? null,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.put('syllabi', syllabus)
  return syllabus
}

export async function listSyllabi(): Promise<Syllabus[]> {
  const db = await openSpmsDb()
  const all = await db.getAll('syllabi')
  return all
    .filter(s => !s.isArchived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getSyllabus(id: string): Promise<Syllabus | undefined> {
  const db = await openSpmsDb()
  const syllabus = await db.get('syllabi', id)
  return syllabus && !syllabus.isArchived ? syllabus : undefined
}

export async function updateSyllabus(id: string, data: {
  title?: string
  description?: string
  courseCode?: string
}): Promise<Syllabus | undefined> {
  const db = await openSpmsDb()
  const existing = await db.get('syllabi', id)
  if (!existing || existing.isArchived) return undefined
  
  const updated: Syllabus = {
    ...existing,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    courseCode: data.courseCode ?? existing.courseCode,
    updatedAt: nowIso(),
  }
  await db.put('syllabi', updated)
  return updated
}

export async function archiveSyllabus(id: string): Promise<boolean> {
  const db = await openSpmsDb()
  const existing = await db.get('syllabi', id)
  if (!existing) return false
  
  existing.isArchived = true
  existing.updatedAt = nowIso()
  await db.put('syllabi', existing)
  
  // Also archive all curriculum units and lessons in this syllabus
  const curriculumUnits = await db.getAllFromIndex('curriculumUnits', 'by-syllabusId', id)
  const lessons = await db.getAllFromIndex('lessons', 'by-syllabusId', id)
  
  const tx = db.transaction(['curriculumUnits', 'lessons'], 'readwrite')
  await Promise.all([
    ...curriculumUnits.map(unit => {
      unit.isArchived = true
      unit.updatedAt = nowIso()
      return tx.objectStore('curriculumUnits').put(unit)
    }),
    ...lessons.map(lesson => {
      lesson.isArchived = true
      lesson.updatedAt = nowIso()
      return tx.objectStore('lessons').put(lesson)
    })
  ])
  await tx.done
  
  return true
}

// CURRICULUM UNIT OPERATIONS
export async function createCurriculumUnit(data: {
  syllabusId: string
  title: string
  description?: string
  orderIndex?: number
}): Promise<CurriculumUnit> {
  const db = await openSpmsDb()
  const ts = nowIso()
  
  // Get the highest order index for this syllabus if not provided
  let orderIndex = data.orderIndex ?? 1
  if (data.orderIndex === undefined) {
    const units = await db.getAllFromIndex('curriculumUnits', 'by-syllabusId', data.syllabusId)
    const activeUnits = units.filter(u => !u.isArchived)
    if (activeUnits.length > 0) {
      orderIndex = Math.max(...activeUnits.map(u => u.orderIndex)) + 1
    }
  }
  
  const unit: CurriculumUnit = {
    id: makeCurriculumId(),
    syllabusId: data.syllabusId,
    title: data.title,
    description: data.description ?? null,
    orderIndex,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.put('curriculumUnits', unit)
  return unit
}

export async function listCurriculumUnits(syllabusId: string): Promise<CurriculumUnit[]> {
  const db = await openSpmsDb()
  const all = await db.getAllFromIndex('curriculumUnits', 'by-syllabusId', syllabusId)
  return all
    .filter(u => !u.isArchived)
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

export async function updateCurriculumUnit(id: string, data: {
  title?: string
  description?: string
  orderIndex?: number
}): Promise<CurriculumUnit | undefined> {
  const db = await openSpmsDb()
  const existing = await db.get('curriculumUnits', id)
  if (!existing || existing.isArchived) return undefined
  
  const updated: CurriculumUnit = {
    ...existing,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    orderIndex: data.orderIndex ?? existing.orderIndex,
    updatedAt: nowIso(),
  }
  await db.put('curriculumUnits', updated)
  return updated
}

export async function archiveCurriculumUnit(id: string): Promise<boolean> {
  const db = await openSpmsDb()
  const existing = await db.get('curriculumUnits', id)
  if (!existing) return false
  
  existing.isArchived = true
  existing.updatedAt = nowIso()
  await db.put('curriculumUnits', existing)
  
  // Also archive all lessons in this curriculum unit
  const lessons = await db.getAllFromIndex('lessons', 'by-curriculumUnitId', id)
  const tx = db.transaction('lessons', 'readwrite')
  await Promise.all(lessons.map(lesson => {
    lesson.isArchived = true
    lesson.updatedAt = nowIso()
    return tx.store.put(lesson)
  }))
  await tx.done
  
  return true
}

export async function updateCurriculumOrder(syllabusId: string, unitOrders: Array<{
  unitId: string
  orderIndex: number
}>): Promise<void> {
  const db = await openSpmsDb()
  const tx = db.transaction('curriculumUnits', 'readwrite')
  
  await Promise.all(unitOrders.map(async ({ unitId, orderIndex }) => {
    const unit = await tx.store.get(unitId)
    if (unit && !unit.isArchived) {
      unit.orderIndex = orderIndex
      unit.updatedAt = nowIso()
      return tx.store.put(unit)
    }
  }))
  
  await tx.done
}

// LESSON OPERATIONS
export async function createLesson(data: {
  syllabusId: string
  curriculumUnitId?: string
  title: string
  content?: string
  weekNumber?: number
  orderIndex?: number
}): Promise<Lesson> {
  const db = await openSpmsDb()
  const ts = nowIso()
  
  // Get the highest order index for this syllabus if not provided
  let orderIndex = data.orderIndex ?? 1
  if (data.orderIndex === undefined) {
    const lessons = await db.getAllFromIndex('lessons', 'by-syllabusId', data.syllabusId)
    const activeLessons = lessons.filter(l => !l.isArchived)
    if (activeLessons.length > 0) {
      orderIndex = Math.max(...activeLessons.map(l => l.orderIndex)) + 1
    }
  }
  
  const lesson: Lesson = {
    id: makeLessonId(),
    syllabusId: data.syllabusId,
    curriculumUnitId: data.curriculumUnitId ?? null,
    title: data.title,
    content: data.content ?? null,
    weekNumber: data.weekNumber ?? null,
    orderIndex,
    isArchived: false,
    attachments: [],
    createdAt: ts,
    updatedAt: ts,
  }
  await db.put('lessons', lesson)
  return lesson
}

export async function listLessons(syllabusId: string, curriculumUnitId?: string): Promise<Lesson[]> {
  const db = await openSpmsDb()
  let all: Lesson[]
  
  if (curriculumUnitId) {
    all = await db.getAllFromIndex('lessons', 'by-curriculumUnitId', curriculumUnitId)
  } else {
    all = await db.getAllFromIndex('lessons', 'by-syllabusId', syllabusId)
  }
  
  return all
    .filter(l => !l.isArchived)
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  const db = await openSpmsDb()
  const lesson = await db.get('lessons', id)
  return lesson && !lesson.isArchived ? lesson : undefined
}

export async function updateLesson(id: string, data: {
  title?: string
  content?: string
  curriculumUnitId?: string
  weekNumber?: number
  orderIndex?: number
}): Promise<Lesson | undefined> {
  const db = await openSpmsDb()
  const existing = await db.get('lessons', id)
  if (!existing || existing.isArchived) return undefined
  
  const updated: Lesson = {
    ...existing,
    title: data.title ?? existing.title,
    content: data.content ?? existing.content,
    curriculumUnitId: data.curriculumUnitId ?? existing.curriculumUnitId,
    weekNumber: data.weekNumber ?? existing.weekNumber,
    orderIndex: data.orderIndex ?? existing.orderIndex,
    updatedAt: nowIso(),
  }
  await db.put('lessons', updated)
  return updated
}

export async function archiveLesson(id: string): Promise<boolean> {
  const db = await openSpmsDb()
  const existing = await db.get('lessons', id)
  if (!existing) return false
  
  existing.isArchived = true
  existing.updatedAt = nowIso()
  await db.put('lessons', existing)
  return true
}

export async function updateLessonOrder(syllabusId: string, lessonOrders: Array<{
  lessonId: string
  orderIndex: number
}>): Promise<void> {
  const db = await openSpmsDb()
  const tx = db.transaction('lessons', 'readwrite')
  
  await Promise.all(lessonOrders.map(async ({ lessonId, orderIndex }) => {
    const lesson = await tx.store.get(lessonId)
    if (lesson && !lesson.isArchived) {
      lesson.orderIndex = orderIndex
      lesson.updatedAt = nowIso()
      return tx.store.put(lesson)
    }
  }))
  
  await tx.done
}

// FILE ATTACHMENT OPERATIONS
export async function addLessonAttachment(data: {
  lessonId: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
}): Promise<LessonAttachment> {
  const db = await openSpmsDb()
  const ts = nowIso()
  
  const attachment: LessonAttachment = {
    id: makeAttachmentId(),
    lessonId: data.lessonId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileUrl: data.fileUrl,
    uploadedAt: ts,
  }
  
  await db.put('lessonAttachments', attachment)
  
  // Update lesson to include this attachment
  const lesson = await db.get('lessons', data.lessonId)
  if (lesson && !lesson.isArchived) {
    lesson.attachments = [...(lesson.attachments || []), attachment]
    lesson.updatedAt = ts
    await db.put('lessons', lesson)
  }
  
  return attachment
}

export async function listLessonAttachments(lessonId: string): Promise<LessonAttachment[]> {
  const db = await openSpmsDb()
  const all = await db.getAllFromIndex('lessonAttachments', 'by-lessonId', lessonId)
  return all.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function removeLessonAttachment(attachmentId: string): Promise<boolean> {
  const db = await openSpmsDb()
  const attachment = await db.get('lessonAttachments', attachmentId)
  if (!attachment) return false
  
  await db.delete('lessonAttachments', attachmentId)
  
  // Remove from lesson's attachments array
  const lesson = await db.get('lessons', attachment.lessonId)
  if (lesson && lesson.attachments) {
    lesson.attachments = lesson.attachments.filter(a => a.id !== attachmentId)
    lesson.updatedAt = nowIso()
    await db.put('lessons', lesson)
  }
  
  return true
}

// COMPOSITE OPERATIONS
export async function getSyllabusWithDetails(syllabusId: string): Promise<{
  syllabus: Syllabus
  curriculumUnits: (CurriculumUnit & {
    lessons: Lesson[]
  })[]
  unassignedLessons: Lesson[]
}> {
  const syllabus = await getSyllabus(syllabusId)
  if (!syllabus) throw new Error('Syllabus not found')
  
  const curriculumUnits = await listCurriculumUnits(syllabusId)
  const lessons = await listLessons(syllabusId)
  
  const unitsWithLessons = await Promise.all(
    curriculumUnits.map(async (unit) => {
      const unitLessons = lessons.filter(l => l.curriculumUnitId === unit.id)
      return {
        ...unit,
        lessons: unitLessons
      }
    })
  )
  
  const unassignedLessons = lessons.filter(l => !l.curriculumUnitId)
  
  return {
    syllabus,
    curriculumUnits: unitsWithLessons,
    unassignedLessons
  }
}
