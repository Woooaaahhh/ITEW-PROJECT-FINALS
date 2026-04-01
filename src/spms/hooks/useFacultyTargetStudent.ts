import { useEffect, useState } from 'react'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { ensureSeededForDemo } from '../db/studentRecordsSeed'

export function useFacultyTargetStudent() {
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoadingStudents(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      ensureSeededForDemo(all.map((s) => s.id))
      setSelectedStudentId(all[0]?.id ?? '')
      setLoadingStudents(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  return { students, loadingStudents, selectedStudentId, setSelectedStudentId }
}
