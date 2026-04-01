import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getStudent, listStudents, seedIfEmpty, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import { InsightCard } from '../components/InsightCard'
import { AcademicTable, type AcademicRow } from '../components/AcademicTable'
import { SkillCard } from '../components/SkillCard'
import { ViolationTable, type ViolationRow } from '../components/ViolationTable'
import { RecordTable } from '../components/RecordTable'
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
const MOCK_ACTIVITY: ActivityItem[] = [
  { text: 'Skill added: Programming - Python', date: 'Feb 1, 2025', icon: 'bi-award' },
  { text: 'Academic record updated', date: 'Jan 20, 2025', icon: 'bi-journal-text' },
  { text: 'Skill added: Leadership Workshop', date: 'Jan 15, 2025', icon: 'bi-award' },
]

export function StudentDashboard() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [recordsTick, setRecordsTick] = useState(0)

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

  useEffect(() => {
    const onRecords = () => setRecordsTick((n) => n + 1)
    window.addEventListener('spms-student-records-changed', onRecords)
    return () => window.removeEventListener('spms-student-records-changed', onRecords)
  }, [])

  const yearLevel = student?.yearLevel ?? '—'
  const section = student?.section ?? '—'
  const totalSkills = MOCK_SKILLS.length

  const records = useMemo(() => (student ? getStudentRecords(student.id) : null), [student, recordsTick])
  const violationRows: ViolationRow[] = useMemo(
    () =>
      (records?.violations ?? []).map((v) => ({
        id: v.id,
        violationType: v.violation_type,
        description: v.description,
        dateRecorded: new Date(v.date).toLocaleDateString(),
        status: v.status,
      })),
    [records],
  )
  const totalViolations = violationRows.length
  const totalAchievements = records?.achievements.length ?? 0

  const achievementRows = useMemo(
    () =>
      (records?.achievements ?? []).map((a) => ({
        recordType: a.category ? `${a.title} (${a.category})` : a.title,
        description: a.description,
        date: new Date(a.date).toLocaleDateString(),
      })),
    [records],
  )

  return (
    <div className="d-flex flex-column gap-4">
      {studentId ? (
        <div className="d-flex flex-wrap gap-2 spms-no-print">
          <Link to={`/students/${studentId}`} className="btn btn-outline-primary btn-sm rounded-3">
            <i className="bi bi-person-badge me-1" /> Full profile &amp; records
          </Link>
          <Link to="/student/violations" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-exclamation-triangle me-1" /> All violations
          </Link>
          <Link to="/student/achievements" className="btn btn-outline-secondary btn-sm rounded-3">
            <i className="bi bi-journal-bookmark me-1" /> All achievements
          </Link>
        </div>
      ) : null}

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
          <div className="col-6 col-lg-3">
            <InsightCard
              icon="bi-journal-bookmark"
              value={loading ? '—' : totalAchievements}
              label="Achievements"
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
          <ViolationTable rows={violationRows} loading={loading} />
        </div>
      </div>

      <section>
        <h6 className="text-secondary fw-semibold mb-3">Non-academic achievements</h6>
        <RecordTable
          title="Achievements (official)"
          rows={achievementRows}
          emptyMessage="No non-academic achievements recorded yet."
        />
      </section>

      {/* 6. Recent Activity */}
      <section>
        <ActivityFeed items={MOCK_ACTIVITY} />
      </section>
    </div>
  )
}
