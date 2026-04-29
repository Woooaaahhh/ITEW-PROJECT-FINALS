import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../auth/AuthContext'

// Enhanced TypeScript interfaces with better type safety
interface SyllabusRow {
  syllabus_id: number
  title: string
  description?: string
  course_code?: string
  faculty_user_id?: number | null
  faculty_name?: string | null
  is_archived?: number
  created_at?: string
}

interface LessonRow {
  lesson_id: number
  syllabus_id: number
  title: string
  content?: string
  curriculum_unit?: string
  week_number?: number | null
  order_index: number
  is_archived?: number
  created_at?: string
}

interface FacultyRow {
  user_id: number
  username: string
  faculty_type?: string | null
}

// Modern UI Components
const SearchInput = ({ value, onChange, placeholder, disabled }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) => (
  <div className="position-relative">
    <i className="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted" />
    <input
      type="text"
      className="form-control ps-5"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  </div>
)

const StatusBadge = ({ status, children }: { status: 'success' | 'warning' | 'info' | 'danger', children: React.ReactNode }) => {
  const variants = {
    success: 'bg-success-subtle text-success border border-success-subtle',
    warning: 'bg-warning-subtle text-warning border border-warning-subtle',
    info: 'bg-info-subtle text-info border border-info-subtle',
    danger: 'bg-danger-subtle text-danger border border-danger-subtle'
  }
  return <span className={`badge rounded-pill px-3 py-2 ${variants[status]}`}>{children}</span>
}

const LoadingSpinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <div className={`spinner-border spinner-border-${size} text-primary me-2`} role="status">
    <span className="visually-hidden">Loading...</span>
  </div>
)

