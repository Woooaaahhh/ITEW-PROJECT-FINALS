<<<<<<< HEAD
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { addAchievement, addViolation, ensureSeededForDemo, getStudentRecords } from '../db/studentRecords'
=======
import { NavLink } from 'react-router-dom'
import { AppIcon } from './AppIcon'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { ROLES } from '../auth/types'
>>>>>>> a18d51df6d79b75d038516660afd205af438449a

type SidebarProps = {
  mobileOpen: boolean
  desktopHidden: boolean
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

<<<<<<< HEAD
type ApiViolation = {
  id: string
  violation_type: string
  description: string
  date: string
  status: string
}

type ApiAchievement = {
  id: string
  title: string
  description: string
  date: string
  category: string
}

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function FacultyViolationsPage() {
  const [activeKind, setActiveKind] = useState<RecordKind>('violation')
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')

  const [violations, setViolations] = useState<ApiViolation[]>([])
  const [achievements, setAchievements] = useState<ApiAchievement[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [violationForm, setViolationForm] = useState<ViolationPayload>({
    violation_type: '',
    description: '',
    date: '',
    status: 'Pending',
  })

  const [achievementForm, setAchievementForm] = useState<AchievementPayload>({
    title: '',
    description: '',
    date: '',
    category: '',
  })

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

  useEffect(() => {
    if (!selectedStudentId) {
      setViolations([])
      setAchievements([])
      return
    }
    const r = getStudentRecords(selectedStudentId)
    setViolations(
      r.violations.map((v) => ({
        id: v.id,
        violation_type: v.violation_type,
        description: v.description,
        date: v.date,
        status: v.status,
      })),
    )
    setAchievements(
      r.achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.date,
        category: a.category ?? '',
      })),
    )
  }, [selectedStudentId])

  const sortedViolations = useMemo(
    () => [...violations].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [violations],
  )

  const sortedAchievements = useMemo(
    () => [...achievements].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [achievements],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedStudentId) {
      setError('Please select a student first.')
      return
    }

    try {
      setSubmitting(true)
      if (activeKind === 'violation') {
        const created = addViolation(selectedStudentId, { ...violationForm })
        const newItem: ApiViolation = {
          id: created.id,
          violation_type: created.violation_type,
          description: created.description,
          date: created.date,
          status: created.status,
        }
        setViolations((prev) => [newItem, ...prev])
        setViolationForm({
          violation_type: '',
          description: '',
          date: '',
          status: 'Pending',
        })
        setSuccess('Violation saved successfully.')
      } else {
        const created = addAchievement(selectedStudentId, { ...achievementForm })
        const newItem: ApiAchievement = {
          id: created.id,
          title: created.title,
          description: created.description,
          date: created.date,
          category: created.category ?? '',
        }
        setAchievements((prev) => [newItem, ...prev])
        setAchievementForm({
          title: '',
          description: '',
          date: '',
          category: '',
        })
        setSuccess('Achievement saved successfully.')
      }
    } catch {
      setError('Unable to save record. Please check the form and try again.')
    } finally {
      setSubmitting(false)
    }
  }
=======
export function Sidebar({ mobileOpen, desktopHidden }: SidebarProps) {
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`
  const { user } = useAuth()
  const role = user?.role ?? 'admin'
  const isStudent = role === 'student'
>>>>>>> a18d51df6d79b75d038516660afd205af438449a

  return (
    <aside
      id="spmsSidebar"
      className={cx(
        'spms-sidebar d-flex flex-column',
        'spms-sidebar-mobile d-lg-flex',
        mobileOpen && 'show',
        desktopHidden && 'spms-sidebar-desktop-hidden',
      )}
      aria-label="Sidebar navigation"
    >
      <div className="spms-brand">
        <div className="d-flex align-items-center gap-2">
          <AppIcon />
          <div className="min-w-0">
            <div className="fw-bold text-white lh-tight" style={{ fontSize: '.9rem' }}>
              Student Profiling
            </div>
            <div className="text-white-50" style={{ fontSize: '.7rem' }}>
              Management System
            </div>
          </div>
        </div>
      </div>

      <nav className="spms-nav nav flex-column">
        <NavLink className={navClass} to={role === 'admin' ? '/registrar' : role === 'faculty' ? '/faculty' : '/student'} end>
          <i className="bi bi-grid-1x2" /> Dashboard
        </NavLink>
        {!isStudent && (
          <>
            <NavLink className={navClass} to="/students">
              <i className="bi bi-people" /> Students
            </NavLink>
            {role === 'faculty' && (
              <>
                <NavLink className={navClass} to="/faculty/violations">
                  <i className="bi bi-exclamation-triangle" /> Violations
                </NavLink>
                <NavLink className={navClass} to="/faculty/achievements">
                  <i className="bi bi-journal-bookmark" /> Achievements
                </NavLink>
                <NavLink className={navClass} to="/faculty/skills">
                  <i className="bi bi-award" /> Skills
                </NavLink>
                <NavLink className={navClass} to="/faculty/sports">
                  <i className="bi bi-dribbble" /> Sports
                </NavLink>
                <NavLink className={navClass} to="/faculty/academic">
                  <i className="bi bi-mortarboard" /> Academic
                </NavLink>
              </>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/registrar/records">
                <i className="bi bi-clipboard-check" /> Behavior records
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/users">
                <i className="bi bi-person-badge" /> Faculty
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink className={navClass} to="/sections">
                <i className="bi bi-diagram-3" /> Sections
              </NavLink>
            )}
            {(role === 'admin' || role === 'faculty') && (
              <NavLink className={navClass} to="/reports">
                <i className="bi bi-file-earmark-bar-graph" /> Reports
              </NavLink>
            )}
          </>
        )}

        {isStudent && (
          <>
            {user?.studentId && (
              <NavLink className={navClass} to={`/students/${user.studentId}`}>
                <i className="bi bi-person-badge" /> My Profile
              </NavLink>
            )}
            <NavLink className={navClass} to="/student/academic">
              <i className="bi bi-journal-text" /> Academic History
            </NavLink>
            <NavLink className={navClass} to="/student/skills">
              <i className="bi bi-award" /> Skills
            </NavLink>
            <NavLink className={navClass} to="/student/violations">
              <i className="bi bi-exclamation-triangle" /> Violations
            </NavLink>
            <NavLink className={navClass} to="/student/achievements">
              <i className="bi bi-journal-bookmark" /> Achievements
            </NavLink>
          </>
        )}
      </nav>

      <div className="mt-auto spms-sidebar-footer">
        <div className="d-flex align-items-center gap-2">
          <img src={avatarUrl} className="rounded-3" width={40} height={40} alt="" />
          <div className="min-w-0">
            <div className="fw-semibold text-white text-truncate" style={{ fontSize: '.85rem' }}>{user?.name ?? 'User'}</div>
            {role === 'student' ? null : <small className="text-white-50">{ROLES[role]}</small>}
          </div>
        </div>
      </div>
    </aside>
  )
}
