import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import avatarUrl from '../../assets/react.svg'
import { useAuth } from '../auth/AuthContext'
import { getStudent, updateStudent, type Student } from '../db/students'
<<<<<<< HEAD
import { getStudentRecords } from '../db/studentRecords'
=======
import { ensureAcademicSeededForDemo } from '../db/academicRecords'
import { ensureSeededForDemo, getStudentRecords } from '../db/studentRecords'
>>>>>>> a18d51df6d79b75d038516660afd205af438449a
import { ProfileAcademicHistoryCard, ProfileCurrentAcademicBanner } from '../components/AcademicProfileSections'
import { listSports, seedSportsIfEmpty } from '../db/sports'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import type { Sport } from '../db/spmsDb'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [recordsTick, setRecordsTick] = useState(0)
  
  // Permissions
  const canEditProfile = user?.role === 'admin'
  const isOwnProfile = user?.role === 'student' && user?.studentId === id
  const canViewBehaviorRecords =
    user?.role === 'faculty' || user?.role === 'admin' || isOwnProfile

  // State for Sports & Skills
  const [sports, setSports] = useState<Sport[]>([])
  const [draftSportsIds, setDraftSportsIds] = useState<string[]>([])
  const [skills, setSkills] = useState<{ id: string; name: string; category: string; isActive: boolean }[]>([])
  const [studentSkillIds, setStudentSkillIds] = useState<string[]>([])

  // Load Student Data
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!id) return
      setLoading(true)
      const s = await getStudent(id)
      if (!alive) return
      setStudent(s ?? null)
<<<<<<< HEAD
=======
      if (s?.id) {
        ensureSeededForDemo([s.id])
        ensureAcademicSeededForDemo([s.id])
      }
>>>>>>> a18d51df6d79b75d038516660afd205af438449a
      setLoading(false)
    })()
    return () => { alive = false }
  }, [id])

  // Load Skills
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!id) return
      try {
        await seedSkillsIfEmpty()
        const [allSkills, rows] = await Promise.all([
          listSkills({ activeOnly: false }),
          listStudentSkills(id),
        ])
        if (!alive) return
        setSkills(allSkills)
        setStudentSkillIds(rows.map((r) => r.skillId))
      } catch {
        if (!alive) return
        setSkills([])
        setStudentSkillIds([])
      }
    })()
    return () => { alive = false }
  }, [id])

  // Load Sports
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await seedSportsIfEmpty()
        const all = await listSports({ activeOnly: false })
        if (!alive) return
        setSports(all)
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!student) return
    setDraftSportsIds(Array.isArray(student.sportsAffiliations) ? student.sportsAffiliations : [])
  }, [student])

  // Records change listener
  useEffect(() => {
    const onRecords = () => setRecordsTick((n) => n + 1)
    window.addEventListener('spms-student-records-changed', onRecords)
    return () => window.removeEventListener('spms-student-records-changed', onRecords)
  }, [])

  const name = useMemo(() => (student ? fullName(student) : 'Student'), [student])
  const records = useMemo(() => (student ? getStudentRecords(student.id) : null), [student, recordsTick])

  const skillsById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])
  const skillChips = useMemo(() => {
    return studentSkillIds
      .map((sid) => skillsById.get(sid))
      .filter(Boolean)
      .map((sk) => sk!)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [studentSkillIds, skillsById])

  if (loading) {
    return (
      <div className="spms-card card"><div className="card-body"><div className="spms-muted">Loading student profile...</div></div></div>
    )
  }

  if (!student) {
    return (
      <div className="spms-card card">
        <div className="card-body">
          <div className="fw-bold fs-5">Student not found</div>
          <div className="mt-3">
            <Link to="/students" className="btn btn-primary rounded-4 px-4"><i className="bi bi-arrow-left me-1" /> Back</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="spms-cover" />

      <div className="spms-profile-header">
        <img className="spms-profile-pic" src={student.profilePictureDataUrl || avatarUrl} alt={name} />
        <div className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h3 className="mb-0 fw-bold">{name}</h3>
            <span className="spms-chip"><i className="bi bi-patch-check" /> Active</span>
            {student.yearLevel && <span className="spms-chip"><i className="bi bi-layers" /> {student.yearLevel}</span>}
            {student.section && <span className="spms-chip"><i className="bi bi-diagram-3" /> {student.section}</span>}
          </div>

          <div className="d-flex flex-wrap gap-2 mt-2">
            {student.email && <span className="spms-chip"><i className="bi bi-envelope" /> {student.email}</span>}
            {student.contactNumber && <span className="spms-chip"><i className="bi bi-telephone" /> {student.contactNumber}</span>}
          </div>

          <div className="d-flex gap-2 mt-3 spms-no-print">
            {canEditProfile && (
              <Link to={`/students/${student.id}/edit`} className="btn btn-primary rounded-4 px-4">
                <i className="bi bi-pencil me-1" /> Edit Profile
              </Link>
            )}
            {isOwnProfile && (
              <>
                <Link to="/student/violations" className="btn btn-outline-secondary rounded-4 px-3">Violations</Link>
                <Link to="/student/achievements" className="btn btn-outline-secondary rounded-4 px-3">Achievements</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
           <ProfileCurrentAcademicBanner studentId={student.id} />
           <div className="mt-3">
             <ProfileAcademicHistoryCard studentId={student.id} />
           </div>
           
           {canViewBehaviorRecords && (
             <div className="spms-card card mt-3">
               <div className="card-body">
                 <h6 className="fw-bold mb-3">Behavior & Conduct</h6>
                 <div className="small">
                   Violations: <span className="badge bg-danger-subtle text-danger">{records?.violations.length ?? 0}</span>
                 </div>
               </div>
             </div>
           )}
        </div>

        <div className="col-12 col-lg-4">
          <div className="spms-card card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Skills & Expertise</h6>
              <div className="d-flex flex-wrap gap-1">
                {skillChips.length > 0 ? skillChips.map(s => (
                  <span key={s.id} className="badge bg-primary-subtle text-primary">{s.name}</span>
                )) : <small className="text-muted">No skills recorded.</small>}
              </div>
            </div>
          </div>

          <div className="spms-card card">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Sports Affiliations</h6>
              <div className="d-flex flex-wrap gap-1">
                {draftSportsIds.length > 0 ? draftSportsIds.map(id => (
                  <span key={id} className="badge bg-success-subtle text-success">{id}</span>
                )) : <small className="text-muted">No sports recorded.</small>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
