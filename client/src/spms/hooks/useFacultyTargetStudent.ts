import { useEffect, useMemo, useState } from 'react'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { ensureSeededForDemo } from '../db/studentRecordsSeed'

function fullName(student: Student) {
  const parts = [student.firstName, student.middleName ?? '', student.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function useFacultyTargetStudent() {
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingStudents(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      ensureSeededForDemo(all.map((s) => s.id))
      // Don't auto-select any student - wait for user selection
      setSelectedStudentId('')
      setLoadingStudents(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const normalizedSearch = studentSearch.trim().toLowerCase()
  const filteredStudents = useMemo(() => {
    if (!normalizedSearch) return students
    return students.filter((student) => {
      const searchable = [
        fullName(student),
        student.id,
        student.yearLevel ?? '',
        student.section ?? '',
        student.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return searchable.includes(normalizedSearch)
    })
  }, [normalizedSearch, students])

  useEffect(() => {
    if (loadingStudents) return
    if (filteredStudents.length === 0) {
      setSelectedStudentId('')
      return
    }
    const selectedStillVisible = filteredStudents.some((student) => student.id === selectedStudentId)
    if (!selectedStillVisible) {
      // Don't auto-select when filtering - require explicit user selection
      setSelectedStudentId('')
    }
  }, [filteredStudents, loadingStudents, selectedStudentId])

  return {
    students,
    filteredStudents,
    loadingStudents,
    selectedStudentId,
    setSelectedStudentId,
    studentSearch,
    setStudentSearch,
  }
}
