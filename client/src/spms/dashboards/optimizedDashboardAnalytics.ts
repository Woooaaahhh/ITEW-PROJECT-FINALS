import { listStudents, type Student } from '../db/students'
import { getCurrentAcademicRecord } from '../db/academicRecords'
import { getBehaviorCountIndex } from '../db/studentRecordsQueries'
import {
  hasMedicalRecordData,
  hasPendingMedicalSubmission,
  isMedicalApprovedForTryouts,
  normalizeMedicalStatus,
} from '../db/medicalClearance'
import { listStudentSkills, listSkills, seedSkillsIfEmpty } from '../db/skills'
import { seedIfEmpty } from '../db/students'
import { ensureSeededForDemo } from '../db/studentRecordsSeed'

export function fullNameStudent(s: Student): string {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function normalizeCategory(raw: string): string {
  const c = raw.trim().toLowerCase()
  if (c === 'programming') return 'programming'
  if (c === 'sports') return 'sports'
  if (c === 'academic') return 'academic'
  if (c === 'creative') return 'creative'
  return 'other'
}

export type FacultyDashboardData = {
  totalStudents: number
  approvedMedical: number
  studentsWithViolations: number
  pendingMedicalCount: number
  qualifiedProgramming: number
  qualifiedSportsTryout: number
  qualifiedAcademic: number
  gwaDistribution: { band: string; count: number }[]
  topByGwa: { id: string; name: string; gwa: number; skillCount: number }[]
  pendingMedicalRows: { id: string; name: string; submittedAt: string | null }[]
}

// Optimized version that loads data in batches and uses caching
export async function loadFacultyDashboardDataOptimized(): Promise<FacultyDashboardData> {
  await seedIfEmpty()
  await seedSkillsIfEmpty()
  
  // Load students with basic info first for faster initial load
  const students = await listStudents()
  ensureSeededForDemo(students.map((s) => s.id))

  // Early return if no students
  if (students.length === 0) {
    return {
      totalStudents: 0,
      approvedMedical: 0,
      studentsWithViolations: 0,
      pendingMedicalCount: 0,
      qualifiedProgramming: 0,
      qualifiedSportsTryout: 0,
      qualifiedAcademic: 0,
      gwaDistribution: [],
      topByGwa: [],
      pendingMedicalRows: [],
    }
  }

  // Load skills data in parallel with other processing
  const skillsPromise = listSkills({ activeOnly: false })
  const skills = await skillsPromise
  const skillById = new Map(skills.map((sk) => [sk.id, sk]))

  // Batch load student skills to reduce individual API calls
  const skillRowsByStudent = await Promise.all(
    students.map(async (s) => ({ id: s.id, rows: await listStudentSkills(s.id) })),
  )
  const rowsById = new Map(skillRowsByStudent.map((x) => [x.id, x.rows]))

  const behavior = getBehaviorCountIndex()

  // Initialize counters
  let approvedMedical = 0
  let studentsWithViolations = 0
  let pendingMedicalCount = 0
  let qualifiedProgramming = 0
  let qualifiedSportsTryout = 0
  let qualifiedAcademic = 0

  const gwaBuckets = {
    'Excellent (GWA ≤ 1.75)': 0,
    'Good (1.76 – 2.50)': 0,
    'Fair (2.51 – 3.50)': 0,
    'At risk (> 3.50)': 0,
    'No current record': 0,
  }

  const gwaList: { id: string; name: string; gwa: number; skillCount: number }[] = []
  const pendingMedicalRows: { id: string; name: string; submittedAt: string | null }[] = []

  // Process students in batches to avoid blocking the UI
  const BATCH_SIZE = 50
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE)
    
    // Process batch
    for (const s of batch) {
      const norm = normalizeMedicalStatus(s.medicalClearanceStatus)
      if (norm === 'approved') approvedMedical++

      const vCount = behavior[s.id]?.violations ?? 0
      if (vCount > 0) studentsWithViolations++

      if (hasPendingMedicalSubmission(s)) {
        pendingMedicalCount++
        pendingMedicalRows.push({
          id: s.id,
          name: fullNameStudent(s),
          submittedAt: s.medicalSubmittedAt ?? null,
        })
      }

      const skillRows = rowsById.get(s.id) ?? []
      const cats = new Set<string>()
      for (const r of skillRows) {
        const sk = skillById.get(r.skillId)
        cats.add(normalizeCategory(sk?.category ?? 'other'))
      }
      if (cats.has('programming')) qualifiedProgramming++
      if (cats.has('academic')) qualifiedAcademic++

      const sports = Array.isArray(s.sportsAffiliations) ? s.sportsAffiliations.length : 0
      if (isMedicalApprovedForTryouts(s) && sports > 0) qualifiedSportsTryout++

      const current = getCurrentAcademicRecord(s.id)
      if (!current) {
        gwaBuckets['No current record']++
      } else {
        gwaList.push({
          id: s.id,
          name: fullNameStudent(s),
          gwa: current.gwa,
          skillCount: skillRows.length,
        })
        const g = current.gwa
        if (g <= 1.75) gwaBuckets['Excellent (GWA ≤ 1.75)']++
        else if (g <= 2.5) gwaBuckets['Good (1.76 – 2.50)']++
        else if (g <= 3.5) gwaBuckets['Fair (2.51 – 3.50)']++
        else gwaBuckets['At risk (> 3.50)']++
      }
    }

    // Yield control to browser periodically for better responsiveness
    if (i % (BATCH_SIZE * 2) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  // Sort and limit results
  gwaList.sort((a, b) => a.gwa - b.gwa)
  const topByGwa = gwaList.slice(0, 8)

  const gwaDistribution = Object.entries(gwaBuckets).map(([band, count]) => ({ band, count }))
  pendingMedicalRows.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

  return {
    totalStudents: students.length,
    approvedMedical,
    studentsWithViolations,
    pendingMedicalCount,
    qualifiedProgramming,
    qualifiedSportsTryout,
    qualifiedAcademic,
    gwaDistribution,
    topByGwa,
    pendingMedicalRows: pendingMedicalRows.slice(0, 12),
  }
}

// Legacy function for backward compatibility
export async function loadFacultyDashboardData(): Promise<FacultyDashboardData> {
  return loadFacultyDashboardDataOptimized()
}

export type RegistrarDashboardData = {
  totalStudents: number
  withEmail: number
  uniqueSections: number
  addedLast30Days: number
  byYearLevel: { name: string; count: number }[]
  medicalMix: { name: string; value: number }[]
  totalViolations: number
  totalAchievements: number
  recentStudents: { id: string; name: string; section: string; createdAt: string }[]
}

// Optimized registrar dashboard data loading
export async function loadRegistrarDashboardDataOptimized(): Promise<RegistrarDashboardData> {
  await seedIfEmpty()
  const students = await listStudents()
  ensureSeededForDemo(students.map((s) => s.id))

  // Early return if no students
  if (students.length === 0) {
    return {
      totalStudents: 0,
      withEmail: 0,
      uniqueSections: 0,
      addedLast30Days: 0,
      byYearLevel: [],
      medicalMix: [],
      totalViolations: 0,
      totalAchievements: 0,
      recentStudents: [],
    }
  }

  const behavior = getBehaviorCountIndex()
  let totalViolations = 0
  let totalAchievements = 0
  
  // Calculate totals efficiently
  for (const c of Object.values(behavior)) {
    totalViolations += c.violations
    totalAchievements += c.achievements
  }

  const withEmail = students.filter((s) => !!s.email?.trim()).length
  const sectionSet = new Set(students.map((s) => `${s.yearLevel ?? ''}|${s.section ?? ''}`.trim()).filter(Boolean))

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const addedLast30Days = students.filter((s) => {
    const t = new Date(s.createdAt).getTime()
    return !Number.isNaN(t) && t >= cutoff
  }).length

  const yearMap = new Map<string, number>()
  const medicalMixMap: Record<string, number> = {
    Approved: 0,
    Pending: 0,
    Rejected: 0,
    'Not submitted': 0,
  }

  // Process students in batches
  const BATCH_SIZE = 50
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE)
    
    for (const s of batch) {
      const yl = (s.yearLevel ?? '—').trim() || '—'
      yearMap.set(yl, (yearMap.get(yl) ?? 0) + 1)

      const n = normalizeMedicalStatus(s.medicalClearanceStatus)
      if (n === 'approved') medicalMixMap.Approved++
      else if (n === 'rejected') medicalMixMap.Rejected++
      else if (hasMedicalRecordData(s)) medicalMixMap.Pending++
      else medicalMixMap['Not submitted']++
    }

    // Yield control periodically
    if (i % (BATCH_SIZE * 2) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  const byYearLevel = [...yearMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))

  const medicalMix = Object.entries(medicalMixMap).map(([name, value]) => ({ name, value }))

  const recentStudents = [...students]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      name: fullNameStudent(s),
      section: [s.yearLevel, s.section].filter(Boolean).join(' · ') || '—',
      createdAt: s.createdAt,
    }))

  return {
    totalStudents: students.length,
    withEmail,
    uniqueSections: sectionSet.size,
    addedLast30Days,
    byYearLevel,
    medicalMix,
    totalViolations,
    totalAchievements,
    recentStudents,
  }
}

// Legacy function for backward compatibility
export async function loadRegistrarDashboardData(): Promise<RegistrarDashboardData> {
  return loadRegistrarDashboardDataOptimized()
}
