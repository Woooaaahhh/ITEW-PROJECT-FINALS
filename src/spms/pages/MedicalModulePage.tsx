import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { StaffMedicalRecordModal } from '../components/StaffMedicalRecordModal'
import { StudentMedicalFormModal } from '../components/StudentMedicalFormModal'
import { nowIso } from '../db/spmsDb'
import { updateStudent, listStudents, seedIfEmpty, type Student } from '../db/students'
import {
  getMedicalListStatus,
  medicalListStatusBadgeClass,
  medicalListStatusLabel,
  type MedicalListStatus,
} from '../db/medicalClearance'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function courseYearLabel(s: Student) {
  const y = s.yearLevel ?? '—'
  const sec = s.section ?? '—'
  return `${y} · ${sec}`
}

type StatusFilter = 'all' | MedicalListStatus

export function MedicalModulePage() {
  const { user } = useAuth()
  const role = user?.role ?? 'student'
  const myStudentId = user?.studentId ?? ''

  const isFaculty = role === 'faculty'
  const isAdmin = role === 'admin'
  const isStudent = role === 'student'

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actingId, setActingId] = useState<string | null>(null)

  /** Registrar: view-only modal */
  const [viewRecordId, setViewRecordId] = useState<string | null>(null)
  /** Student role (shared class login): create/edit clearance for whichever row is chosen */
  const [studentFormOpen, setStudentFormOpen] = useState(false)
  const [medicalFormStudentId, setMedicalFormStudentId] = useState<string | null>(null)
  /** Faculty: reject confirmation */
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const refetch = useCallback(async () => {
    await seedIfEmpty()
    const all = await listStudents()
    setStudents(all)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await seedIfEmpty()
      const all = await listStudents()
      if (!alive) return
      setStudents(all)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onRosterChanged = () => {
      void refetch()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    window.addEventListener('spms-students-changed', onRosterChanged)
    window.addEventListener('focus', onRosterChanged)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('spms-students-changed', onRosterChanged)
      window.removeEventListener('focus', onRosterChanged)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refetch])

  /** All roles (including students) see every student in the roster; search/status filters apply on top. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = students
    if (q) {
      list = list.filter((s) => fullName(s).toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      list = list.filter((s) => getMedicalListStatus(s) === statusFilter)
    }
    return list
  }, [students, search, statusFilter])

  const viewRecordStudent = viewRecordId ? students.find((s) => s.id === viewRecordId) ?? null : null
  const viewRecordName = viewRecordStudent ? fullName(viewRecordStudent) : ''

  const medicalFormStudent = useMemo(
    () => (medicalFormStudentId ? students.find((s) => s.id === medicalFormStudentId) ?? null : null),
    [students, medicalFormStudentId],
  )

  const openStudentMedicalForm = (s: Student) => {
    setMedicalFormStudentId(s.id)
    setStudentFormOpen(true)
  }

  const closeStudentMedicalForm = () => {
    setStudentFormOpen(false)
    setMedicalFormStudentId(null)
  }

  const handleApprove = async (s: Student) => {
    const nm = fullName(s)
    if (!window.confirm(`Approve medical clearance for ${nm}?`)) return
    setActingId(s.id)
    try {
      await updateStudent(s.id, {
        medicalClearanceStatus: 'approved',
        medicalClearanceUpdatedAt: nowIso(),
      })
      await refetch()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setActingId(null)
    }
  }

  const openReject = (s: Student) => {
    setRejectNotes('')
    setRejectTarget({ id: s.id, name: fullName(s) })
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    setActingId(rejectTarget.id)
    try {
      await updateStudent(rejectTarget.id, {
        medicalClearanceStatus: 'rejected',
        medicalClearanceUpdatedAt: nowIso(),
        medicalClearanceNotes: rejectNotes.trim() ? rejectNotes.trim() : null,
      })
      setRejectTarget(null)
      await refetch()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      {isAdmin || isFaculty ? (
        <StaffMedicalRecordModal
          open={Boolean(viewRecordId && viewRecordStudent)}
          onClose={() => setViewRecordId(null)}
          studentId={viewRecordId ?? ''}
          studentName={viewRecordName}
          mode="readonly"
          readOnlyBadgeLabel={isFaculty ? 'Faculty · view submission' : undefined}
          onAfterSave={() => void refetch()}
        />
      ) : null}

      {isStudent ? (
        <StudentMedicalFormModal
          open={studentFormOpen && Boolean(medicalFormStudentId)}
          onClose={closeStudentMedicalForm}
          studentId={medicalFormStudentId ?? ''}
          forStudentName={medicalFormStudent ? fullName(medicalFormStudent) : undefined}
          onAfterSave={() => void refetch()}
        />
      ) : null}

      {rejectTarget ? (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-0 rounded-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold">Reject medical clearance</h5>
                  <button type="button" className="btn-close" onClick={() => setRejectTarget(null)} aria-label="Close" />
                </div>
                <div className="modal-body pt-0">
                  <p className="small spms-muted mb-2">
                    Student: <span className="fw-semibold text-body">{rejectTarget.name}</span>
                  </p>
                  <label className="form-label small fw-semibold">Notes for the student (optional)</label>
                  <textarea
                    className="form-control rounded-3"
                    rows={3}
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Reason for rejection — shown on the student profile"
                  />
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setRejectTarget(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger rounded-3"
                    disabled={actingId === rejectTarget.id}
                    onClick={() => void confirmReject()}
                  >
                    {actingId === rejectTarget.id ? 'Rejecting…' : 'Reject clearance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setRejectTarget(null)} />
        </>
      ) : null}

      <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
        <div className="card-body">
          <p className="spms-muted small mb-3">
            {isFaculty
              ? 'Students create and update their own medical information. Open View submission to see vitals and documents, then Approve or Reject.'
              : isAdmin
                ? 'View clearance status for all students. Students enter data; faculty approves or rejects.'
                : 'Everyone the registrar added under Student List appears here (same browser profile). Use Create / edit clearance on a row to enter or update that student’s record (shared class login). Open View to see their profile. Faculty approves or rejects afterward.'}
          </p>

          {isStudent && !myStudentId ? (
            <div className="alert alert-info py-2 small mb-3 mb-md-0">
              This is a shared student account: choose the correct row for each person when submitting medical clearance.
            </div>
          ) : null}

          <div className="row g-3 align-items-end">
              <div className="col-12 col-md-5 col-lg-4">
                <label className="form-label small fw-semibold mb-1">Search by name or email</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search" />
                  </span>
                  <input
                    className="form-control"
                    placeholder="Type to filter…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="col-12 col-md-4 col-lg-3">
                <label className="form-label small fw-semibold mb-1">Status</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  disabled={loading}
                >
                  <option value="all">All statuses</option>
                  <option value="not_submitted">Not Submitted</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="col-12 col-md-3 col-lg-5 text-md-end">
                <span className="spms-chip d-inline-flex">
                  <i className="bi bi-people me-1" />
                  {filtered.length} student{filtered.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
        </div>
      </div>

      <div className="spms-card card border-0 overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
          <div className="card-header bg-transparent border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span className="fw-semibold">Medical records</span>
            {!isStudent ? (
              <Link to="/students" className="btn btn-sm btn-outline-primary rounded-3">
                <i className="bi bi-people me-1" /> Student list
              </Link>
            ) : (
              <Link to="/student" className="btn btn-sm btn-outline-secondary rounded-3">
                <i className="bi bi-grid-1x2 me-1" /> Dashboard
              </Link>
            )}
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 spms-muted small">Loading students…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 spms-muted small">No students match your filters.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 spms-table">
                  <thead className="border-bottom bg-light bg-opacity-50">
                    <tr className="small spms-muted text-uppercase">
                      <th className="ps-4 py-3 fw-semibold">Student name</th>
                      <th className="py-3 fw-semibold">Course / year</th>
                      <th className="py-3 fw-semibold">Medical status</th>
                      <th className="text-end pe-4 py-3 fw-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const listStatus = getMedicalListStatus(s)
                      const highlight = listStatus === 'not_submitted'
                      const busy = actingId === s.id

                      return (
                        <tr key={s.id} className={highlight ? 'table-warning' : undefined}>
                          <td className="ps-4 py-3 fw-semibold">{fullName(s)}</td>
                          <td className="py-3 spms-muted">{courseYearLabel(s)}</td>
                          <td className="py-3">
                            <span className={`badge rounded-pill px-3 py-2 ${medicalListStatusBadgeClass(listStatus)}`}>
                              {medicalListStatusLabel(listStatus)}
                            </span>
                          </td>
                          <td className="text-end pe-4 py-3">
                            {isFaculty ? (
                              <div className="d-flex flex-wrap justify-content-end gap-2">
                                {listStatus === 'not_submitted' ? (
                                  <span className="small spms-muted">Awaiting student submission</span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary rounded-3"
                                      onClick={() => setViewRecordId(s.id)}
                                    >
                                      <i className="bi bi-eye me-1" />
                                      View submission
                                    </button>
                                    {(listStatus === 'pending' || listStatus === 'rejected') && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-success rounded-3"
                                        disabled={busy}
                                        onClick={() => void handleApprove(s)}
                                      >
                                        <i className="bi bi-check2-circle me-1" />
                                        Approve clearance
                                      </button>
                                    )}
                                    {(listStatus === 'pending' || listStatus === 'approved') && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger rounded-3"
                                        disabled={busy}
                                        onClick={() => openReject(s)}
                                      >
                                        <i className="bi bi-x-circle me-1" />
                                        Reject clearance
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : isAdmin ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary rounded-3"
                                onClick={() => setViewRecordId(s.id)}
                              >
                                <i className="bi bi-eye me-1" />
                                View record
                              </button>
                            ) : (
                              <div className="d-flex flex-wrap justify-content-end gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary rounded-3"
                                  onClick={() => openStudentMedicalForm(s)}
                                >
                                  <i className="bi bi-pencil-square me-1" />
                                  Create / edit clearance
                                </button>
                                <Link
                                  to={`/students/${s.id}#medical-clearance`}
                                  className="btn btn-sm btn-outline-secondary rounded-3"
                                >
                                  <i className="bi bi-eye me-1" />
                                  View
                                </Link>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
