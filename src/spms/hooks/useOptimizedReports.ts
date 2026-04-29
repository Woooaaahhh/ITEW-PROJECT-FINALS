import { useCallback, useEffect, useState, useMemo } from 'react'
import { listStudents, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import { listSkills, listStudentSkills } from '../db/skills'
import { isMedicalApprovedForTryouts, normalizeMedicalStatus } from '../db/medicalClearance'

// Types for report optimization
export type ReportType = 'sports_tryout' | 'programming_contest' | 'no_violations' | 'specific_skill'

export interface EnrichedStudent {
  student: Student
  skillNames: string[]
  violationCount: number
  medicalStatus: string
}

export interface ReportFilters {
  search: string
  yearLevel: string
  section: string
  reportType: ReportType
  selectedSportId: string
  selectedSkillId: string
}

export interface ReportData {
  students: EnrichedStudent[]
  totalCount: number
  currentPage: number
  totalPages: number
  loading: boolean
  error: string | null
  hasMore: boolean
}

export interface ReportOptions {
  pageSize?: number
  enableCache?: boolean
  preloadData?: boolean
}

// Cache implementation for reports
class ReportCache {
  private cache = new Map<string, { data: any; timestamp: number; expiry: number }>()
  
  set(key: string, data: any, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    })
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const reportCache = new ReportCache()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Utility functions
function normalize(s: string): string {
  return s.toLowerCase().trim()
}

function fullName(s: Student): string {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

// Generate cache key for reports
function generateReportCacheKey(filters: ReportFilters, page: number, pageSize: number): string {
  const keyParts = [
    'report',
    filters.reportType,
    `page-${page}`,
    `size-${pageSize}`,
    filters.search && `search-${filters.search}`,
    filters.yearLevel && `year-${filters.yearLevel}`,
    filters.section && `section-${filters.section}`,
    filters.selectedSportId && `sport-${filters.selectedSportId}`,
    filters.selectedSkillId && `skill-${filters.selectedSkillId}`
  ].filter(Boolean)
  
  return keyParts.join(':')
}

// Optimized report data loading hook
export function useOptimizedReports(filters: ReportFilters, options: ReportOptions = {}) {
  const {
    pageSize = 20,
    enableCache = true
  } = options
  
  const [reportData, setReportData] = useState<ReportData>({
    students: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    loading: true,
    error: null,
    hasMore: false
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [lastLoadTime, setLastLoadTime] = useState(0)
  
  // Generate cache key
  const cacheKey = useMemo(() => 
    generateReportCacheKey(filters, currentPage, pageSize),
    [filters, currentPage, pageSize]
  )
  
  // Load basic student data with field selection
  const loadBasicStudentData = useCallback(async (): Promise<Student[]> => {
    try {
      const students = await listStudents()
      return students.map(student => ({
        ...student,
        // Only keep essential fields for initial load
        id: student.id,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        email: student.email,
        yearLevel: student.yearLevel,
        section: student.section,
        medicalClearanceStatus: student.medicalClearanceStatus,
        sportsAffiliations: student.sportsAffiliations
      }))
    } catch (error) {
      console.error('Failed to load student data:', error)
      throw error
    }
  }, [])
  
  // Load enriched student data in batches
  const loadEnrichedStudentData = useCallback(async (students: Student[]): Promise<EnrichedStudent[]> => {
    const BATCH_SIZE = 25
    const enrichedStudents: EnrichedStudent[] = []
    
    // Load skills data once
    const skills = await listSkills({ activeOnly: true })
    const skillNameById = new Map(skills.map((sk: any) => [sk.id, sk.name]))
    
    // Process students in batches to prevent blocking
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE)
      
      // Load skills and records for this batch in parallel
      const batchPromises = batch.map(async (student) => {
        const [assignedSkills, records] = await Promise.all([
          listStudentSkills(student.id),
          Promise.resolve(getStudentRecords(student.id))
        ])
        
        const skillNames = assignedSkills
          .map(row => skillNameById.get(row.skillId))
          .filter((name): name is string => Boolean(name))
        
        return {
          student,
          skillNames,
          violationCount: records.violations.length,
          medicalStatus: normalizeMedicalStatus(student.medicalClearanceStatus)
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      enrichedStudents.push(...batchResults)
      
      // Yield control to browser periodically
      if (i % (BATCH_SIZE * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    return enrichedStudents
  }, [])
  
  // Filter students based on report criteria
  const filterStudents = useCallback((enrichedStudents: EnrichedStudent[], filters: ReportFilters, skills: { id: string; name: string }[]): EnrichedStudent[] => {
    const q = normalize(filters.search)
    const y = normalize(filters.yearLevel)
    const sec = normalize(filters.section)
    
    return enrichedStudents.filter(({ student, skillNames, violationCount }) => {
      // Search filter
      const hitSearch = !q || 
        normalize(fullName(student)).includes(q) ||
        normalize(student.email || '').includes(q) ||
        normalize(student.id).includes(q)
      
      // Year level filter
      const hitYear = !y || normalize(student.yearLevel || '') === y
      
      // Section filter
      const hitSection = !sec || normalize(student.section || '') === sec
      
      // Report-specific filters
      let hitReport = true
      switch (filters.reportType) {
        case 'sports_tryout':
          const medicallyOk = isMedicalApprovedForTryouts(student)
          const inSport = filters.selectedSportId ? (student.sportsAffiliations ?? []).includes(filters.selectedSportId) : false
          hitReport = Boolean(filters.selectedSportId) && medicallyOk && inSport
          break
          
        case 'specific_skill':
          const selectedSkillName = skills.find((sk: any) => sk.id === filters.selectedSkillId)?.name ?? ''
          hitReport = !!filters.selectedSkillId && skillNames.includes(selectedSkillName)
          break
          
        case 'programming_contest':
          hitReport = skillNames.some(name => normalize(name).includes('programming'))
          break
          
        case 'no_violations':
          hitReport = violationCount === 0
          break
      }
      
      return hitSearch && hitYear && hitSection && hitReport
    })
  }, [])
  
  // Main data loading function
  const loadReportData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Check cache first
    if (enableCache && !forceRefresh) {
      const cached = reportCache.get(cacheKey)
      if (cached && (now - lastLoadTime) < CACHE_DURATION) {
        setReportData(cached)
        return
      }
    }
    
    setReportData(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Load basic student data first
      const students = await loadBasicStudentData()
      
      // Load skills data for filtering
      const skills = await listSkills({ activeOnly: true })
      
      // Load enriched data progressively
      const enrichedStudents = await loadEnrichedStudentData(students)
      
      // Apply filters
      const filteredStudents = filterStudents(enrichedStudents, filters, skills)
      
      // Calculate pagination
      const totalCount = filteredStudents.length
      const totalPages = Math.ceil(totalCount / pageSize)
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedStudents = filteredStudents.slice(startIndex, endIndex)
      
      const newReportData: ReportData = {
        students: paginatedStudents,
        totalCount,
        currentPage,
        totalPages,
        hasMore: currentPage < totalPages,
        loading: false,
        error: null
      }
      
      setReportData(newReportData)
      setLastLoadTime(now)
      
      // Cache the result
      if (enableCache) {
        reportCache.set(cacheKey, newReportData, CACHE_DURATION)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load report data'
      setReportData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [cacheKey, enableCache, lastLoadTime, currentPage, pageSize, filters, loadBasicStudentData, loadEnrichedStudentData, filterStudents])
  
  // Load data when dependencies change
  useEffect(() => {
    loadReportData()
  }, [loadReportData])
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.yearLevel, filters.section, filters.reportType, filters.selectedSportId, filters.selectedSkillId])
  
  // Refresh function
  const refresh = useCallback(() => {
    reportCache.clear()
    return loadReportData(true)
  }, [loadReportData])
  
  // Load more function
  const loadMore = useCallback(() => {
    if (reportData.hasMore && !reportData.loading) {
      setCurrentPage(prev => prev + 1)
    }
  }, [reportData.hasMore, reportData.loading])
  
  return {
    ...reportData,
    currentPage,
    setCurrentPage,
    refresh,
    loadMore
  }
}

// Export optimization utilities
export const exportUtils = {
  // Generate CSV export with progress tracking
  async exportToCSV(
    students: EnrichedStudent[],
    filename: string,
    reportType: ReportType,
    filters: ReportFilters,
    skills: { id: string; name: string }[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    
    const headers = reportType === 'sports_tryout'
      ? ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Medical clearance', 'Report status']
      : ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Contact', 'Violations', 'Skills', 'Report status']
    
    const csvRows = [headers.map(escape).join(',')]
    
    // Process students in batches for large exports
    const BATCH_SIZE = 50
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE)
      
      for (const enrichedStudent of batch) {
        const status = this.getReportStatus(enrichedStudent, reportType, filters, skills)
        const { student, skillNames, violationCount } = enrichedStudent
        
        const row = reportType === 'sports_tryout'
          ? [
              student.id,
              fullName(student),
              student.yearLevel || '',
              student.section || '',
              student.email || '',
              this.medicalStatusLabel(student.medicalClearanceStatus || ''),
              status.label
            ]
          : [
              student.id,
              fullName(student),
              student.yearLevel || '',
              student.section || '',
              student.email || '',
              student.contactNumber || '',
              String(violationCount),
              skillNames.join('; '),
              status.label
            ]
        
        csvRows.push(row.map(escape).join(','))
      }
      
      // Report progress
      if (onProgress) {
        const progress = Math.min(100, Math.round((i + BATCH_SIZE) / students.length * 100))
        onProgress(progress)
      }
      
      // Yield control to browser
      if (i % (BATCH_SIZE * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    const csv = csvRows.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    
    if (onProgress) onProgress(100)
  },
  
  // Helper functions for export
  getReportStatus: (enriched: EnrichedStudent, reportType: ReportType, filters: ReportFilters, skills: { id: string; name: string }[]) => {
    const { student, skillNames, violationCount } = enriched
    
    switch (reportType) {
      case 'sports_tryout':
        const medicallyOk = isMedicalApprovedForTryouts(student)
        const inSport = filters.selectedSportId ? (student.sportsAffiliations ?? []).includes(filters.selectedSportId) : false
        return medicallyOk && inSport
          ? { label: 'Eligible', badgeClass: 'text-bg-success' }
          : { label: 'Not Eligible', badgeClass: 'text-bg-danger' }
          
      case 'specific_skill':
        const selectedSkillName = skills.find((sk: any) => sk.id === filters.selectedSkillId)?.name ?? ''
        return skillNames.includes(selectedSkillName)
          ? { label: 'Matched', badgeClass: 'text-bg-success' }
          : { label: 'Not Matched', badgeClass: 'text-bg-danger' }
          
      case 'programming_contest':
        const matched = skillNames.some(name => normalize(name).includes('programming'))
        return matched
          ? { label: 'Qualified', badgeClass: 'text-bg-success' }
          : { label: 'Not Qualified', badgeClass: 'text-bg-danger' }
          
      case 'no_violations':
        return violationCount === 0
          ? { label: 'Cleared', badgeClass: 'text-bg-success' }
          : { label: 'Has Violations', badgeClass: 'text-bg-danger' }
          
      default:
        return { label: 'Unknown', badgeClass: 'text-bg-secondary' }
    }
  },
  
  medicalStatusLabel: (status: string) => {
    const normalized = normalizeMedicalStatus(status)
    switch (normalized) {
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'pending': return 'Pending'
      default: return 'Unknown'
    }
  }
}

// Cache management utilities
export const reportCacheUtils = {
  clear: () => reportCache.clear(),
  invalidate: (pattern: string) => reportCache.invalidate(pattern)
}
