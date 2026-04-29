/** Client-side routing (React Router): uses <Link> for in-app navigation (no full page reload). */
import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProfileAcademicHistoryCard, ProfileCurrentAcademicBanner } from '../components/AcademicProfileSections'
import { listStudents, seedIfEmpty, type Student } from '../db/students'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

export function FacultyAcademicPage() {
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [formKey, setFormKey] = useState(0) // Force form reset when student changes

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    
    const query = normalize(searchQuery)
    return students.filter((student) => {
      const fullNameMatch = normalize(fullName(student)).includes(query)
      const idMatch = normalize(student.id).includes(query)
      const emailMatch = student.email && normalize(student.email).includes(query)
      return fullNameMatch || idMatch || emailMatch
    })
  }, [students, searchQuery])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      
      // Check if a specific student ID is in URL params
      const urlStudentId = searchParams.get('student')
      if (urlStudentId) {
        const studentExists = all.find(s => s.id === urlStudentId)
        if (studentExists) {
          setSelectedStudentId(urlStudentId)
        } else {
          // Invalid student ID in URL, don't select anyone
          setSelectedStudentId('')
        }
      } else {
        // No URL parameter, don't auto-select any student
        setSelectedStudentId('')
      }
      
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [searchParams])

  // Reset selected student when search changes to avoid wrong selection
  useEffect(() => {
    if (searchQuery.trim()) {
      // When searching, don't auto-select any student
      setSelectedStudentId('')
    }
  }, [searchQuery])

  // Reset form when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      // Force form reset by incrementing key
      setFormKey(prev => prev + 1)
    }
  }, [selectedStudentId])

  // Refresh students data periodically to catch newly added students
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const all = await listStudents()
        setStudents(all)
      } catch (error) {
        console.error('Failed to refresh students data:', error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Manual refresh function
  const refreshStudents = async () => {
    setLoading(true)
    try {
      await seedIfEmpty()
      const all = await listStudents()
      setStudents(all)
      
      // Keep current selection if it still exists
      if (selectedStudentId) {
        const studentExists = all.find(s => s.id === selectedStudentId)
        if (!studentExists) {
          setSelectedStudentId('')
        }
      }
    } catch (error) {
      console.error('Failed to refresh students:', error)
    } finally {
      setLoading(false)
    }
  }

  // Validate selected student exists and has complete data
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null
    return students.find(s => s.id === selectedStudentId) || null
  }, [selectedStudentId, students])

  const isStudentDataComplete = useMemo(() => {
    if (!selectedStudent) return false
    return !!(
      selectedStudent.id &&
      selectedStudent.firstName &&
      selectedStudent.lastName
    )
  }, [selectedStudent])

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <Link to="/faculty" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
          <button 
            className="btn btn-outline-primary btn-sm rounded-3"
            onClick={refreshStudents}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1" /> Refresh Students
          </button>
        </div>

        <div className="spms-card card mb-3">
          <div className="card-body">
            <label className="form-label fw-semibold mb-2">
              <i className="bi bi-person-lines-fill me-2" />
              Student
            </label>
            
            {/* Search Input */}
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
                {searchQuery && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchQuery('')}
                    disabled={loading}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="form-text">
                  Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            {/* Student Dropdown */}
            <select
              className="form-select rounded-3"
              value={selectedStudentId}
              disabled={loading || filteredStudents.length === 0}
              onChange={(e) => {
                const newStudentId = e.target.value
                if (newStudentId) {
                  // Validate the selected student exists and has complete data
                  const studentExists = students.find(s => s.id === newStudentId)
                  if (studentExists && studentExists.firstName && studentExists.lastName) {
                    setSelectedStudentId(newStudentId)
                  } else {
                    console.error('Selected student has incomplete data:', newStudentId)
                    // Show error and reset selection
                    setSelectedStudentId('')
                  }
                } else {
                  setSelectedStudentId('')
                }
              }}
            >
              <option value="">Select a student...</option>
              {filteredStudents.length === 0 ? (
                <option value="" disabled>
                  {searchQuery ? 'No students match search' : 'No students available'}
                </option>
              ) : (
                filteredStudents.map((s) => {
                  const isComplete = s.id && s.firstName && s.lastName
                  return (
                    <option 
                      key={s.id} 
                      value={s.id}
                      disabled={!isComplete}
                      title={isComplete ? '' : 'Student data incomplete'}
                    >
                      {fullName(s)} ({s.id}) {!isComplete ? '[INCOMPLETE]' : ''}
                    </option>
                  )
                })
              )}
            </select>
            {selectedStudentId ? (
              <div className="mt-2">
                <Link to={`/students/${selectedStudentId}`} className="small fw-semibold text-decoration-none">
                  <i className="bi bi-box-arrow-up-right me-1" />
                  Open full profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {selectedStudentId ? (
          <div className="d-flex flex-column gap-3">
            {selectedStudent && isStudentDataComplete ? (
              <>
                <ProfileCurrentAcademicBanner studentId={selectedStudentId} />
                <ProfileAcademicHistoryCard key={`${selectedStudentId}-${formKey}`} studentId={selectedStudentId} showFacultyForm />
              </>
            ) : (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2" />
                Unable to open Academic Record form. Student data incomplete or not found.
                <div className="mt-2">
                  <small className="text-muted">
                    Please try selecting the student again or refresh the page.
                  </small>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="spms-muted">Select a student to view and manage academic records.</div>
        )}
      </div>
    </div>
  )
}
