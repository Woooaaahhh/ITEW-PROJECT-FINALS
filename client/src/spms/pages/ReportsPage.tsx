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

const REPORTS_PAGE_SIZE = 20

function medicalClearanceLabel(s: Student) {
  return medicalStatusLabel(normalizeMedicalStatus(s.medicalClearanceStatus))
}

function getReportStatus(
  row: EnrichedStudent,
  reportType: ReportType,
  selectedSportId: string,
  selectedSkillId: string,
  skillOptions: { id: string; name: string }[],
) {
  const { student, skillNames, violationCount } = row
  if (reportType === 'sports_tryout') {
    const medicallyOk = isMedicalApprovedForTryouts(student)
    const inSport = selectedSportId ? (student.sportsAffiliations ?? []).includes(selectedSportId) : false
    if (!selectedSportId) return { label: 'No sport selected', badgeClass: 'text-bg-secondary' }
    return medicallyOk && inSport
      ? { label: 'Eligible', badgeClass: 'text-bg-success' }
      : { label: 'Not Eligible', badgeClass: 'text-bg-danger' }
  }
  if (reportType === 'specific_skill') {
    const selectedSkillName = skillOptions.find((sk) => sk.id === selectedSkillId)?.name ?? ''
    if (!selectedSkillId) return { label: 'No skill selected', badgeClass: 'text-bg-secondary' }
    return skillNames.includes(selectedSkillName)
      ? { label: 'Matched', badgeClass: 'text-bg-success' }
      : { label: 'Not Matched', badgeClass: 'text-bg-danger' }
  }
  if (reportType === 'programming_contest') {
    const matched = skillNames.some((name) => normalize(name).includes('programming'))
    return matched
      ? { label: 'Qualified', badgeClass: 'text-bg-success' }
      : { label: 'Not Qualified', badgeClass: 'text-bg-danger' }
  }
  return violationCount === 0
    ? { label: 'Cleared', badgeClass: 'text-bg-success' }
    : { label: 'Has Violations', badgeClass: 'text-bg-danger' }
}

