import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { RecordTable, type RecordRow } from '../components/RecordTable'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import type { Skill } from '../db/spmsDb'

export function StudentSkillsPage() {
  const { user } = useAuth()
  const studentId = user?.studentId

  const [skills, setSkills] = useState<Skill[]>([])
  const [assigned, setAssigned] = useState<{ skillId: string; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!studentId) return
      setLoading(true)
      try {
        await seedSkillsIfEmpty()
        const [allSkills, rows] = await Promise.all([
          listSkills({ activeOnly: false }),
          listStudentSkills(studentId),
        ])
        if (!alive) return
        setSkills(allSkills)
        setAssigned(rows.map((r) => ({ skillId: r.skillId, createdAt: r.createdAt })))
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [studentId])

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])
  const rows = useMemo<RecordRow[]>(() => {
    return assigned
      .map((a) => {
        const sk = byId.get(a.skillId)
        return {
          recordType: sk?.category ?? 'Skill',
          description: sk?.name ?? a.skillId,
          date: new Date(a.createdAt).toLocaleDateString(),
        }
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [assigned, byId])

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to="/student" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-arrow-left me-1" /> Back to Dashboard
          </Link>
        </div>
        <RecordTable
          title="Skills"
          rows={rows}
          emptyMessage={loading ? 'Loading skills…' : 'No skills recorded yet.'}
        />
      </div>
    </div>
  )
}
