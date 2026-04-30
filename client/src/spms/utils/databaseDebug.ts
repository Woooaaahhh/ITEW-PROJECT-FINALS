import { openSpmsDb } from '../db/spmsDb'
import { listStudents } from '../db/students'

export async function debugDatabaseState(): Promise<void> {
  console.log('=== Database Debug Info ===')
  
  try {
    // Test basic database connection
    console.log('Testing database connection...')
    const db = await openSpmsDb()
    console.log('Database opened successfully')
    
    // Check store names
    console.log('Available stores:', Array.from(db.objectStoreNames))
    
    // Test student operations
    console.log('Testing student operations...')
    const students = await listStudents()
    console.log(`Found ${students.length} students`)
    
    // Test meta store
    console.log('Testing meta store...')
    const meta = await db.get('meta', 'seeded')
    console.log('Meta value:', meta)
    
    console.log('=== Database Debug Complete ===')
  } catch (error) {
    console.error('Database debug failed:', error)
  }
}

export async function testDashboardDataLoading(): Promise<void> {
  console.log('=== Testing Dashboard Data Loading ===')
  
  try {
    // Import the dashboard function
    const { loadRegistrarDashboardData } = await import('../dashboards/dashboardAnalytics')
    
    console.log('Starting dashboard data load...')
    const startTime = performance.now()
    
    const data = await loadRegistrarDashboardData()
    
    const endTime = performance.now()
    console.log(`Dashboard data loaded in ${(endTime - startTime).toFixed(2)}ms`)
    console.log('Data summary:', {
      totalStudents: data.totalStudents,
      withEmail: data.withEmail,
      uniqueSections: data.uniqueSections,
      addedLast30Days: data.addedLast30Days,
      totalViolations: data.totalViolations,
      totalAchievements: data.totalAchievements,
      byYearLevelCount: data.byYearLevel.length,
      medicalMixCount: data.medicalMix.length,
      recentStudentsCount: data.recentStudents.length
    })
    
    console.log('=== Dashboard Test Complete ===')
  } catch (error) {
    console.error('Dashboard data loading failed:', error)
  }
}
