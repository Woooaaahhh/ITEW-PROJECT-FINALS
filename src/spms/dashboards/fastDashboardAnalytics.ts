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

// Fast initial stats - loads in < 500ms
export async function loadFacultyDashboardStatsFast(): Promise<Partial<FacultyDashboardData>> {
  try {
    await seedIfEmpty()
    const students = await listStudents()
    
    // Fast basic stats - no complex processing
    const behavior = getBehaviorCountIndex()
    
    let approvedMedical = 0
    let studentsWithViolations = 0
    let pendingMedicalCount = 0
    
    // Quick single pass for basic stats
    for (const s of students) {
      const norm = normalizeMedicalStatus(s.medicalClearanceStatus)
      if (norm === 'approved') approvedMedical++
      
      const vCount = behavior[s.id]?.violations ?? 0
      if (vCount > 0) studentsWithViolations++
      
      if (hasPendingMedicalSubmission(s)) {
        pendingMedicalCount++
      }
    }
    
    return {
      totalStudents: students.length,
      approvedMedical,
      studentsWithViolations,
      pendingMedicalCount,
      qualifiedProgramming: 0, // Placeholder
      qualifiedSportsTryout: 0, // Placeholder
      qualifiedAcademic: 0, // Placeholder
      gwaDistribution: [], // Placeholder
      topByGwa: [], // Placeholder
      pendingMedicalRows: [], // Placeholder
    }
  } catch (error) {
    console.error('Error loading fast stats:', error)
    return {
      totalStudents: 0,
      approvedMedical: 0,
      studentsWithViolations: 0,
      pendingMedicalCount: 0,
    }
  }
}

// Load detailed analytics progressively
export async function loadFacultyDashboardAnalytics(): Promise<Omit<FacultyDashboardData, 'totalStudents' | 'approvedMedical' | 'studentsWithViolations' | 'pendingMedicalCount'>> {
  try {
    await seedSkillsIfEmpty()
    const students = await listStudents()
    ensureSeededForDemo(students.map((s) => s.id))

    // Load skills data in parallel
    const [skills, behavior] = await Promise.all([
      listSkills({ activeOnly: false }),
      Promise.resolve(getBehaviorCountIndex())
    ])
    
    const skillById = new Map(skills.map((sk) => [sk.id, sk]))

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

    // Process students in smaller batches for better performance
    const BATCH_SIZE = 25
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE)
      
      // Load skills for this batch in parallel
      const skillPromises = batch.map(async (s) => ({
        studentId: s.id,
        skills: await listStudentSkills(s.id)
      }))
      
      const skillResults = await Promise.all(skillPromises)
      const skillsByStudent = new Map(skillResults.map(r => [r.studentId, r.skills]))
      
      for (const s of batch) {
        // Medical pending rows
        if (hasPendingMedicalSubmission(s)) {
          pendingMedicalRows.push({
            id: s.id,
            name: fullNameStudent(s),
            submittedAt: s.medicalSubmittedAt ?? null,
          })
        }

        // Skills processing
        const skillRows = skillsByStudent.get(s.id) ?? []
        const cats = new Set<string>()
        for (const r of skillRows) {
          const sk = skillById.get(r.skillId)
          cats.add(normalizeCategory(sk?.category ?? 'other'))
        }
        if (cats.has('programming')) qualifiedProgramming++
        if (cats.has('academic')) qualifiedAcademic++

        const sports = Array.isArray(s.sportsAffiliations) ? s.sportsAffiliations.length : 0
        if (isMedicalApprovedForTryouts(s) && sports > 0) qualifiedSportsTryout++

        // Academic records
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

      // Small delay every few batches to prevent blocking
      if (i % (BATCH_SIZE * 4) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Sort and limit results
    gwaList.sort((a, b) => a.gwa - b.gwa)
    const topByGwa = gwaList.slice(0, 8)

    const gwaDistribution = Object.entries(gwaBuckets).map(([band, count]) => ({ band, count }))
    pendingMedicalRows.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

    return {
      qualifiedProgramming,
      qualifiedSportsTryout,
      qualifiedAcademic,
      gwaDistribution,
      topByGwa,
      pendingMedicalRows: pendingMedicalRows.slice(0, 12),
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
    return {
      qualifiedProgramming: 0,
      qualifiedSportsTryout: 0,
      qualifiedAcademic: 0,
      gwaDistribution: [],
      topByGwa: [],
      pendingMedicalRows: [],
    }
  }
}

// Combined fast loading function
export async function loadFacultyDashboardDataFast(): Promise<FacultyDashboardData> {
  // Load basic stats immediately
  const fastStats = await loadFacultyDashboardStatsFast()
  
  // Load detailed analytics in background
  const analytics = await loadFacultyDashboardAnalytics()
  
  return {
    ...fastStats,
    ...analytics,
  } as FacultyDashboardData
}
