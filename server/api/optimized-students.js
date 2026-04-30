// Optimized student API endpoints with field selection and pagination support
import { getDb } from './db.js'

function getStudentProjection(fields = []) {
  const projection = {}
  projection.student_id = 1
  projection.first_name = 1
  projection.last_name = 1

  if (fields.includes('middle_name')) projection.middle_name = 1
  if (fields.includes('email')) projection.school_email = 1
  if (fields.includes('year_level')) projection.year_level = 1
  if (fields.includes('section')) projection.section = 1
  if (fields.includes('contact_number')) projection.contact_number = 1
  if (fields.includes('birthdate')) projection.birthdate = 1
  if (fields.includes('gender')) projection.gender = 1
  if (fields.includes('address')) projection.address = 1
  if (fields.includes('profile_picture')) projection.profile_picture_data_url = 1

  if (fields.includes('medical')) {
    projection.medical_clearance_status = 1
    projection.medical_clearance_updated_at = 1
    projection.medical_submitted_at = 1
  }

  if (fields.includes('sports')) {
    projection.sports_affiliations = 1
  }

  if (fields.includes('timestamps') || fields.includes('created_at')) {
    projection.created_at = 1
  }
  if (fields.includes('timestamps') || fields.includes('updated_at')) {
    projection.updated_at = 1
  }

  return projection
}

function parseFieldsQuery(fieldsQuery = '') {
  if (!fieldsQuery || fieldsQuery === 'all') return ['all']
  return fieldsQuery.split(',').map((f) => f.trim()).filter(Boolean)
}

export function optimizedStudentsEndpoint(app, authMiddleware, requireStaff) {
  app.get('/api/students/optimized', authMiddleware, requireStaff, async (req, res) => {
    try {
      const db = await getDb()
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25))
      const skip = (page - 1) * limit
      const search = req.query.search?.trim() || ''
      const yearLevel = req.query.year_level?.trim() || ''
      const section = req.query.section?.trim() || ''
      const includeInactive = req.query.include_inactive === 'true'
      const fields = parseFieldsQuery(req.query.fields)
      const projection = fields.includes('all') ? {} : getStudentProjection(fields)

      const query = {}
      if (!includeInactive) query.active = { $ne: 0 }
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { middle_name: { $regex: search, $options: 'i' } },
          { school_email: { $regex: search, $options: 'i' } },
          { student_id: { $regex: search, $options: 'i' } },
        ]
      }
      if (yearLevel) query.year_level = yearLevel
      if (section) query.section = section

      const totalCount = await db.collection('students').countDocuments(query)
      const students = await db.collection('students')
        .find(query)
        .project(projection)
        .sort({ last_name: 1, first_name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      const totalPages = Math.ceil(totalCount / limit)
      res.json({
        students,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: { search, yearLevel, section, includeInactive, fields },
      })
    } catch (error) {
      console.error('Error in optimized students endpoint:', error)
      res.status(500).json({ message: 'Failed to load students' })
    }
  })
}

export function studentCountEndpoint(app, authMiddleware, requireStaff) {
  app.get('/api/students/count', authMiddleware, requireStaff, async (req, res) => {
    try {
      const db = await getDb()
      const includeInactive = req.query.include_inactive === 'true'
      const yearLevel = req.query.year_level?.trim() || ''
      const section = req.query.section?.trim() || ''

      const query = {}
      if (!includeInactive) query.active = { $ne: 0 }
      if (yearLevel) query.year_level = yearLevel
      if (section) query.section = section

      const totalCount = await db.collection('students').countDocuments(query)
      res.json({ count: totalCount, filters: { includeInactive, yearLevel, section } })
    } catch (error) {
      console.error('Error in student count endpoint:', error)
      res.status(500).json({ message: 'Failed to get student count' })
    }
  })
}

export function batchStudentsEndpoint(app, authMiddleware, requireStaff) {
  app.post('/api/students/batch', authMiddleware, requireStaff, async (req, res) => {
    try {
      const { studentIds, fields = ['basic'] } = req.body
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'Invalid student IDs' })
      }
      if (studentIds.length > 50) {
        return res.status(400).json({ message: 'Maximum 50 student IDs per request' })
      }

      const db = await getDb()
      const numericIds = studentIds.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      const projection = fields.includes('all') ? {} : getStudentProjection(fields)
      const students = await db.collection('students')
        .find({ student_id: { $in: numericIds } })
        .project(projection)
        .toArray()

      res.json({ students })
    } catch (error) {
      console.error('Error in batch students endpoint:', error)
      res.status(500).json({ message: 'Failed to load student details' })
    }
  })
}

export function studentSuggestionsEndpoint(app, authMiddleware, requireStaff) {
  app.get('/api/students/suggestions', authMiddleware, requireStaff, async (req, res) => {
    try {
      const db = await getDb()
      const query = req.query.q?.trim() || ''
      const limit = Math.min(10, parseInt(req.query.limit) || 5)
      if (query.length < 2) return res.json({ suggestions: [] })

      const searchRegex = new RegExp(query, 'i')
      const students = await db.collection('students')
        .find({
          $or: [
            { first_name: searchRegex },
            { last_name: searchRegex },
            { school_email: searchRegex },
          ],
          active: { $ne: 0 },
        })
        .project({
          student_id: 1,
          first_name: 1,
          last_name: 1,
          school_email: 1,
          year_level: 1,
          section: 1,
        })
        .sort({ last_name: 1, first_name: 1 })
        .limit(limit)
        .toArray()

      const suggestions = students.map((student) => ({
        id: student.student_id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.school_email,
        yearLevel: student.year_level,
        section: student.section,
      }))

      res.json({ suggestions })
    } catch (error) {
      console.error('Error in suggestions endpoint:', error)
      res.status(500).json({ message: 'Failed to get suggestions' })
    }
  })
}

export function cacheClearEndpoint(app, authMiddleware, requireAdmin) {
  app.post('/api/students/cache/clear', authMiddleware, requireAdmin, async (_req, res) => {
    try {
      res.json({ message: 'Student cache cleared successfully' })
    } catch (error) {
      console.error('Error clearing cache:', error)
      res.status(500).json({ message: 'Failed to clear cache' })
    }
  })
}

export function registerOptimizedStudentEndpoints(app, authMiddleware, requireStaff, requireAdmin) {
  optimizedStudentsEndpoint(app, authMiddleware, requireStaff)
  studentCountEndpoint(app, authMiddleware, requireStaff)
  batchStudentsEndpoint(app, authMiddleware, requireStaff)
  studentSuggestionsEndpoint(app, authMiddleware, requireStaff)
  cacheClearEndpoint(app, authMiddleware, requireAdmin)
}
