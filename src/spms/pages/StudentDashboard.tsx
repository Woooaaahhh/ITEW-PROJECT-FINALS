/** Powerful Student Dashboard with Charts and Analytics */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import avatarUrl from '../../assets/react.svg'
import { listStudents, seedIfEmpty, type Student } from '../db/students'
import { useAuth } from '../auth/AuthContext'

function fullName(s: Student) {
  const parts = [s.firstName, s.middleName ?? '', s.lastName].filter(Boolean).join(' ')
  return parts.replace(/\s+/g, ' ').trim()
}

export function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const myStudentId = user?.studentId ?? ''

  // Mock data for charts
  const academicPerformance = [
    { month: 'Jan', gpa: 3.2, attendance: 95, assignments: 88 },
    { month: 'Feb', gpa: 3.4, attendance: 92, assignments: 91 },
    { month: 'Mar', gpa: 3.3, attendance: 94, assignments: 85 },
    { month: 'Apr', gpa: 3.6, attendance: 96, assignments: 93 },
    { month: 'May', gpa: 3.5, attendance: 93, assignments: 89 },
    { month: 'Jun', gpa: 3.7, attendance: 97, assignments: 95 },
  ]

  const skillsDistribution = [
    { name: 'Technical', value: 45, fill: '#2563eb' },
    { name: 'Communication', value: 25, fill: '#10b981' },
    { name: 'Leadership', value: 20, fill: '#f59e0b' },
    { name: 'Creative', value: 10, fill: '#8b5cf6' },
  ]

  const subjectPerformance = [
    { subject: 'Mathematics', score: 92, average: 85 },
    { subject: 'Science', score: 88, average: 82 },
    { subject: 'English', score: 95, average: 87 },
    { subject: 'History', score: 86, average: 80 },
    { subject: 'Computer Science', score: 94, average: 88 },
  ]

  const weeklyActivity = [
    { day: 'Mon', hours: 6, tasks: 8 },
    { day: 'Tue', hours: 7, tasks: 10 },
    { day: 'Wed', hours: 5, tasks: 6 },
    { day: 'Thu', hours: 8, tasks: 12 },
    { day: 'Fri', hours: 6, tasks: 9 },
    { day: 'Sat', hours: 4, tasks: 5 },
    { day: 'Sun', hours: 3, tasks: 4 },
  ]

  const radarData = [
    { skill: 'Programming', A: 85, fullMark: 100 },
    { skill: 'Communication', A: 75, fullMark: 100 },
    { skill: 'Teamwork', A: 90, fullMark: 100 },
    { skill: 'Problem Solving', A: 88, fullMark: 100 },
    { skill: 'Leadership', A: 70, fullMark: 100 },
    { skill: 'Creativity', A: 82, fullMark: 100 },
  ]

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

  useEffect(() => {
    if (searchParams.get('medical') === '1' && myStudentId) {
      navigate('/medical', { replace: true })
      return
    }
    if (searchParams.get('medical') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('medical')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, myStudentId, navigate, setSearchParams])

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header Stats */}
      <div className="row g-3">
        <div className="col-12 col-md-3">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(37, 99, 235, .12)',
                  border: '1px solid rgba(37, 99, 235, .20)',
                  color: '#2563eb'
                }}>
                  <i className="bi bi-graph-up" style={{ fontSize: '1.5rem' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>3.6</div>
                  <div className="spms-muted small">Current GPA</div>
                  <div className="text-success small fw-semibold">+0.2 from last month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(16, 185, 129, .12)',
                  border: '1px solid rgba(16, 185, 129, .20)',
                  color: '#10b981'
                }}>
                  <i className="bi bi-calendar-check" style={{ fontSize: '1.5rem' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>94%</div>
                  <div className="spms-muted small">Attendance Rate</div>
                  <div className="text-success small fw-semibold">Above average</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(245, 158, 11, .12)',
                  border: '1px solid rgba(245, 158, 11, .20)',
                  color: '#f59e0b'
                }}>
                  <i className="bi bi-trophy" style={{ fontSize: '1.5rem' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>12</div>
                  <div className="spms-muted small">Achievements</div>
                  <div className="text-warning small fw-semibold">3 this month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon" style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(139, 92, 246, .12)',
                  border: '1px solid rgba(139, 92, 246, .20)',
                  color: '#8b5cf6'
                }}>
                  <i className="bi bi-award" style={{ fontSize: '1.5rem' }} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>8</div>
                  <div className="spms-muted small">Skills Acquired</div>
                  <div className="text-primary small fw-semibold">2 in progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Academic Performance Trend</h6>
              <div className="spms-muted small">GPA, Attendance & Assignment Completion</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={academicPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="gpa" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 6 }} name="GPA" />
                  <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 6 }} name="Attendance %" />
                  <Line type="monotone" dataKey="assignments" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 6 }} name="Assignments %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Skills Distribution</h6>
              <div className="spms-muted small">Your skill categories</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={skillsDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {skillsDistribution.map((entry, index) => (
                      <Cell key={`skill-${entry.name}-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Subject Performance</h6>
              <div className="spms-muted small">Your scores vs class average</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                  />
                  <Legend />
                  <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} name="Your Score" />
                  <Bar dataKey="average" fill="#94a3b8" radius={[8, 8, 0, 0]} name="Class Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Weekly Activity</h6>
              <div className="spms-muted small">Study hours & tasks completed</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="hours" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} name="Study Hours" />
                  <Area type="monotone" dataKey="tasks" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Tasks Completed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Radar Chart */}
      <div className="row g-4">
        <div className="col-12">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Skills Assessment</h6>
              <div className="spms-muted small">Comprehensive skill evaluation</div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="skill" stroke="#6b7280" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                  <Radar name="Your Skills" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} strokeWidth={2} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row g-4">
        <div className="col-12">
          <div className="spms-card card border-0" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15, 23, 42, .06)' }}>
            <div className="card-header bg-transparent border-bottom">
              <h6 className="fw-bold mb-0">Quick Actions</h6>
              <div className="spms-muted small">Access important features</div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <Link to="/student/records" className="text-decoration-none">
                    <div className="spms-card card h-100 border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)', transition: 'transform 0.2s ease', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div className="card-body text-center">
                        <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2rem' }} />
                        <div className="fw-semibold mt-2">My Records</div>
                        <div className="spms-muted small">View violations & skills</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-12 col-md-3">
                  <Link to="/medical" className="text-decoration-none">
                    <div className="spms-card card h-100 border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)', transition: 'transform 0.2s ease', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div className="card-body text-center">
                        <i className="bi bi-heart-pulse text-primary" style={{ fontSize: '2rem' }} />
                        <div className="fw-semibold mt-2">Medical</div>
                        <div className="spms-muted small">Health records</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-12 col-md-3">
                  <Link to="#" className="text-decoration-none">
                    <div className="spms-card card h-100 border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)', transition: 'transform 0.2s ease', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div className="card-body text-center">
                        <i className="bi bi-calendar3 text-info" style={{ fontSize: '2rem' }} />
                        <div className="fw-semibold mt-2">Schedule</div>
                        <div className="spms-muted small">View calendar</div>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-12 col-md-3">
                  <Link to={`/students/${myStudentId}`} className="text-decoration-none">
                    <div className="spms-card card h-100 border-0" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(15, 23, 42, .06)', transition: 'transform 0.2s ease', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                      <div className="card-body text-center">
                        <i className="bi bi-person text-success" style={{ fontSize: '2rem' }} />
                        <div className="fw-semibold mt-2">Profile</div>
                        <div className="spms-muted small">My information</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
