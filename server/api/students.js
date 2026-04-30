import dns from 'node:dns'
import { MongoClient } from 'mongodb'

// Set Google DNS servers to resolve SRV records
dns.setServers(['8.8.8.8', '8.8.4.4'])

let cachedDb = null

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  
  const db = client.db(process.env.MONGODB_DB_NAME || 'spms')
  cachedDb = db
  
  return db
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ message: 'Missing token' })
  
  try {
    const [, payloadStr] = token.split('.')
    const payload = JSON.parse(atob(payloadStr))
    
    if (payload.exp < Date.now()) {
      return res.status(401).json({ message: 'Token expired' })
    }
    
    req.auth = payload
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function requireStaff(req, res, next) {
  if (req.auth?.role !== 'admin' && req.auth?.role !== 'faculty') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}

// Enhanced student field selection
function getStudentProjection(fields = []) {
  const projection = {}
  
  // Always include essential fields
  projection.student_id = 1
  projection.first_name = 1
  projection.last_name = 1
  
  // Optional fields based on request
  if (fields.includes('middle_name')) projection.middle_name = 1
  if (fields.includes('email')) projection.school_email = 1
  if (fields.includes('year_level')) projection.year_level = 1
  if (fields.includes('section')) projection.section = 1
  if (fields.includes('contact_number')) projection.contact_number = 1
  if (fields.includes('birthdate')) projection.birthdate = 1
  if (fields.includes('gender')) projection.gender = 1
  if (fields.includes('address')) projection.address = 1
  if (fields.includes('profile_picture')) projection.profile_picture_data_url = 1
  
  // Medical fields (only if specifically requested)
  if (fields.includes('medical')) {
    projection.medical_clearance_status = 1
    projection.medical_clearance_updated_at = 1
    projection.medical_submitted_at = 1
  }
  
  // Sports affiliations (only if specifically requested)
  if (fields.includes('sports')) {
    projection.sports_affiliations = 1
  }
  
  // Timestamps
  if (fields.includes('timestamps') || fields.includes('created_at')) {
    projection.created_at = 1
  }
  if (fields.includes('timestamps') || fields.includes('updated_at')) {
    projection.updated_at = 1
  }
  
  return projection
}

// Parse fields from query parameter
function parseFieldsQuery(fieldsQuery = '') {
  if (!fieldsQuery || fieldsQuery === 'all') {
    return ['all'] // Return all fields
  }
  
  return fieldsQuery.split(',').map(f => f.trim()).filter(Boolean)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const db = await connectToDatabase()
    
    // Basic students endpoint
    if (req.method === 'GET' && req.url === '/api/students') {
      const includeInactive = req.query.includeInactive === 'true'
      const query = includeInactive ? {} : { active: { $ne: false } }
      
      const students = await db.collection('students')
        .find(query)
        .sort({ last_name: 1, first_name: 1 })
        .limit(100)
        .toArray()
      
      return res.json({ students })
    }
    
    // Optimized students endpoint with pagination and field selection
    if (req.method === 'GET' && req.url === '/api/students/optimized') {
      // Parse query parameters
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25))
      const skip = (page - 1) * limit
      
      const search = req.query.search?.trim() || ''
      const yearLevel = req.query.year_level?.trim() || ''
      const section = req.query.section?.trim() || ''
      const includeInactive = req.query.include_inactive === 'true'
      
      // Parse fields
      const fields = parseFieldsQuery(req.query.fields)
      const projection = fields.includes('all') ? {} : getStudentProjection(fields)
      
      // Build query
      const query = {}
      
      // Active status filter
      if (!includeInactive) {
        query.active = { $ne: false }
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { middle_name: { $regex: search, $options: 'i' } },
          { school_email: { $regex: search, $options: 'i' } },
          { student_id: { $regex: search, $options: 'i' } }
        ]
      }
      
      // Year level filter
      if (yearLevel) {
        query.year_level = yearLevel
      }
      
      // Section filter
      if (section) {
        query.section = section
      }
      
      // Get total count for pagination
      const totalCount = await db.collection('students').countDocuments(query)
      
      // Get paginated results
      const students = await db.collection('students')
        .find(query)
        .project(projection)
        .sort({ last_name: 1, first_name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray()
      
      // Format response
      const totalPages = Math.ceil(totalCount / limit)
      
      return res.json({
        students,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          search,
          yearLevel,
          section,
          includeInactive,
          fields
        }
      })
    }
    
    // Student count endpoint
    if (req.method === 'GET' && req.url === '/api/students/count') {
      const includeInactive = req.query.include_inactive === 'true'
      const yearLevel = req.query.year_level?.trim() || ''
      const section = req.query.section?.trim() || ''
      
      // Build query
      const query = {}
      
      if (!includeInactive) {
        query.active = { $ne: false }
      }
      
      if (yearLevel) {
        query.year_level = yearLevel
      }
      
      if (section) {
        query.section = section
      }
      
      const totalCount = await db.collection('students').countDocuments(query)
      
      return res.json({
        count: totalCount,
        filters: { includeInactive, yearLevel, section }
      })
    }
    
    // Get single student
    if (req.method === 'GET' && req.url.startsWith('/api/students/')) {
      const id = parseInt(req.url.split('/').pop())
      if (!id) {
        return res.status(400).json({ message: 'Invalid student id' })
      }
      
      const student = await db.collection('students').findOne({ student_id: id })
      
      if (!student) {
        return res.status(404).json({ message: 'Student not found' })
      }
      
      return res.json({ student })
    }
    
    res.status(404).json({ message: 'Endpoint not found' })
    
  } catch (error) {
    console.error('Students API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
