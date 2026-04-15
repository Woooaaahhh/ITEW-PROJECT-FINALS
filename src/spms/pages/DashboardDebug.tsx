import { useState } from 'react'
import { openSpmsDb } from '../db/spmsDb'
import { listStudents } from '../db/students'
import { seedIfEmpty } from '../db/students'
import { loadRegistrarDashboardData } from '../dashboards/dashboardAnalytics'

export function DashboardDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runDiagnostic = async () => {
    setLoading(true)
    setLogs([])
    
    try {
      addLog('Starting diagnostic...')
      
      // Test 1: Basic database connection
      addLog('Testing database connection...')
      const db = await openSpmsDb()
      addLog('Database opened successfully')
      
      // Test 2: Check stores
      addLog(`Available stores: ${Array.from(db.objectStoreNames).join(', ')}`)
      
      // Test 3: Student seeding
      addLog('Testing student seeding...')
      const seedStart = performance.now()
      await seedIfEmpty()
      const seedEnd = performance.now()
      addLog(`Seeding completed in ${(seedEnd - seedStart).toFixed(2)}ms`)
      
      // Test 4: List students
      addLog('Testing student listing...')
      const listStart = performance.now()
      const students = await listStudents()
      const listEnd = performance.now()
      addLog(`Found ${students.length} students in ${(listEnd - listStart).toFixed(2)}ms`)
      
      // Test 5: Dashboard data loading
      addLog('Testing dashboard data loading...')
      const dashStart = performance.now()
      const dashboardData = await loadRegistrarDashboardData()
      const dashEnd = performance.now()
      addLog(`Dashboard data loaded in ${(dashEnd - dashStart).toFixed(2)}ms`)
      addLog(`Dashboard summary: ${JSON.stringify({
        totalStudents: dashboardData.totalStudents,
        withEmail: dashboardData.withEmail,
        uniqueSections: dashboardData.uniqueSections,
        addedLast30Days: dashboardData.addedLast30Days,
        totalViolations: dashboardData.totalViolations,
        totalAchievements: dashboardData.totalAchievements,
        byYearLevelCount: dashboardData.byYearLevel.length,
        medicalMixCount: dashboardData.medicalMix.length,
        recentStudentsCount: dashboardData.recentStudents.length
      }, null, 2)}`)
      
      addLog('Diagnostic completed successfully!')
      
    } catch (error) {
      addLog(`Diagnostic failed: ${error instanceof Error ? error.message : String(error)}`)
      console.error('Diagnostic error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Dashboard Diagnostic Tool</h5>
              <small className="text-muted">Use this tool to identify why the dashboard is stuck loading</small>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <button 
                  className="btn btn-primary me-2" 
                  onClick={runDiagnostic}
                  disabled={loading}
                >
                  {loading ? 'Running Diagnostic...' : 'Run Diagnostic'}
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={clearLogs}
                >
                  Clear Logs
                </button>
              </div>
              
              <div className="border rounded p-3 bg-dark text-light" style={{ maxHeight: '400px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                {logs.length === 0 ? (
                  <div className="text-muted">Click "Run Diagnostic" to start...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
