import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getStudent, listStudents, seedIfEmpty, type Student } from '../db/students'
import { InsightCard } from '../components/InsightCard'
import { AcademicTable, type AcademicRow } from '../components/AcademicTable'
import { SkillCard } from '../components/SkillCard'
import { ViolationTable, type ViolationRow } from '../components/ViolationTable'
import { ActivityFeed, type ActivityItem } from '../components/ActivityFeed'

// Mock data until backend is available
const MOCK_ACADEMIC: AcademicRow[] = [
  { schoolYear: '2024-2025', semester: '1st', gwa: '1.45', honors: 'Dean\'s Lister' },
  { schoolYear: '2023-2024', semester: '2nd', gwa: '1.52', honors: '—' },
]
const MOCK_SKILLS = [
  { name: 'Programming - Python', levelOrDescription: 'Intermediate', dateAdded: 'Feb 1, 2025', icon: 'bi-code-slash' },
  { name: 'Leadership', levelOrDescription: 'Workshop completed', dateAdded: 'Jan 15, 2025', icon: 'bi-people' },
]
const MOCK_VIOLATIONS: ViolationRow[] = []
const MOCK_ACTIVITY: ActivityItem[] = [
  { text: 'Skill added: Programming - Python', date: 'Feb 1, 2025', icon: 'bi-award' },
  { text: 'Academic record updated', date: 'Jan 20, 2025', icon: 'bi-journal-text' },
  { text: 'Skill added: Leadership Workshop', date: 'Jan 15, 2025', icon: 'bi-award' },
]

export function StudentDashboard() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  const studentId = useMemo(() => {
    if (user?.role === 'student' && user?.studentId) return user.studentId
    return null
  }, [user])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      if (studentId) {
        const s = await getStudent(studentId)
        if (!alive) return
        setStudent(s ?? null)
      } else {
        const list = await listStudents()
        const found = list.find((s) => (s.email ?? '').toLowerCase() === 'student@spms.edu') ?? list[0]
        if (!alive) return
        setStudent(found ?? null)
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [studentId])

  const yearLevel = student?.yearLevel ?? '—'
  const section = student?.section ?? '—'
  const totalSkills = MOCK_SKILLS.length
  const totalViolations = MOCK_VIOLATIONS.length

  return (
    <div className="d-flex flex-column gap-4">
      {/* Overview */}
      <section>
        <h6 className="text-secondary fw-semibold mb-3">Overview</h6>
        <div className="row g-3">
          <div className="col-6 col-lg-3">
            <InsightCard
              icon="bi-mortarboard"
              value={loading ? '—' : yearLevel}
              label="Year Level"
            />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard
              icon="bi-diagram-3"
              value={loading ? '—' : section}
              label="Section"
            />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard
              icon="bi-award"
              value={loading ? '—' : totalSkills}
              label="Total Skills"
            />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard
              icon="bi-exclamation-triangle"
              value={loading ? '—' : totalViolations}
              label="Total Violations"
            />
          </div>
        </div>
      </section>

      {/* Academic Progress */}
      <section>
        <AcademicTable rows={MOCK_ACADEMIC} loading={loading} />
      </section>

      {/* 4. Skills & 5. Violations - two columns */}
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <h6 className="text-secondary fw-semibold mb-3">Skills</h6>
          <div className="row g-3">
            {MOCK_SKILLS.map((s, i) => (
              <div key={i} className="col-12 col-sm-6">
                <SkillCard
                  name={s.name}
                  levelOrDescription={s.levelOrDescription}
                  dateAdded={s.dateAdded}
                  icon={s.icon}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <h6 className="text-secondary fw-semibold mb-3">Violations</h6>
          <ViolationTable rows={MOCK_VIOLATIONS} loading={loading} />
        </div>
      </div>

      {/* 6. Recent Activity */}
      <section>
        <ActivityFeed items={MOCK_ACTIVITY} />
      </section>
    </div>
  )
}
