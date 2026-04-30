import { useCallback, useEffect, useState, useMemo } from 'react'
import { listStudents, type Student } from '../db/students'
import { getBehaviorCountIndex } from '../db/studentRecordsQueries'

// Types for optimized student data
export interface StudentBasicInfo {
  id: string
  firstName: string
  middleName: string
  lastName: string
  email: string | null
  yearLevel: string | null
  section: string | null
  createdAt: string
  updatedAt: string
}

export interface StudentDetailedInfo extends Student {
  // All student fields for detailed view
}

export interface PaginatedStudentsResult<T> {
  students: T[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasMore: boolean
  loading: boolean
  error: string | null
}

// Configuration
const DEFAULT_PAGE_SIZE = 25
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const BEHAVIOR_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

// Cache implementation
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    })
  }

  get<T>(key: string): T | null {
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

const globalCache = new DataCache()

// Optimized student data loading hooks
export function useOptimizedStudentList<T = StudentBasicInfo>(
  options: {
    page?: number
    pageSize?: number
    search?: string
    yearLevel?: string
    section?: string
    includeInactive?: boolean
    fields?: 'basic' | 'detailed'
    enableCache?: boolean
  } = {}
) {
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    search = '',
    yearLevel = '',
    section = '',
    includeInactive = false,
    fields = 'basic',
    enableCache = true
  } = options

  const [result, setResult] = useState<PaginatedStudentsResult<T>>({
    students: [],
    totalCount: 0,
    currentPage: page,
    totalPages: 0,
    hasMore: false,
    loading: true,
    error: null
  })

  const [lastFetchTime, setLastFetchTime] = useState(0)

  // Generate cache key
  const cacheKey = useMemo(() => {
    const parts = [
      'students',
      fields,
      `page-${page}`,
      `size-${pageSize}`,
      search && `search-${search}`,
      yearLevel && `year-${yearLevel}`,
      section && `section-${section}`,
      includeInactive && 'active'
    ].filter(Boolean).join(':')
    return parts
  }, [page, pageSize, search, yearLevel, section, includeInactive, fields])

  // Filter function
  const filterStudents = useCallback((students: Student[], query: string, year: string, sec: string) => {
    const normalize = (s: string) => s.toLowerCase().trim()
    const q = normalize(query)
    const y = normalize(year)
    const s = normalize(sec)

    return students.filter(student => {
      // Note: isActive field doesn't exist in Student type, so we skip this filter for now
      // if (!includeInactive && student.isActive === false) return false

      // Search filter
      if (q) {
        const searchable = [
          `${student.firstName} ${student.middleName || ''} ${student.lastName}`,
          student.email || '',
          student.id,
          student.yearLevel || '',
          student.section || ''
        ].map(normalize).join(' ')
        
        const tokens = q.split(/\s+/).filter(Boolean)
        if (!tokens.every(token => searchable.includes(token))) return false
      }

      // Year level filter
      if (y && normalize(student.yearLevel || '') !== y) return false

      // Section filter
      if (s && normalize(student.section || '') !== s) return false

      return true
    })
  }, [includeInactive])

  // Transform student data based on fields requirement
  const transformStudent = useCallback((student: Student): T => {
    if (fields === 'basic') {
      return {
        id: student.id,
        firstName: student.firstName,
        middleName: student.middleName || '',
        lastName: student.lastName,
        email: student.email || null,
        yearLevel: student.yearLevel || null,
        section: student.section || null,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      } as T
    }
    return student as T
  }, [fields])

  // Load students function
  const loadStudents = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // Check cache first (unless force refresh)
    if (enableCache && !forceRefresh) {
      const cached = globalCache.get<PaginatedStudentsResult<T>>(cacheKey)
      if (cached && (now - lastFetchTime) < CACHE_DURATION) {
        setResult(cached)
        return
      }
    }

    setResult(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Load all students (API handles field selection)
      const allStudents = await listStudents()
      
      // Apply filters
      const filtered = filterStudents(allStudents, search, yearLevel, section)
      
      // Sort by last name, then first name
      filtered.sort((a, b) => 
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
      )

      // Calculate pagination
      const totalCount = filtered.length
      const totalPages = Math.ceil(totalCount / pageSize)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedStudents = filtered.slice(startIndex, endIndex)

      // Transform data
      const transformedStudents = paginatedStudents.map(transformStudent)

      const newResult: PaginatedStudentsResult<T> = {
        students: transformedStudents,
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
        loading: false,
        error: null
      }

      setResult(newResult)
      setLastFetchTime(now)

      // Cache the result
      if (enableCache) {
        globalCache.set(cacheKey, newResult, CACHE_DURATION)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load students'
      setResult(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }))
    }
  }, [cacheKey, enableCache, fields, filterStudents, lastFetchTime, page, pageSize, search, section, transformStudent, yearLevel])

  // Initial load and refresh on dependency changes
  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  // Refresh function
  const refresh = useCallback(() => {
    globalCache.invalidate('students')
    return loadStudents(true)
  }, [loadStudents])

  return {
    ...result,
    refresh,
    loadMore: useCallback(() => {
      if (result.hasMore && !result.loading) {
        return loadStudents()
      }
    }, [result.hasMore, result.loading, loadStudents])
  }
}

// Optimized behavior counts hook
export function useOptimizedBehaviorCounts(studentIds: string[]) {
  const [counts, setCounts] = useState<Record<string, { violations: number; achievements: number }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = `behavior-counts-${studentIds.join(',')}`

  useEffect(() => {
    const loadBehaviorCounts = async () => {
      // Check cache first
      const cached = globalCache.get<Record<string, { violations: number; achievements: number }>>(cacheKey)
      if (cached) {
        setCounts(cached)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const behaviorIndex = getBehaviorCountIndex()
        const filteredCounts: Record<string, { violations: number; achievements: number }> = {}
        
        for (const id of studentIds) {
          filteredCounts[id] = behaviorIndex[id] || { violations: 0, achievements: 0 }
        }

        setCounts(filteredCounts)
        globalCache.set(cacheKey, filteredCounts, BEHAVIOR_CACHE_DURATION)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load behavior counts')
      } finally {
        setLoading(false)
      }
    }

    if (studentIds.length > 0) {
      loadBehaviorCounts()
    }
  }, [cacheKey, studentIds])

  return { counts, loading, error }
}

// Utility functions
export function clearStudentDataCache(): void {
  globalCache.clear()
}

export function invalidateStudentCache(pattern?: string): void {
  if (pattern) {
    globalCache.invalidate(pattern)
  } else {
    globalCache.invalidate('students')
  }
}

// Export types for use in components
export type { Student }
