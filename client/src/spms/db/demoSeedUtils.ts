export const BULK_DEMO_STUDENT_COUNT = 1000

export const CORE_DEMO_STUDENT_IDS = {
  alyssa: 'S-seed-alyssa-santos',
  jerome: 'S-seed-jerome-reyes',
  demo: 'S-seed-student-demo',
} as const

export const BULK_DEMO_STUDENT_PREFIX = 'S-seed-bulk-'

export function bulkDemoStudentId(index: number) {
  return `${BULK_DEMO_STUDENT_PREFIX}${String(index).padStart(4, '0')}`
}

export function buildAllSeedDemoStudentIds() {
  const ids: string[] = [CORE_DEMO_STUDENT_IDS.alyssa, CORE_DEMO_STUDENT_IDS.jerome, CORE_DEMO_STUDENT_IDS.demo]
  for (let index = 1; index <= BULK_DEMO_STUDENT_COUNT; index += 1) {
    ids.push(bulkDemoStudentId(index))
  }
  return ids
}

export function isSeedDemoStudentId(studentId: string) {
  return studentId === CORE_DEMO_STUDENT_IDS.alyssa ||
    studentId === CORE_DEMO_STUDENT_IDS.jerome ||
    studentId === CORE_DEMO_STUDENT_IDS.demo ||
    studentId.startsWith(BULK_DEMO_STUDENT_PREFIX)
}