function exportTableToCsv(
  rows: EnrichedStudent[],
  filename: string,
  reportType: ReportType,
  selectedSportId: string,
  selectedSkillId: string,
  skillOptions: { id: string; name: string }[],
) {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const headers =
    reportType === 'sports_tryout'
      ? ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Medical clearance', 'Report status']
      : ['ID', 'Full Name', 'Year Level', 'Section', 'Email', 'Contact', 'Violations', 'Skills', 'Report status']
  const rowToCsv = ({ student, skillNames, violationCount }: EnrichedStudent) => {
    const status = getReportStatus(
      { student, skillNames, violationCount },
      reportType,
      selectedSportId,
      selectedSkillId,
      skillOptions,
    )
    if (reportType === 'sports_tryout') {
      return [
        student.id,
        fullName(student),
        student.yearLevel ?? '',
        student.section ?? '',
        student.email ?? '',
        medicalClearanceLabel(student),
        status.label,
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
      status.label,
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
  const [reportTypeDescription, setReportTypeDescription] = useState('')
  const [sportsOptions, setSportsOptions] = useState<{ id: string; name: string }[]>([])
  const [selectedSportId, setSelectedSportId] = useState('')
  const [skillOptions, setSkillOptions] = useState<{ id: string; name: string }[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  async function refreshData() {
    setLoading(true)
    await Promise.all([seedIfEmpty(), seedSkillsIfEmpty(), seedSportsIfEmpty()])
    const [all, allSkills, allSports] = await Promise.all([listStudents(), listSkills({ activeOnly: true }), listSports({ activeOnly: true })])
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
    setSelectedSportId((prev) => prev || allSports[0]?.id || '')
    setSelectedSkillId((prev) => prev || allSkills[0]?.id || '')
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await refreshData()
    })()
  }, [])

  // Dynamic year level options based on actual student data
  const yearLevelOptions = useMemo(() => {
    const years = new Set(students.map(s => s.yearLevel).filter((year): year is string => Boolean(year)))
    return Array.from(years).sort()
  }, [students])

  // Dynamic section options based on actual student data
  const sectionOptions = useMemo(() => {
    const sections = new Set(students.map(s => s.section).filter((section): section is string => Boolean(section)))
    return Array.from(sections).sort()
  }, [students])

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
          normalize(fullName(s)).includes(q) ||
          normalize(s.email ?? '').includes(q) ||
          normalize(s.id).includes(q)
        const hitYear = !y || normalize(s.yearLevel ?? '') === y
        const hitSection = !sec || normalize(s.section ?? '') === sec
        let hitReport = true
        if (reportType === 'sports_tryout') {
          const medicallyOk = isMedicalApprovedForTryouts(s)
          const inSport = selectedSportId ? (s.sportsAffiliations ?? []).includes(selectedSportId) : false
          hitReport = Boolean(selectedSportId) && medicallyOk && inSport
        } else if (reportType === 'specific_skill') {
          const selectedSkillName = skillOptions.find((sk) => sk.id === selectedSkillId)?.name ?? ''
          hitReport = !!selectedSkillId && skillNames.includes(selectedSkillName)
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

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterYear, filterSection, reportType, selectedSportId, selectedSkillId])

  const totalPages = Math.max(1, Math.ceil(filtered.length / REPORTS_PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * REPORTS_PAGE_SIZE
    return filtered.slice(start, start + REPORTS_PAGE_SIZE)
  }, [filtered, currentPage])

  const reportLabel = reportTypeDescription.trim() || 'Report Results'

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
                {yearLevelOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
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
            <div className="mb-3">
              <label className="form-label fw-semibold">Report Type Description</label>
              <input
                className="form-control"
                value={reportTypeDescription}
                onChange={(e) => setReportTypeDescription(e.target.value)}
                placeholder="e.g. Students qualified for basketball tryouts"
              />
              <div className="form-text">
                Enter a custom report type like students qualified for a specific sport or skills qualification for contest.
              </div>
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
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
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
                  setReportTypeDescription('')
                  setSelectedSportId(sportsOptions[0]?.id ?? '')
                  setSelectedSkillId(skillOptions[0]?.id ?? '')
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-outline-info rounded-4 px-4"
                onClick={() => refreshData()}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1" /> {loading ? 'Refreshing...' : 'Refresh Data'}
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
                    `spms-report-${(reportTypeDescription.trim() || reportType).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general'}-${new Date().toISOString().slice(0, 10)}.csv`,
                    reportType,
                    selectedSportId,
                    selectedSkillId,
                    skillOptions,
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
          <div className="d-none d-print-block px-3 pt-3">
            <h4 className="mb-1">{reportLabel}</h4>
            <div className="text-muted small">
              Generated on {new Date().toLocaleString()}
            </div>
          </div>
          <div className="card-header d-flex align-items-center justify-content-between">
            <div className="fw-bold">
              <i className="bi bi-table me-2" /> {reportLabel}
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
                        <th className="text-end pe-3">Report Status</th>
                      </>
                    ) : (
                      <>
                        <th>Violations</th>
                        <th>Skills</th>
                        <th className="text-end pe-3">Report Status</th>
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
                  {paginatedRows.map(({ student, skillNames, violationCount }) => {
                    const reportStatus = getReportStatus(
                      { student, skillNames, violationCount },
                      reportType,
                      selectedSportId,
                      selectedSkillId,
                      skillOptions,
                    )
                    return reportType === 'sports_tryout' ? (
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
                          <span className={`badge rounded-pill ${reportStatus.badgeClass}`}>{reportStatus.label}</span>
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
                        <td>
                          {skillNames.length > 0 ? (
                            <span className="spms-muted small">
                              {skillNames.slice(0, 2).join(', ')}
                              {skillNames.length > 2 ? '…' : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <span className={`badge rounded-pill ${reportStatus.badgeClass}`}>{reportStatus.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 ? (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top spms-no-print">
                <div className="spms-muted small">
                  Showing {(currentPage - 1) * REPORTS_PAGE_SIZE + 1}-
                  {Math.min(currentPage * REPORTS_PAGE_SIZE, filtered.length)} of {filtered.length} students
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-3"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="spms-muted small">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary rounded-3"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