// Main Component
export function InstructionModulePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isFaculty = user?.role === 'faculty'
  const isStudent = user?.role === 'student'
  
  // Enhanced permission logic for faculty-specific access control
  const canEditSyllabus = isAdmin && !isStudent      // Admin only can create/edit syllabus
  const canEditLessons = isFaculty && !isStudent     // Faculty only can create/edit lessons
  const canAssignCourseFaculty = isAdmin && !isStudent // Only admin can assign faculty to syllabus
  
    
  
  const canManageLessons = (syllabus: SyllabusRow) => {
    if (isAdmin) return true
    if (isFaculty) return syllabus.faculty_user_id === currentFacultyId
    if (isStudent) return false // Students can't manage lessons
    return false
  }
  
    
  // Enhanced state management with better organization
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [syllabi, setSyllabi] = useState<SyllabusRow[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [faculty, setFaculty] = useState<FacultyRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  
  // Modal states for better UX
  const [showSyllabusModal, setShowSyllabusModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingSyllabus, setEditingSyllabus] = useState<SyllabusRow | null>(null)
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null)
  
  // Form states with better validation
  const [newSyllabus, setNewSyllabus] = useState({ 
    title: '', 
    course_code: '', 
    description: '', 
    faculty_user_id: '' 
  })
  const [newLesson, setNewLesson] = useState({ 
    title: '', 
    curriculum_unit: '', 
    week_number: '', 
    content: '' 
  })
  const [selectedFacultyUserId, setSelectedFacultyUserId] = useState('')
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Refs for accessibility
  const syllabusListRef = useRef<HTMLDivElement>(null)
  const lessonTableRef = useRef<HTMLTableElement>(null)

  // Memoized selectors for performance
  const selectedSyllabus = useMemo(
    () => syllabi.find((row) => row.syllabus_id === selectedId) ?? null,
    [syllabi, selectedId],
  )
  
  const facultyNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const f of faculty) map.set(f.user_id, f.username)
    return map
  }, [faculty])

  // Get current faculty ID by matching username from faculty list
  const currentFacultyId = useMemo(() => {
    if (!isFaculty || !user?.name || faculty.length === 0) return null
    
    const currentFaculty = faculty.find(f => f.username === user.name)
    return currentFaculty ? currentFaculty.user_id : null
  }, [isFaculty, user?.name, faculty])

  // Enhanced filtering with search and faculty-specific access control
  const filteredSyllabi = useMemo(() => {
    let filtered = syllabi
    
    // Faculty-specific access control: Only show syllabi assigned to current faculty
    if (isFaculty && currentFacultyId) {
      filtered = filtered.filter(syllabus => syllabus.faculty_user_id === currentFacultyId)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(syllabus => 
        syllabus.title.toLowerCase().includes(query) ||
        syllabus.course_code?.toLowerCase().includes(query) ||
        syllabus.description?.toLowerCase().includes(query) ||
        syllabus.faculty_name?.toLowerCase().includes(query)
      )
    }
    
    // For admin, maintain the existing filter functionality
    if (isAdmin) {
      if (selectedFilter === 'assigned') {
        filtered = filtered.filter(syllabus => syllabus.faculty_user_id)
      } else if (selectedFilter === 'unassigned') {
        filtered = filtered.filter(syllabus => !syllabus.faculty_user_id)
      }
    }
    
    return filtered.sort((a, b) => a.title.localeCompare(b.title))
  }, [syllabi, searchQuery, selectedFilter, isFaculty, currentFacultyId, isAdmin])

  // Enhanced API calls with better error handling
  const fetchSyllabi = useCallback(async () => {
    try {
      const res = await axios.get<{ syllabi: SyllabusRow[] }>('/api/instruction/syllabi')
      const rows = res.data.syllabi ?? []
      setSyllabi(rows)
      
      // Handle initial selection with faculty access control
      if (!selectedId && rows.length > 0) {
        // For faculty, select the first syllabus assigned to them
        if (isFaculty && currentFacultyId) {
          const facultySyllabi = rows.filter(syllabus => syllabus.faculty_user_id === currentFacultyId)
          if (facultySyllabi.length > 0) {
            setSelectedId(facultySyllabi[0].syllabus_id)
          } else {
            setAccessDenied(true)
          }
        } else if (isStudent) {
          // For students, select the first syllabus (they can view all)
          if (rows.length > 0) {
            setSelectedId(rows[0].syllabus_id)
          }
        } else {
          // For admin, select the first syllabus
          setSelectedId(rows[0].syllabus_id)
        }
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      throw new Error(msg || 'Failed to load syllabi.')
    }
  }, [selectedId, isFaculty, isStudent, currentFacultyId])

  const fetchLessons = useCallback(async (syllabusId: number) => {
    try {
      const res = await axios.get<{ lessons: LessonRow[] }>(`/api/instruction/syllabi/${syllabusId}/lessons`)
      const lessons = res.data.lessons ?? []
      setLessons(lessons.sort((a, b) => a.order_index - b.order_index))
      setHasUnsavedChanges(false)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      throw new Error(msg || 'Failed to load lessons.')
    }
  }, [])

  const fetchFaculty = useCallback(async () => {
    try {
      const res = await axios.get<{ faculty: FacultyRow[] }>('/api/scheduling/faculty')
      setFaculty(res.data.faculty ?? [])
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      throw new Error(msg || 'Failed to load faculty list.')
    }
  }, [])

  // Enhanced loading function
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setAccessDenied(false)
    try {
      await Promise.all([fetchSyllabi(), fetchFaculty()])
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, []) // Remove dependencies to prevent infinite loops

  // Load data on mount
  useEffect(() => {
    loadAll()
  }, []) // Only run once on mount

  // Handle syllabus selection access control
  useEffect(() => {
    if (selectedId && selectedSyllabus) {
      // Wait for user and faculty data to load before checking access
      if (!user || (isFaculty && !currentFacultyId)) {
        // Data still loading, don't make access decision yet
        return
      }
      
      // Check if current user has access to the selected syllabus (inline logic to avoid infinite loop)
      const hasAccess = isAdmin || (isFaculty && selectedSyllabus.faculty_user_id === currentFacultyId) || isStudent
      
      if (!hasAccess) {
        setAccessDenied(true)
        setSelectedId(null)
        setLessons([])
      } else {
        setAccessDenied(false)
        // Load lessons if user has access
        fetchLessons(selectedId).catch((err) => {
          console.error('Failed to load lessons:', err)
          setError('Failed to load lessons.')
        })
      }
    } else {
      setLessons([])
    }
  }, [selectedId, selectedSyllabus, isAdmin, isFaculty, isStudent, currentFacultyId, fetchLessons, user])

  useEffect(() => {
    if (!selectedSyllabus) {
      setSelectedFacultyUserId('')
      return
    }
    setSelectedFacultyUserId(selectedSyllabus.faculty_user_id ? String(selectedSyllabus.faculty_user_id) : '')
  }, [selectedSyllabus?.syllabus_id, selectedSyllabus?.faculty_user_id])

  // Enhanced CRUD operations with better validation and UX
  const createSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEditSyllabus) return
    
    setError(null)
    setSuccess(null)
    
    // Enhanced validation
    if (!newSyllabus.title.trim()) {
      setError('Syllabus title is required.')
      return
    }
    
    if (newSyllabus.title.trim().length < 3) {
      setError('Syllabus title must be at least 3 characters long.')
      return
    }
    
    setSubmitting(true)
    try {
      await axios.post('/api/instruction/syllabi', {
        title: newSyllabus.title.trim(),
        course_code: newSyllabus.course_code.trim(),
        description: newSyllabus.description.trim(),
        faculty_user_id: canAssignCourseFaculty
          ? (newSyllabus.faculty_user_id ? Number(newSyllabus.faculty_user_id) : null)
          : undefined,
      })
      
      // Reset form
      setNewSyllabus({ title: '', course_code: '', description: '', faculty_user_id: '' })
      setShowSyllabusModal(false)
      await fetchSyllabi()
      setSuccess('Syllabus created successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const createLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEditLessons || !selectedId || !selectedSyllabus) return
    
    // Faculty ownership verification
    if (isFaculty && !canManageLessons(selectedSyllabus)) {
      setError('You do not have permission to create lessons for this syllabus.')
      return
    }
    
    setError(null)
    setSuccess(null)
    
    if (!newLesson.title.trim()) {
      setError('Lesson title is required.')
      return
    }
    
    if (newLesson.title.trim().length < 3) {
      setError('Lesson title must be at least 3 characters long.')
      return
    }
    
    const weekNumber = newLesson.week_number ? Number(newLesson.week_number) : null
    if (weekNumber && (weekNumber < 1 || weekNumber > 52)) {
      setError('Week number must be between 1 and 52.')
      return
    }
    
    setSubmitting(true)
    try {
      await axios.post('/api/instruction/lessons', {
        syllabus_id: selectedId,
        title: newLesson.title.trim(),
        curriculum_unit: newLesson.curriculum_unit.trim(),
        week_number: weekNumber,
        content: newLesson.content.trim(),
      })
      
      // Reset form
      setNewLesson({ title: '', curriculum_unit: '', week_number: '', content: '' })
      setShowLessonModal(false)
      await fetchLessons(selectedId)
      setSuccess('Lesson created successfully!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to create lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveCurriculum = async () => {
    if (!canEditLessons || !selectedId || !selectedSyllabus) return
    
    // Faculty ownership verification
    if (isFaculty && !canManageLessons(selectedSyllabus)) {
      setError('You do not have permission to manage lessons for this syllabus.')
      return
    }
    
    setSubmitting(true)
    setError(null)
    try {
      await axios.put(`/api/instruction/syllabi/${selectedId}/curriculum`, {
        lessons: lessons.map((row, idx) => ({
          lesson_id: row.lesson_id,
          order_index: idx + 1,
          curriculum_unit: row.curriculum_unit ?? '',
          week_number: row.week_number ?? null,
        })),
      })
      await fetchLessons(selectedId)
      setSuccess('Curriculum order saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to save curriculum order.')
    } finally {
      setSubmitting(false)
    }
  }

  // Enhanced drag and drop functionality
  const moveLesson = useCallback((lessonId: number, dir: -1 | 1) => {
    setLessons((prev) => {
      const idx = prev.findIndex((x) => x.lesson_id === lessonId)
      if (idx < 0) return prev
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, item)
      const reordered = copy.map((row, i) => ({ ...row, order_index: i + 1 }))
      setHasUnsavedChanges(true)
      return reordered
    })
  }, [])

  // Keyboard navigation support
  const handleKeyDown = useCallback((e: React.KeyboardEvent, lessonId: number, index: number) => {
    if (!canEditLessons) return
    
    switch (e.key) {
      case 'ArrowUp':
        if (index > 0) {
          e.preventDefault()
          moveLesson(lessonId, -1)
        }
        break
      case 'ArrowDown':
        if (index < lessons.length - 1) {
          e.preventDefault()
          moveLesson(lessonId, 1)
        }
        break
      case 'e':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const lesson = lessons[index]
          setEditingLesson(lesson)
        }
        break
    }
  }, [canEditLessons, lessons, moveLesson])

  // Enhanced delete operations with better confirmation
  const archiveSyllabus = async () => {
    if (!canEditSyllabus || !selectedSyllabus) return
    
    const lessonCount = lessons.length
    const confirmMessage = lessonCount > 0 
      ? `Archive "${selectedSyllabus.title}" and its ${lessonCount} lesson${lessonCount > 1 ? 's' : ''}? This action cannot be undone.`
      : `Archive "${selectedSyllabus.title}"?`
    
    if (!window.confirm(confirmMessage)) return
    
    setSubmitting(true)
    try {
      await axios.delete(`/api/instruction/syllabi/${selectedSyllabus.syllabus_id}`)
      setSelectedId(null)
      await fetchSyllabi()
      setSuccess('Syllabus archived successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to archive syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const archiveLesson = async (lessonId: number) => {
    const lesson = lessons.find(l => l.lesson_id === lessonId)
    if (!lesson || !canEditLessons || !selectedSyllabus) return
    
    // Faculty ownership verification
    if (isFaculty && !canManageLessons(selectedSyllabus)) {
      setError('You do not have permission to manage lessons for this syllabus.')
      return
    }
    
    if (!window.confirm(`Archive lesson "${lesson.title}"? This action cannot be undone.`)) return
    
    setSubmitting(true)
    try {
      await axios.delete(`/api/instruction/lessons/${lessonId}`)
      await fetchLessons(selectedId!)
      setSuccess('Lesson archived successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to archive lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  // Enhanced edit operations with modal support
  const editSyllabus = (syllabus: SyllabusRow) => {
    setEditingSyllabus(syllabus)
    setNewSyllabus({
      title: syllabus.title,
      course_code: syllabus.course_code || '',
      description: syllabus.description || '',
      faculty_user_id: syllabus.faculty_user_id ? String(syllabus.faculty_user_id) : ''
    })
    setShowSyllabusModal(true)
  }

  const updateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSyllabus || !canEditSyllabus) return
    
    setError(null)
    if (!newSyllabus.title.trim()) {
      setError('Syllabus title is required.')
      return
    }
    
    setSubmitting(true)
    try {
      await axios.put(`/api/instruction/syllabi/${editingSyllabus.syllabus_id}`, {
        title: newSyllabus.title.trim(),
        course_code: newSyllabus.course_code.trim(),
        description: newSyllabus.description.trim(),
      })
      
      setShowSyllabusModal(false)
      setEditingSyllabus(null)
      setNewSyllabus({ title: '', course_code: '', description: '', faculty_user_id: '' })
      await fetchSyllabi()
      setSuccess('Syllabus updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update syllabus.')
    } finally {
      setSubmitting(false)
    }
  }

  const editLesson = (lesson: LessonRow) => {
    setEditingLesson(lesson)
    setNewLesson({
      title: lesson.title,
      curriculum_unit: lesson.curriculum_unit || '',
      week_number: lesson.week_number ? String(lesson.week_number) : '',
      content: lesson.content || ''
    })
    setShowLessonModal(true)
  }

  const updateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson || !canEditLessons || !selectedSyllabus) return
    
    // Faculty ownership verification
    if (isFaculty && !canManageLessons(selectedSyllabus)) {
      setError('You do not have permission to manage lessons for this syllabus.')
      return
    }
    
    setError(null)
    if (!newLesson.title.trim()) {
      setError('Lesson title is required.')
      return
    }
    
    const weekNumber = newLesson.week_number ? Number(newLesson.week_number) : null
    if (weekNumber && (weekNumber < 1 || weekNumber > 52)) {
      setError('Week number must be between 1 and 52.')
      return
    }
    
    setSubmitting(true)
    try {
      await axios.put(`/api/instruction/lessons/${editingLesson.lesson_id}`, {
        title: newLesson.title.trim(),
        curriculum_unit: newLesson.curriculum_unit.trim(),
        week_number: weekNumber,
        content: newLesson.content.trim(),
      })
      
      setShowLessonModal(false)
      setEditingLesson(null)
      setNewLesson({ title: '', curriculum_unit: '', week_number: '', content: '' })
      if (selectedId) await fetchLessons(selectedId)
      setSuccess('Lesson updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to update lesson.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveAssignedFaculty = async () => {
    if (!canAssignCourseFaculty || !selectedSyllabus) return
    
    setSubmitting(true)
    setError(null)
    try {
      await axios.put(`/api/instruction/syllabi/${selectedSyllabus.syllabus_id}`, {
        faculty_user_id: selectedFacultyUserId ? Number(selectedFacultyUserId) : null,
      })
      await fetchSyllabi()
      setSuccess('Faculty assignment updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined
      setError(msg || 'Failed to assign faculty.')
    } finally {
      setSubmitting(false)
    }
  }

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <div className="instruction-module">
      {/* Header with enhanced UX */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Instruction Module</h2>
          <p className="text-muted mb-0">Manage syllabi, lessons, and curriculum content</p>
        </div>
        {canEditSyllabus && (
          <button 
            className="btn btn-outline-primary rounded-3 d-flex align-items-center gap-2"
            onClick={() => setShowSyllabusModal(true)}
            disabled={submitting}
          >
            <i className="bi bi-plus-circle" />
            New Syllabus
          </button>
        )}
        {canEditLessons && selectedId && (
          <button 
            className="btn btn-outline-success rounded-3 d-flex align-items-center gap-2"
            onClick={() => setShowLessonModal(true)}
            disabled={submitting}
          >
            <i className="bi bi-plus-circle" />
            New Lesson
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2" />
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)} />
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-circle me-2" />
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}
      {accessDenied && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          <i className="bi bi-shield-exclamation me-2" />
          <strong>Access Denied:</strong> You don't have permission to view this syllabus. Please contact an administrator if you need access.
          <button type="button" className="btn-close" onClick={() => setAccessDenied(false)} />
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />
          <div className="flex-grow-1">
            You have unsaved changes to the curriculum order.
          </div>
          <button 
            className="btn btn-warning btn-sm rounded-3"
            onClick={saveCurriculum}
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner /> : null}
            Save Changes
          </button>
        </div>
      )}

      <div className="row g-4">
        {/* Enhanced Syllabus Panel */}
        <div className="col-12 col-xl-4">
          <div className="spms-card card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header border-0 bg-transparent">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-semibold mb-0">Syllabi</h6>
                <span className="badge bg-primary-subtle text-primary rounded-pill">
                  {filteredSyllabi.length} {filteredSyllabi.length === 1 ? 'syllabus' : 'syllabi'}
                </span>
              </div>
            </div>
            <div className="card-body">
              {/* Search and Filters */}
              <div className="mb-3">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search syllabi..."
                  disabled={loading}
                />
              </div>
              
              {canAssignCourseFaculty && (
                <div className="mb-3">
                  <select 
                    className="form-select form-select-sm"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as any)}
                    disabled={loading}
                  >
                    <option value="all">All Syllabi</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>
              )}

              {/* Syllabus List */}
              <div className="syllabus-list" ref={syllabusListRef}>
                {loading ? (
                  <div className="text-center py-4">
                    <LoadingSpinner size="md" />
                    <div className="text-muted mt-2">Loading syllabi...</div>
                  </div>
                ) : filteredSyllabi.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted fs-2" />
                    <div className="text-muted mt-2">
                      {searchQuery || selectedFilter !== 'all' ? 'No syllabi match your filters.' : 'No syllabi available yet.'}
                    </div>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredSyllabi.map((syllabus) => (
                      <button
                        key={syllabus.syllabus_id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                          syllabus.syllabus_id === selectedId ? 'active' : ''
                        }`}
                        onClick={() => setSelectedId(syllabus.syllabus_id)}
                        aria-pressed={syllabus.syllabus_id === selectedId}
                      >
                        <div className="text-start">
                          <div className="fw-semibold">{syllabus.title}</div>
                          {syllabus.course_code && (
                            <div className="small text-muted">{syllabus.course_code}</div>
                          )}
                          <div className="small text-muted mt-1">
                            <i className="bi bi-person me-1" />
                            {syllabus.faculty_name || 
                             (syllabus.faculty_user_id ? (facultyNameById.get(syllabus.faculty_user_id) ?? `#${syllabus.faculty_user_id}`) : 'Unassigned')}
                          </div>
                        </div>
                        <div className="d-flex flex-column align-items-end">
                          {syllabus.faculty_user_id && (
                            <StatusBadge status="success">
                              <i className="bi bi-check-circle me-1" />
                              Assigned
                            </StatusBadge>
                          )}
                          {syllabus.syllabus_id === selectedId && (
                            <div className="small text-primary mt-1">
                              <i className="bi bi-check-circle-fill" /> Selected
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Syllabus Actions */}
              {selectedSyllabus && canEditSyllabus && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-secondary btn-sm rounded-3 flex-fill"
                      onClick={() => editSyllabus(selectedSyllabus)}
                      disabled={submitting}
                    >
                      <i className="bi bi-pencil me-1" />
                      Edit
                    </button>
                    <button 
                      className="btn btn-outline-warning btn-sm rounded-3 flex-fill"
                      onClick={archiveSyllabus}
                      disabled={submitting}
                    >
                      <i className="bi bi-archive me-1" />
                      Archive
                    </button>
                  </div>
                </div>
              )}

              {/* Faculty Assignment */}
              {canAssignCourseFaculty && selectedSyllabus && (
                <div className="mt-3 pt-3 border-top">
                  <div className="small fw-semibold mb-2">Assign Faculty</div>
                  <div className="d-flex gap-2">
                    <select 
                      className="form-select form-select-sm"
                      value={selectedFacultyUserId}
                      onChange={(e) => setSelectedFacultyUserId(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="">Unassigned</option>
                      {faculty.map((f) => (
                        <option key={f.user_id} value={String(f.user_id)}>
                          {f.username} ({f.faculty_type ?? 'Faculty'})
                        </option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-primary btn-sm rounded-3"
                      onClick={saveAssignedFaculty}
                      disabled={submitting}
                    >
                      {submitting ? <LoadingSpinner /> : null}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Lessons Panel */}
        <div className="col-12 col-xl-8">
          <div className="spms-card card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header border-0 bg-transparent">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="fw-semibold mb-1">Lessons & Curriculum</h6>
                  {selectedSyllabus ? (
                    <p className="text-muted small mb-0">
                      {selectedSyllabus.title}
                      {selectedSyllabus.course_code && ` (${selectedSyllabus.course_code})`}
                      {selectedSyllabus.description && ` - ${selectedSyllabus.description}`}
                    </p>
                  ) : (
                    <p className="text-muted small mb-0">Select a syllabus to view lessons</p>
                  )}
                </div>
                {selectedId && (
                  <span className="badge bg-info-subtle text-info rounded-pill">
                    {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="card-body">
              {!selectedId ? (
                <div className="text-center py-5">
                  <i className="bi bi-journal-bookmark text-muted fs-1" />
                  <div className="text-muted mt-3">Select a syllabus to view and manage lessons</div>
                </div>
              ) : (
                <>
                  {/* Curriculum Actions */}
                  {canEditLessons && (
                    <div className="mb-3">
                      <button 
                        className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
                        onClick={saveCurriculum}
                        disabled={submitting || !hasUnsavedChanges}
                      >
                        {submitting ? <LoadingSpinner /> : null}
                        <i className="bi bi-save" />
                        Save Curriculum Order
                      </button>
                    </div>
                  )}

                  {/* Enhanced Lessons Table */}
                  <div className="table-responsive">
                    <table className="table table-hover align-middle" ref={lessonTableRef}>
                      <thead>
                        <tr className="small text-muted text-uppercase">
                          <th style={{width: '60px'}}>Order</th>
                          <th>Lesson</th>
                          <th>Curriculum Unit</th>
                          <th style={{width: '80px'}}>Week</th>
                          <th>Content Preview</th>
                          {canEditLessons && <th style={{width: '120px'}} className="text-end">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {lessons.length === 0 ? (
                          <tr>
                            <td colSpan={canEditLessons ? 6 : 5} className="text-center py-4">
                              <i className="bi bi-journal text-muted fs-3 d-block mb-2" />
                              <div className="text-muted">No lessons yet</div>
                              {canEditLessons && (
                                <button 
                                  className="btn btn-primary btn-sm rounded-3 mt-2"
                                  onClick={() => setShowLessonModal(true)}
                                >
                                  <i className="bi bi-plus-circle me-1" />
                                  Add First Lesson
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          lessons.map((lesson, index) => (
                            <tr 
                              key={lesson.lesson_id}
                              className={''}
                              onKeyDown={(e) => handleKeyDown(e, lesson.lesson_id, index)}
                              tabIndex={0}
                              role="button"
                              aria-label={`Lesson ${lesson.title}, position ${index + 1}, use arrow keys to reorder, E to edit`}
                            >
                              <td className="fw-semibold">{index + 1}</td>
                              <td className="fw-semibold">{lesson.title}</td>
                              <td>{lesson.curriculum_unit || <span className="text-muted">—</span>}</td>
                              <td>{lesson.week_number ? <StatusBadge status="info">W{lesson.week_number}</StatusBadge> : <span className="text-muted">—</span>}</td>
                              <td className="small">
                                {lesson.content ? (
                                  <span title={lesson.content}>
                                    {lesson.content.length > 100 
                                      ? `${lesson.content.substring(0, 100)}...` 
                                      : lesson.content
                                    }
                                  </span>
                                ) : (
                                  <span className="text-muted">No content</span>
                                )}
                              </td>
                              {canEditLessons && (
                                <td className="text-end">
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => moveLesson(lesson.lesson_id, -1)}
                                      disabled={index === 0}
                                      title="Move up (Ctrl+↑)"
                                      aria-label={`Move ${lesson.title} up`}
                                    >
                                      <i className="bi bi-arrow-up" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => moveLesson(lesson.lesson_id, 1)}
                                      disabled={index === lessons.length - 1}
                                      title="Move down (Ctrl+↓)"
                                      aria-label={`Move ${lesson.title} down`}
                                    >
                                      <i className="bi bi-arrow-down" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary"
                                      onClick={() => editLesson(lesson)}
                                      title="Edit (Ctrl+E)"
                                      aria-label={`Edit ${lesson.title}`}
                                    >
                                      <i className="bi bi-pencil" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => archiveLesson(lesson.lesson_id)}
                                      title="Archive"
                                      aria-label={`Archive ${lesson.title}`}
                                    >
                                      <i className="bi bi-archive" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Modal */}
      {(showSyllabusModal || editingSyllabus) && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  {editingSyllabus ? 'Edit Syllabus' : 'Create New Syllabus'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowSyllabusModal(false)
                    setEditingSyllabus(null)
                    setNewSyllabus({ title: '', course_code: '', description: '', faculty_user_id: '' })
                    setError(null)
                  }}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={editingSyllabus ? updateSyllabus : createSyllabus}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter syllabus title"
                      value={newSyllabus.title}
                      onChange={(e) => setNewSyllabus(prev => ({ ...prev, title: e.target.value }))}
                      disabled={submitting}
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Course Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CS101"
                      value={newSyllabus.course_code}
                      onChange={(e) => setNewSyllabus(prev => ({ ...prev, course_code: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Enter syllabus description"
                      value={newSyllabus.description}
                      onChange={(e) => setNewSyllabus(prev => ({ ...prev, description: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                  
                  {canAssignCourseFaculty && !editingSyllabus && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Assign Faculty</label>
                      <select
                        className="form-select"
                        value={newSyllabus.faculty_user_id}
                        onChange={(e) => setNewSyllabus(prev => ({ ...prev, faculty_user_id: e.target.value }))}
                        disabled={submitting}
                      >
                        <option value="">Unassigned</option>
                        {faculty.map((f) => (
                          <option key={f.user_id} value={String(f.user_id)}>
                            {f.username} ({f.faculty_type ?? 'Faculty'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3"
                    onClick={() => {
                      setShowSyllabusModal(false)
                      setEditingSyllabus(null)
                      setNewSyllabus({ title: '', course_code: '', description: '', faculty_user_id: '' })
                      setError(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3"
                    disabled={submitting}
                  >
                    {submitting && <LoadingSpinner />}
                    {editingSyllabus ? 'Update Syllabus' : 'Create Syllabus'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {(showLessonModal || editingLesson) && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowLessonModal(false)
                    setEditingLesson(null)
                    setNewLesson({ title: '', curriculum_unit: '', week_number: '', content: '' })
                    setError(null)
                  }}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={editingLesson ? updateLesson : createLesson}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Lesson Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter lesson title"
                        value={newLesson.title}
                        onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                        disabled={submitting}
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Curriculum Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Unit 1"
                        value={newLesson.curriculum_unit}
                        onChange={(e) => setNewLesson(prev => ({ ...prev, curriculum_unit: e.target.value }))}
                        disabled={submitting}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Week Number</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={52}
                        placeholder="1-52"
                        value={newLesson.week_number}
                        onChange={(e) => setNewLesson(prev => ({ ...prev, week_number: e.target.value }))}
                        disabled={submitting}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Lesson Content</label>
                      <textarea
                        className="form-control"
                        rows={6}
                        placeholder="Enter lesson content, objectives, materials, etc."
                        value={newLesson.content}
                        onChange={(e) => setNewLesson(prev => ({ ...prev, content: e.target.value }))}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3"
                    onClick={() => {
                      setShowLessonModal(false)
                      setEditingLesson(null)
                      setNewLesson({ title: '', curriculum_unit: '', week_number: '', content: '' })
                      setError(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-3"
                    disabled={submitting}
                  >
                    {submitting && <LoadingSpinner />}
                    {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrops */}
      {(showSyllabusModal || showLessonModal) && (
        <div className="modal-backdrop fade show" onClick={() => {
          setShowSyllabusModal(false)
          setShowLessonModal(false)
          setEditingSyllabus(null)
          setEditingLesson(null)
        }} />
      )}
    </div>
  )
}
