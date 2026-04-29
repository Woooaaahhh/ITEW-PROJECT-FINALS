/** Client-side routing: this screen is a React Router <Route> target; shown without a full page reload. */
import { useEffect, useMemo, useState } from 'react'
import avatarUrl from '../../assets/react.svg'
import { listSkills, listSports, seedSkillsIfEmpty, seedSportsIfEmpty } from '../db'
import { medicalStatusLabel, normalizeMedicalStatus } from '../db/medicalClearance'
import { useOptimizedReports, exportUtils, reportCacheUtils, type ReportType, type ReportFilters, type EnrichedStudent } from '../hooks/useOptimizedReports'

// Skeleton components for loading states
function TableSkeleton() {
  return (
    <div className="p-4">
      <div className="placeholder-glow">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="d-flex align-items-center gap-3 mb-3">
            <div className="placeholder rounded-circle" style={{ width: 40, height: 40 }}></div>
            <div className="flex-grow-1">
              <div className="placeholder col-4 mb-2"></div>
              <div className="placeholder col-6"></div>
            </div>
            <div className="placeholder col-2"></div>
            <div className="placeholder col-2"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterSkeleton() {
  return (
    <div className="p-3">
      <div className="placeholder-glow">
        <div className="placeholder col-6 mb-3"></div>
        <div className="placeholder col-8 mb-3"></div>
        <div className="placeholder col-10 mb-3"></div>
        <div className="placeholder col-4 mb-3"></div>
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="spms-card card border-0 h-100">
      <div className="card-body">
        <div className="placeholder-glow">
          <div className="placeholder col-4 mb-2"></div>
          <div className="placeholder col-8"></div>
        </div>
      </div>
    </div>
  )
}

export function OptimizedReportsPage() {
  // Form state
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [reportType, setReportType] = useState<ReportType>('sports_tryout')
  const [reportTypeDescription, setReportTypeDescription] = useState('')
  const [selectedSportId, setSelectedSportId] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Options state
  const [sportsOptions, setSportsOptions] = useState<{ id: string; name: string }[]>([])
  const [skillOptions, setSkillOptions] = useState<{ id: string; name: string }[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)

  // Report filters
  const filters: ReportFilters = {
    search,
    yearLevel: filterYear,
    section: filterSection,
    reportType,
    selectedSportId,
    selectedSkillId
  }

  // Use optimized reports hook
  const {
    students,
    totalCount,
    totalPages,
    loading,
    error,
    refresh
  } = useOptimizedReports(filters, {
    pageSize: 20,
    enableCache: true
  })

  // Load options data
  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true)
      try {
        await Promise.all([seedSkillsIfEmpty(), seedSportsIfEmpty()])
        const [skills, sports] = await Promise.all([
          listSkills({ activeOnly: true }),
          listSports({ activeOnly: true })
        ])
        
        setSkillOptions(skills.map(sk => ({ id: sk.id, name: sk.name })))
        setSportsOptions(sports.map(sp => ({ id: sp.id, name: sp.name })))
        setSelectedSportId(prev => prev || sports[0]?.id || '')
        setSelectedSkillId(prev => prev || skills[0]?.id || '')
      } catch (error) {
        console.error('Failed to load options:', error)
      } finally {
        setOptionsLoading(false)
      }
    }
    
    loadOptions()
  }, [])

  // Dynamic year level and section options based on current data
  const yearLevelOptions = useMemo(() => {
    const years = new Set(students.map(({ student }) => student.yearLevel).filter((year): year is string => Boolean(year)))
    return Array.from(years).sort()
  }, [students])

  const sectionOptions = useMemo(() => {
    const sections = new Set(students.map(({ student }) => student.section).filter((section): section is string => Boolean(section)))
    return Array.from(sections).sort()
  }, [students])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterYear, filterSection, reportType, selectedSportId, selectedSkillId])

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  // Handle refresh
  const handleRefresh = () => {
    reportCacheUtils.clear()
    refresh()
  }

  // Handle reset
  const handleReset = () => {
    setSearch('')
    setFilterYear('')
    setFilterSection('')
    setReportType('sports_tryout')
    setReportTypeDescription('')
    setSelectedSportId(sportsOptions[0]?.id || '')
    setSelectedSkillId(skillOptions[0]?.id || '')
    setCurrentPage(1)
  }

  // Handle export with progress
  const handleExportCSV = async () => {
    try {
      // Get all filtered data for export
      const allFilteredStudents = students // This would need to be modified to get all data, not just current page
      
      await exportUtils.exportToCSV(
        allFilteredStudents,
        `spms-report-${(reportTypeDescription.trim() || reportType).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general'}-${new Date().toISOString().slice(0, 10)}.csv`,
        reportType,
        filters,
        skillOptions,
        (progress) => {
          console.log(`Export progress: ${progress}%`)
        }
      )
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  // Get report status for display
  const getReportStatus = (enriched: EnrichedStudent) => {
    return exportUtils.getReportStatus(enriched, reportType, filters, skillOptions)
  }

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
            {optionsLoading ? (
              <FilterSkeleton />
            ) : (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Search</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search" /></span>
                    <input
                      className="form-control"
                      placeholder="Name, email, or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Year Level</label>
                  <select
                    className="form-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
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
                    disabled={loading}
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
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-info rounded-4 px-4"
                    onClick={handleRefresh}
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
                    onClick={handleExportCSV}
                    disabled={loading || students.length === 0}
                  >
                    <i className="bi bi-filetype-csv me-1" /> Export CSV
                  </button>
                  <button type="button" className="btn btn-primary rounded-4" onClick={() => window.print()}>
                    <i className="bi bi-printer me-1" /> Print
                  </button>
                </div>
              </>
            )}
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
              <i className="bi bi-check2-square" /> {totalCount} matched
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
                      <td colSpan={6}>
                        <TableSkeleton />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={6}>
                        <div className="text-center">
                          <div className="text-danger mb-2">{error}</div>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleRefresh}>
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td className="ps-3 py-4" colSpan={6}>
                        <div className="spms-muted text-center">No students matched your filters.</div>
                      </td>
                    </tr>
                  ) : (
                    students.map(({ student, skillNames, violationCount }) => {
                      const reportStatus = getReportStatus({ student, skillNames, violationCount })
                      return reportType === 'sports_tryout' ? (
                        <tr key={student.id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <img className="spms-avatar" src={student.profilePictureDataUrl || avatarUrl} alt="" />
                              <div>
                                <div className="fw-semibold">{student.firstName} {student.middleName} {student.lastName}</div>
                                <div className="spms-muted small">{student.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>{student.yearLevel ?? '—'}</td>
                          <td>{student.section ?? '—'}</td>
                          <td>{student.email ?? '—'}</td>
                          <td>{medicalStatusLabel(normalizeMedicalStatus(student.medicalClearanceStatus || ''))}</td>
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
                                <div className="fw-semibold">{student.firstName} {student.middleName} {student.lastName}</div>
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
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!loading && !error && students.length > 0 ? (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3 border-top spms-no-print">
                <div className="spms-muted small">
                  Showing {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount} students
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-3"
                    onClick={() => handlePageChange(currentPage - 1)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
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
