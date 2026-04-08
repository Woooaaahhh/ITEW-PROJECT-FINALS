/** Client-side routing: this screen is a React Router <Route> target; shown without a full page reload. */
import { useEffect, useMemo, useState } from 'react'
import avatarUrl from '../../assets/react.svg'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { getStudentRecords } from '../db/studentRecords'
import { listSkills, listStudentSkills, seedSkillsIfEmpty } from '../db/skills'
import { listSports, seedSportsIfEmpty } from '../db/sports'
import { isMedicalApprovedForTryouts, medicalStatusLabel, normalizeMedicalStatus } from '../db/medicalClearance'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

type ReportType = 'sports_tryout' | 'programming_contest' | 'no_violations' | 'specific_skill'

type EnrichedStudent = {
  student: Student
  skillNames: string[]
  violationCount: number
}

function medicalClearanceLabel(s: Student) {
  return medicalStatusLabel(normalizeMedicalStatus(s.medicalClearanceStatus))
}

function exportTableToCsv(
  rows: EnrichedStudent[],
  filename: string,
  reportType: ReportType,
  selectedSportId: string,
) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const headers =
    reportType === 'sports_tryout'
      ? ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Medical clearance', 'Try-out eligible']
      : ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Contact', 'Violations', 'Skills']
  const rowToCsv = ({ student, skillNames, violationCount }: EnrichedStudent) => {
    if (reportType === 'sports_tryout') {
      const medicallyOk = isMedicalApprovedForTryouts(student)
      const inSport = selectedSportId ? (student.sportsAffiliations ?? []).includes(selectedSportId) : false
      const eligible = medicallyOk && inSport
      return [
        student.id,
        fullName(student),
        student.yearLevel ?? '',
        student.section ?? '',
        student.email ?? '',
        medicalClearanceLabel(student),
        eligible ? 'Yes' : 'No',
      ]
        .map(escape)
        .join(',')
    }
    return [
      student.id,
      fullName(student),
      student.yearLevel ?? '',
      student.section ?? '',
      student.email ?? '',
      student.contactNumber ?? '',
      String(violationCount),
      skillNames.join('; '),
    ]
      .map(escape)
      .join(',')
  }
  const csv = [headers.map(escape).join(','), ...rows.map(rowToCsv)].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentSkillsById, setStudentSkillsById] = useState<Record<string, string[]>>({})
  const [violationsByStudentId, setViolationsByStudentId] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [reportType, setReportType] = useState<ReportType>('sports_tryout')
  const [sportsOptions, setSportsOptions] = useState<{ id: string; name: string }[]>([])
  const [selectedSportId, setSelectedSportId] = useState('')
  const [skillOptions, setSkillOptions] = useState<{ id: string; name: string }[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      await Promise.all([seedIfEmpty(), seedSkillsIfEmpty(), seedSportsIfEmpty()])
      const [all, allSkills, allSports] = await Promise.all([listStudents(), listSkills({ activeOnly: true }), listSports({ activeOnly: true })])
      if (!alive) return
      const skillNameById = new Map(allSkills.map((sk) => [sk.id, sk.name]))
      const skillsMap: Record<string, string[]> = {}
      const violationsMap: Record<string, number> = {}

      await Promise.all(
        all.map(async (s) => {
          const assigned = await listStudentSkills(s.id)
          skillsMap[s.id] = assigned
            .map((row) => skillNameById.get(row.skillId))
            .filter((n): n is string => Boolean(n))
          const records = getStudentRecords(s.id)
          violationsMap[s.id] = records.violations.length
        }),
      )

      setStudents(all)
      setStudentSkillsById(skillsMap)
      setViolationsByStudentId(violationsMap)
      setSkillOptions(allSkills.map((sk) => ({ id: sk.id, name: sk.name })))
      setSportsOptions(allSports.map((sp) => ({ id: sp.id, name: sp.name })))
      setSelectedSkillId((prev) => prev || allSkills[0]?.id || '')
      setSelectedSportId((prev) => prev || allSports[0]?.id || '')
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo<EnrichedStudent[]>(() => {
    const q = normalize(search)
    const y = normalize(filterYear)
    const sec = normalize(filterSection)
    return students
      .filter((s) => {
        const skillNames = studentSkillsById[s.id] ?? []
        const violations = violationsByStudentId[s.id] ?? 0
      const hitSearch =
        !q ||
        fullName(s).toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      const hitYear = !y || normalize(s.yearLevel ?? '') === y
      const hitSection = !sec || normalize(s.section ?? '') === sec
        let hitReport = true
        if (reportType === 'sports_tryout') {
          const medicallyOk = isMedicalApprovedForTryouts(s)
          const inSport = selectedSportId ? (s.sportsAffiliations ?? []).includes(selectedSportId) : false
          hitReport = Boolean(selectedSportId) && medicallyOk && inSport
        } else if (reportType === 'specific_skill') {
          const selectedSkillName = normalize(skillOptions.find((sk) => sk.id === selectedSkillId)?.name ?? '')
          hitReport = !selectedSkillName || skillNames.some((name) => normalize(name) === selectedSkillName)
        } else if (reportType === 'programming_contest') {
          hitReport = skillNames.some((name) => normalize(name).includes('programming'))
        } else if (reportType === 'no_violations') {
          hitReport = violations === 0
        }
        return hitSearch && hitYear && hitSection && hitReport
      })
      .map((student) => ({
        student,
        skillNames: studentSkillsById[student.id] ?? [],
        violationCount: violationsByStudentId[student.id] ?? 0,
      }))
  }, [students, search, filterYear, filterSection, reportType, selectedSportId, selectedSkillId, skillOptions, studentSkillsById, violationsByStudentId])

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-4">
        <div className="spms-card card spms-no-print">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">
              <i className="bi bi-funnel me-2" /> Report Filters
            </div>
            <span className="spms-chip"><i className="bi bi-sliders" /> Criteria</span>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Search</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  className="form-control"
                  placeholder="Name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Year Level</label>
              <select
                className="form-select"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Report Type</label>
              <select
                className="form-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="sports_tryout">Sports try-out eligibility (assigned sport + medical approved)</option>
                <option value="programming_contest">Students qualified for programming contests</option>
                <option value="no_violations">Students with no violations</option>
                <option value="specific_skill">Students with specific skills</option>
              </select>
            </div>

            {reportType === 'sports_tryout' ? (
              <div className="mb-3">
                <label className="form-label fw-semibold">Sport</label>
                <select
                  className="form-select"
                  value={selectedSportId}
                  onChange={(e) => setSelectedSportId(e.target.value)}
                >
                  {sportsOptions.length === 0 ? (
                    <option value="">No sports available</option>
                  ) : (
                    sportsOptions.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="form-text">
                  Lists students assigned to the selected sport with medical clearance approved by faculty.
                </div>
              </div>
            ) : null}

            {reportType === 'specific_skill' ? (
              <div className="mb-3">
                <label className="form-label fw-semibold">Skill</label>
                <select
                  className="form-select"
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                >
                  {skillOptions.length === 0 ? (
                    <option value="">No skills available</option>
                  ) : (
                    skillOptions.map((sk) => (
                      <option key={sk.id} value={sk.id}>
                        {sk.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            <div className="mb-3">
              <label className="form-label fw-semibold">Section</label>
              <select
                className="form-select"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="">All</option>
                <option value="BSIT-2A">BSIT-2A</option>
                <option value="BSBA-1B">BSBA-1B</option>
                <option value="BSED-3C">BSED-3C</option>
                <option value="BSIT-4A">BSIT-4A</option>
              </select>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-4 px-4"
                onClick={() => {
                  setSearch('')
                  setFilterYear('')
                  setFilterSection('')
                  setReportType('sports_tryout')
                  setSelectedSportId(sportsOptions[0]?.id ?? '')
                  setSelectedSkillId(skillOptions[0]?.id ?? '')
                }}
              >
                Reset
              </button>
            </div>
            <hr className="my-3" />
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn btn-outline-primary rounded-4"
                onClick={() =>
                  exportTableToCsv(
                    filtered,
                    `spms-report-${new Date().toISOString().slice(0, 10)}.csv`,
                    reportType,
                    selectedSportId,
                  )
                }
              >
                <i className="bi bi-filetype-csv me-1" /> Export CSV
              </button>
              <button type="button" className="btn btn-primary rounded-4" onClick={() => window.print()}>
                <i className="bi bi-printer me-1" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="spms-card card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">
              <i className="bi bi-table me-2" /> Report Results
            </div>
            <span className="spms-chip">
              <i className="bi bi-check2-square" /> {filtered.length} matched
            </span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table spms-table table-hover align-middle mb-0">
                <thead className="border-bottom">
                  <tr>
                    <th className="ps-3">Student</th>
                    <th>Year</th>
                    <th>Section</th>
                    <th>Email</th>
                    {reportType === 'sports_tryout' ? (
                      <>
                        <th>Medical clearance</th>
                        <th className="text-end pe-3">Try-out eligible</th>
                      </>
                    ) : (
                      <>
                        <th>Violations</th>
                        <th className="text-end pe-3">Skills</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={6}>
                        <div className="spms-muted">Loading...</div>
                      </td>
                    </tr>
                  ) : null}
                  {!loading && filtered.length === 0 ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={6}>
                        <div className="spms-muted">No students matched your filters.</div>
                      </td>
                    </tr>
                  ) : null}
                  {filtered.map(({ student, skillNames, violationCount }) =>
                    reportType === 'sports_tryout' ? (
                      <tr key={student.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <img className="spms-avatar" src={student.profilePictureDataUrl || avatarUrl} alt="" />
                            <div>
                              <div className="fw-semibold">{fullName(student)}</div>
                              <div className="spms-muted small">{student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{student.yearLevel ?? '—'}</td>
                        <td>{student.section ?? '—'}</td>
                        <td>{student.email ?? '—'}</td>
                        <td>{medicalClearanceLabel(student)}</td>
                        <td className="text-end pe-3">
                          <span className="badge text-bg-success rounded-pill">Yes</span>
                        </td>
                      </tr>
                    ) : (
                      <tr key={student.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <img className="spms-avatar" src={student.profilePictureDataUrl || avatarUrl} alt="" />
                            <div>
                              <div className="fw-semibold">{fullName(student)}</div>
                              <div className="spms-muted small">{student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{student.yearLevel ?? '—'}</td>
                        <td>{student.section ?? '—'}</td>
                        <td>{student.email ?? '—'}</td>
                        <td>{violationCount}</td>
                        <td className="text-end pe-3">
                          {skillNames.length > 0 ? (
                            <span className="spms-muted small">
                              {skillNames.slice(0, 2).join(', ')}
                              {skillNames.length > 2 ? '…' : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
