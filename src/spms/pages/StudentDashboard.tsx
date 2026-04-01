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
  { schoolYear: '2024-2025', semester: '1st', gwa: '1.45', honors: "Dean's Lister" },
  { schoolYear: '2023-2024', semester: '2nd', gwa: '1.52', honors: '—' },
]

const MOCK_SKILLS = [
  { name: 'Programming - Python', levelOrDescription: 'Intermediate', dateAdded: 'Feb 1, 2025', icon: 'bi-code-slash' },
  { name: 'Leadership', levelOrDescription: 'Workshop completed', dateAdded: 'Jan 15, 2025', icon: 'bi-people' },
]

const MOCK_ACTIVITY: ActivityItem[] =

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
      if (!studentId) {
        setLoading(false)
        return
      }
      setLoading(true)
      await seedIfEmpty()
      const data = await getStudent(studentId)
      if (!alive) return
      setStudent(data ?? null)
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

      <section>
        <h6 className="text-secondary fw-semibold mb-3">Overview</h6>
        <div className="row g-3">
          <div className="col-6 col-lg-3">
            <InsightCard icon="bi-mortarboard" value={loading ? '—' : yearLevel} label="Year Level" />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard icon="bi-diagram-3" value={loading ? '—' : section} label="Section" />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard icon="bi-award" value={loading ? '—' : totalSkills.toString()} label="Total Skills" />
          </div>
          <div className="col-6 col-lg-3">
            <InsightCard icon="bi-journal-bookmark" value={loading ? '—' : totalAchievements.toString()} label="Achievements" />
          </div>
        </div>
      </section>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <section className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-secondary fw-semibold mb-0">Recent Academic Performance</h6>
              <Link to="/student/academic" className="small text-decoration-none">View History</Link>
            </div>
            <AcademicTable rows={MOCK_ACADEMIC} />
          </section>

          <section>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-secondary fw-semibold mb-0">Recent Violations</h6>
              <span className="badge rounded-pill bg-danger-subtle text-danger">{totalViolations} Active</span>
            </div>
            <ViolationTable rows={violationRows.slice(0, 3)} />
          </section>
        </div>

        <div className="col-12 col-xl-4">
          <section className="mb-4">
            <h6 className="text-secondary fw-semibold mb-3">Top Skills</h6>
            <div className="d-flex flex-column gap-2">
              {MOCK_SKILLS.map((s, i) => (
                <SkillCard key={i} {...s} />
              ))}
            </div>
          </section>

          <section>
            <h6 className="text-secondary fw-semibold mb-3">Activity Feed</h6>
            <ActivityFeed items={MOCK_ACTIVITY} />
          </section>
        </div>
      </div>
    </div>
  )
}
