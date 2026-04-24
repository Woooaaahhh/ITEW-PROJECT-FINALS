import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from './db.js'
import { signToken, verifyToken } from './jwt.js'

const PORT = Number(process.env.API_PORT || 3001)

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '8mb' }))

function isDuplicateKeyError(error) {
  return error && typeof error === 'object' && error.code === 11000
}

function duplicateKeyField(error) {
  if (!isDuplicateKeyError(error)) return null
  const keys = Object.keys(error?.keyPattern ?? {})
  return keys[0] ?? null
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function nextSequence(db, name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  if (typeof result?.value === 'number') return result.value
  if (typeof result?.value?.value === 'number') return result.value.value
  return 1
}

async function setSequenceAtLeast(db, name, minValue) {
  await db.collection('counters').updateOne(
    { _id: name },
    { $max: { value: minValue } },
    { upsert: true },
  )
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

function pickUser(row) {
  return {
    user_id: row.user_id,
    username: row.username,
    email: row.email,
    role: row.role,
    faculty_type: row.faculty_type ?? null,
    active: row.active ?? 1,
    created_at: row.created_at ?? null,
  }
}

async function studentIdForUserId(db, userId) {
  if (userId == null || Number.isNaN(Number(userId))) return null
  const st = await db.collection('students').findOne({ user_id: Number(userId) }, { projection: { student_id: 1 } })
  return st?.student_id ?? null
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ message: 'Missing token' })
  try {
    req.auth = verifyToken(token)
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
  return next()
}

function requireStaff(req, res, next) {
  if (req.auth?.role !== 'admin' && req.auth?.role !== 'faculty') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}

function requireStaffOrStudent(req, res, next) {
  if (req.auth?.role === 'admin' || req.auth?.role === 'faculty' || req.auth?.role === 'student') {
    return next()
  }
  return res.status(403).json({ message: 'Forbidden' })
}

/** Students may read only their own profile by numeric student_id; staff unchanged. */
async function requireStaffOrOwnStudentProfile(req, res, next) {
  const role = req.auth?.role
  if (role === 'admin' || role === 'faculty') return next()
  if (role !== 'student') return res.status(403).json({ message: 'Forbidden' })
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid student id' })
  try {
    const db = await getDb()
    const userId = Number(req.auth?.sub)
    const st = await db.collection('students').findOne({ user_id: userId }, { projection: { student_id: 1 } })
    if (!st || Number(st.student_id) !== id) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  } catch {
    return res.status(500).json({ message: 'Server error' })
  }
}

function requireInstructionEditor(req, res, next) {
  if (req.auth?.role !== 'admin' && req.auth?.role !== 'faculty') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  return next()
}

app.post('/api/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input' })
  }

  const { identifier, password } = parsed.data
  const id = identifier.toLowerCase()

  const db = await getDb()
  const row = await db.collection('users').findOne(
    {
      $or: [
        { username: { $regex: `^${escapeRegex(id)}$`, $options: 'i' } },
        { email: { $regex: `^${escapeRegex(id)}$`, $options: 'i' } },
      ],
    },
    {
      projection: {
        _id: 0,
        user_id: 1,
        username: 1,
        email: 1,
        password: 1,
        role: 1,
        faculty_type: 1,
        active: 1,
        created_at: 1,
      },
    },
  )

  if (!row) return res.status(401).json({ message: 'Invalid username/email or password' })
  if ((row.active ?? 1) !== 1) return res.status(403).json({ message: 'Account is deactivated' })

  const ok = await bcrypt.compare(password, row.password)
  if (!ok) return res.status(401).json({ message: 'Invalid username/email or password' })

  const token = signToken({ sub: String(row.user_id), role: row.role })
  const base = pickUser(row)
  let userOut = base
  if (row.role === 'student') {
    const student_id = await studentIdForUserId(db, row.user_id)
    userOut = { ...base, student_id }
  }
  return res.json({ token, user: userOut })
})

app.get('/api/user', authMiddleware, async (req, res) => {
  const db = await getDb()
  const userId = Number(req.auth?.sub)
  if (!userId) return res.status(401).json({ message: 'Invalid token' })

  const row = await db.collection('users').findOne(
    { user_id: userId },
    { projection: { _id: 0, password: 0 } },
  )

  if (!row) return res.status(404).json({ message: 'User not found' })
  if ((row.active ?? 1) !== 1) return res.status(403).json({ message: 'Account is deactivated' })
  let userPayload = row
  if (row.role === 'student') {
    const student_id = await studentIdForUserId(db, userId)
    userPayload = { ...row, student_id }
  }
  return res.json({ user: userPayload })
})

// Public read: Add Student and other forms need sections even when the API was started
// before login headers are applied; avoids blocking local IndexedDB student creation.
app.get('/api/sections', async (_req, res) => {
  const db = await getDb()
  const rows = await db
    .collection('sections')
    .aggregate([
      {
        $lookup: {
          from: 'users',
          let: { facultyUserId: '$faculty_user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$user_id', '$$facultyUserId'] },
                    { $eq: [{ $toString: '$user_id' }, { $toString: '$$facultyUserId' }] },
                  ],
                },
              },
            },
            {
              $project: { _id: 0, username: 1 },
            },
          ],
          as: 'faculty_user',
        },
      },
      {
        $addFields: {
          faculty_name: {
            $let: {
              vars: { faculty: { $arrayElemAt: ['$faculty_user', 0] } },
              in: '$$faculty.username',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          faculty_user: 0,
        },
      },
      {
        $sort: { year_level: 1, section: 1 },
      },
    ])
    .toArray()
  return res.json({ sections: rows })
})

const createSectionSchema = z.object({
  year_level: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(40),
  faculty_user_id: z.number().int().positive().nullable().optional(),
})

const updateSectionSchema = z.object({
  year_level: z.string().trim().min(1).max(20).optional(),
  section: z.string().trim().min(1).max(40).optional(),
  faculty_user_id: z.number().int().positive().nullable().optional(),
})

app.post('/api/sections', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = createSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const { year_level, section } = parsed.data
  const db = await getDb()
  if (parsed.data.faculty_user_id != null) {
    const faculty = await db.collection('users').findOne(
      { user_id: parsed.data.faculty_user_id, role: 'faculty', active: 1 },
      { projection: { _id: 0, user_id: 1 } },
    )
    if (!faculty) return res.status(400).json({ message: 'Invalid faculty user' })
  }
  try {
    const created = {
      section_id: await nextSequence(db, 'sections'),
      year_level,
      section,
      faculty_user_id: parsed.data.faculty_user_id ?? null,
      created_at: new Date(),
    }
    await db.collection('sections').insertOne(created)
    return res.status(201).json({ section: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Section already exists for this year level' })
    }
    return res.status(409).json({ message: 'Section already exists for this year level' })
  }
})

app.put('/api/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })

  const parsed = updateSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const db = await getDb()
  const existing = await db.collection('sections').findOne({ section_id: id }, { projection: { _id: 0, section_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Section not found' })
  if (parsed.data.faculty_user_id != null) {
    const faculty = await db.collection('users').findOne(
      { user_id: parsed.data.faculty_user_id, role: 'faculty', active: 1 },
      { projection: { _id: 0, user_id: 1 } },
    )
    if (!faculty) return res.status(400).json({ message: 'Invalid faculty user' })
  }
  const fields = {}
  if (parsed.data.year_level !== undefined) fields.year_level = parsed.data.year_level
  if (parsed.data.section !== undefined) fields.section = parsed.data.section
  if (parsed.data.faculty_user_id !== undefined) fields.faculty_user_id = parsed.data.faculty_user_id
  if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields to update' })

  try {
    await db.collection('sections').updateOne({ section_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Section already exists for this year level' })
    }
    return res.status(500).json({ message: 'Failed to update section' })
  }

  const updated = await db.collection('sections').findOne({ section_id: id }, { projection: { _id: 0 } })
  return res.json({ section: updated })
})

app.delete('/api/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })

  const db = await getDb()
  const existing = await db.collection('sections').findOne({ section_id: id }, { projection: { _id: 0, section_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Section not found' })

  await db.collection('sections').deleteOne({ section_id: id })
  return res.json({ ok: true })
})

const facultyTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)

// Gmail validation regex
const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/

// Password validation: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(120).refine((email) => {
    // For student role, require Gmail; for faculty, allow any valid email
    return true // Will be validated in the route handler based on role
  }, 'Email must be valid'),
  password: z.string().min(8).max(100).refine((password) => {
    return passwordRegex.test(password)
  }, 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number'),
  role: z.enum(['faculty', 'student']),
  faculty_type: facultyTypeSchema.nullable().optional(),
  student: z
    .object({
      first_name: z.string().trim().min(1).max(80),
      last_name: z.string().trim().min(1).max(80),
      year_level: z.string().trim().min(1).max(20),
      section: z.string().trim().min(1).max(40),
    })
    .optional(),
})

app.get('/api/users', authMiddleware, requireAdmin, async (_req, res) => {
  const db = await getDb()
  const rows = await db
    .collection('users')
    .find({}, { projection: { _id: 0, password: 0 } })
    .sort({ user_id: -1 })
    .toArray()
  return res.json({ users: rows })
})

app.get('/api/students', authMiddleware, requireStaff, async (req, res) => {
  const db = await getDb()
  const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true'

  // Students collection already has unique indexes on {student_id} and {user_id}.
  // Using a simpler pipeline avoids unnecessary grouping for faster list loads.
  const pipeline = [
    { $lookup: { from: 'users', localField: 'user_id', foreignField: 'user_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.role': 'student', ...(includeInactive ? {} : { 'user.active': 1 }) } },
    {
      $project: {
        _id: 0,
        student_id: 1,
        user_id: 1,
        first_name: 1,
        middle_name: 1,
        last_name: 1,
        birthdate: 1,
        gender: 1,
        address: 1,
        contact_number: 1,
        year_level: 1,
        section: 1,
        profile_picture_data_url: 1,
        email: '$user.email',
        active: '$user.active',
        medical_clearance_status: 1,
        medical_clearance_updated_at: 1,
        medical_clearance_notes: 1,
        medical_height: 1,
        medical_weight: 1,
        medical_blood_pressure: 1,
        medical_condition: 1,
        medical_physician_name: 1,
        medical_exam_date: 1,
        medical_form_details: 1,
        medical_document_data_url: 1,
        medical_submitted_at: 1,
      },
    },
    { $sort: { last_name: 1, first_name: 1, student_id: 1 } },
  ]

  const students = await db.collection('students').aggregate(pipeline).toArray()
  return res.json({ students })
})

const medicalClearanceStatusZ = z.enum(['pending', 'approved', 'rejected'])

const updateStudentSchema = z.object({
  first_name: z.string().trim().min(1).max(80).optional(),
  middle_name: z.string().trim().max(80).nullable().optional(),
  last_name: z.string().trim().min(1).max(80).optional(),
  birthdate: z.string().trim().max(40).nullable().optional(),
  gender: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  school_email: z.string().trim().email().max(120).nullable().optional(),
  contact_number: z.string().trim().max(40).nullable().optional(),
  year_level: z.string().trim().max(20).nullable().optional(),
  section: z.string().trim().max(40).nullable().optional(),
  profile_picture_data_url: z.string().trim().max(200000).nullable().optional(),
  medical_clearance_status: medicalClearanceStatusZ.optional(),
  medical_clearance_updated_at: z.string().trim().max(80).nullable().optional(),
  medical_clearance_notes: z.string().trim().max(8000).nullable().optional(),
  medical_height: z.string().trim().max(40).nullable().optional(),
  medical_weight: z.string().trim().max(40).nullable().optional(),
  medical_blood_pressure: z.string().trim().max(40).nullable().optional(),
  medical_condition: z.string().trim().max(4000).nullable().optional(),
  medical_physician_name: z.string().trim().max(120).nullable().optional(),
  medical_exam_date: z.string().trim().max(40).nullable().optional(),
  medical_form_details: z.string().trim().max(12000).nullable().optional(),
  medical_document_data_url: z.string().trim().max(4000000).nullable().optional(),
  medical_submitted_at: z.string().trim().max(80).nullable().optional(),
})

const PROFILE_UPDATE_KEYS = new Set([
  'first_name',
  'middle_name',
  'last_name',
  'birthdate',
  'gender',
  'address',
  'school_email',
  'contact_number',
  'year_level',
  'section',
  'profile_picture_data_url',
])

const MEDICAL_UPDATE_KEYS = new Set([
  'medical_clearance_status',
  'medical_clearance_updated_at',
  'medical_clearance_notes',
  'medical_height',
  'medical_weight',
  'medical_blood_pressure',
  'medical_condition',
  'medical_physician_name',
  'medical_exam_date',
  'medical_form_details',
  'medical_document_data_url',
  'medical_submitted_at',
])

function pickDefinedKeys(obj, allowedKeys) {
  const out = {}
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key]
    }
  }
  return out
}

app.get('/api/students/:id', authMiddleware, requireStaffOrOwnStudentProfile, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid student id' })
  const db = await getDb()

  const row = await db.collection('students').findOne({ student_id: id }, { projection: { _id: 0 } })
  if (!row) return res.status(404).json({ message: 'Student not found' })

  const user = await db.collection('users').findOne({ user_id: row.user_id }, { projection: { _id: 0, email: 1, active: 1 } })
  return res.json({
    student: {
      ...row,
      email: user?.email ?? null,
      active: user?.active ?? 1,
    },
  })
})

app.put('/api/students/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid student id' })
  const parsed = updateStudentSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues?.[0]
    return res.status(400).json({ message: first?.message || 'Invalid input' })
  }

  const db = await getDb()
  const existing = await db.collection('students').findOne({ student_id: id }, { projection: { _id: 0, student_id: 1, user_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Student not found' })

  const role = req.auth?.role
  const userId = Number(req.auth?.sub)
  const data = parsed.data

  let fields = {}
  if (role === 'admin') {
    fields = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  } else if (role === 'faculty') {
    fields = pickDefinedKeys(data, MEDICAL_UPDATE_KEYS)
  } else if (role === 'student') {
    // `user_id` may be stored as a string in some DBs; compare numerically.
    if (Number(existing.user_id) !== Number(userId)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    fields = pickDefinedKeys(data, MEDICAL_UPDATE_KEYS)
    if (
      Object.prototype.hasOwnProperty.call(fields, 'medical_clearance_status') &&
      fields.medical_clearance_status !== 'pending'
    ) {
      return res.status(403).json({ message: 'Students may only submit medical records for review (pending).' })
    }
  } else {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (role === 'faculty' || role === 'student') {
    const leakedProfile = Object.keys(data).filter((k) => PROFILE_UPDATE_KEYS.has(k) && data[k] !== undefined)
    if (leakedProfile.length > 0) {
      return res.status(403).json({ message: 'Forbidden' })
    }
  }

  if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields to update' })

  await db.collection('students').updateOne({ student_id: id }, { $set: fields })
  const updated = await db.collection('students').findOne({ student_id: id }, { projection: { _id: 0 } })
  const user = await db.collection('users').findOne({ user_id: existing.user_id }, { projection: { _id: 0, email: 1, active: 1 } })
  return res.json({
    student: {
      ...updated,
      email: user?.email ?? null,
      active: user?.active ?? 1,
    },
  })
})

app.delete('/api/students/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid student id' })
  const db = await getDb()
  const existing = await db.collection('students').findOne({ student_id: id }, { projection: { _id: 0, student_id: 1, user_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Student not found' })

  await db.collection('student_skills').deleteMany({ student_id: id })
  await db.collection('students').deleteOne({ student_id: id })
  await db.collection('users').deleteOne({ user_id: existing.user_id })
  return res.json({ ok: true })
})

app.post('/api/create-user', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues?.[0]
    return res.status(400).json({ message: first?.message || 'Invalid input' })
  }

  const { email, password, role } = parsed.data
  const faculty_type = role === 'faculty' ? (parsed.data.faculty_type ?? null) : null
  const student = role === 'student' ? parsed.data.student : undefined

  // Additional validation based on role
  let username = parsed.data.username
  if (role === 'student') {
    if (!gmailRegex.test(email)) {
      return res.status(400).json({ message: 'Students must use a Gmail address (@gmail.com)' })
    }
    // For students, use Gmail as username instead of provided username
    username = email.trim().toLowerCase()
  }

  if (role === 'faculty' && !faculty_type) {
    return res.status(400).json({ message: 'Faculty type is required' })
  }
  if (role === 'student' && !student) {
    return res.status(400).json({ message: 'Student profile fields are required' })
  }

  const db = await getDb()
  const hash = await bcrypt.hash(password, 10)
  let userId = null

  try {
    userId = await nextSequence(db, 'users')
    await db.collection('users').insertOne({
      user_id: userId,
      username,
      email,
      password: hash,
      role,
      faculty_type,
      active: 1,
      created_at: new Date(),
    })

    if (role === 'student' && student) {
      let createdStudent = false
      for (let attempts = 0; attempts < 3 && !createdStudent; attempts += 1) {
        const studentId = await nextSequence(db, 'students')
        try {
          await db.collection('students').insertOne({
            student_id: studentId,
            user_id: userId,
            first_name: student.first_name,
            last_name: student.last_name,
            year_level: student.year_level,
            section: student.section,
          })
          createdStudent = true
        } catch (studentError) {
          const dupField = duplicateKeyField(studentError)
          if (dupField === 'student_id') {
            const maxStudent = await db
              .collection('students')
              .find({}, { projection: { student_id: 1 } })
              .sort({ student_id: -1 })
              .limit(1)
              .toArray()
            const maxStudentId = maxStudent[0]?.student_id ?? 0
            await setSequenceAtLeast(db, 'students', maxStudentId)
            continue
          }
          throw studentError
        }
      }
      if (!createdStudent) throw new Error('Could not allocate student_id')
    }

    const created = await db.collection('users').findOne(
      { user_id: userId },
      { projection: { _id: 0, password: 0 } },
    )
    return res.status(201).json({ user: created })
  } catch (e) {
    if (userId != null) {
      await db.collection('students').deleteOne({ user_id: userId })
      await db.collection('users').deleteOne({ user_id: userId })
    }
    if (isDuplicateKeyError(e)) {
      const dupField = duplicateKeyField(e)
      if (dupField === 'username' || dupField === 'email') {
        return res.status(409).json({ message: 'Username or email already exists' })
      }
      if (dupField === 'student_id' || dupField === 'user_id') {
        return res.status(500).json({ message: 'ID allocator conflict, please try again' })
      }
      return res.status(409).json({ message: 'Duplicate key conflict' })
    }
    return res.status(500).json({ message: 'Failed to create user' })
  }
})

const updateUserSchema = z.object({
  email: z.string().trim().email().max(120).optional(),
  faculty_type: facultyTypeSchema.nullable().optional(),
  active: z.number().int().min(0).max(1).optional(),
})

app.put('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid user id' })

  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const db = await getDb()
  const existing = await db
    .collection('users')
    .findOne({ user_id: id }, { projection: { _id: 0, user_id: 1, role: 1 } })
  if (!existing) return res.status(404).json({ message: 'User not found' })
  if (existing.role === 'admin') return res.status(403).json({ message: 'Cannot modify admin account' })

  const fields = {}
  if (parsed.data.email !== undefined) {
    fields.email = parsed.data.email
  }
  if (parsed.data.active !== undefined) {
    fields.active = parsed.data.active
  }
  if (parsed.data.faculty_type !== undefined) {
    fields.faculty_type = parsed.data.faculty_type
  }
  if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields to update' })

  try {
    await db.collection('users').updateOne({ user_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Email already exists' })
    }
    return res.status(409).json({ message: 'Email already exists' })
  }

  const updated = await db.collection('users').findOne(
    { user_id: id },
    { projection: { _id: 0, password: 0 } },
  )
  return res.json({ user: updated })
})

app.delete('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid user id' })

  const db = await getDb()
  const existing = await db
    .collection('users')
    .findOne({ user_id: id }, { projection: { _id: 0, user_id: 1, role: 1 } })
  if (!existing) return res.status(404).json({ message: 'User not found' })
  if (existing.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin account' })

  await db.collection('users').updateOne({ user_id: id }, { $set: { active: 0 } })
  return res.json({ ok: true })
})

const qualificationCategorySchema = z.string().trim().min(1).max(80)

const skillSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
})

const updateSkillSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
})

app.get('/api/skills', authMiddleware, requireStaffOrStudent, async (req, res) => {
  const db = await getDb()
  const activeOnly = String(req.query.activeOnly || '').toLowerCase() === 'true'
  const query = activeOnly ? { is_active: 1 } : {}
  const skills = await db
    .collection('skills')
    .find(query, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .toArray()
  return res.json({ skills })
})

app.post('/api/skills', authMiddleware, requireStaff, async (req, res) => {
  const parsed = skillSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const db = await getDb()
  const { name, category } = parsed.data
  try {
    const skill = {
      skill_id: await nextSequence(db, 'skills'),
      name,
      category,
      is_active: 1,
      created_at: new Date(),
    }
    await db.collection('skills').insertOne(skill)
    return res.status(201).json({ skill })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Skill already exists' })
    return res.status(500).json({ message: 'Failed to create skill' })
  }
})

app.put('/api/skills/:id', authMiddleware, requireStaff, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid skill id' })
  const parsed = updateSkillSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const fields = {}
  if (parsed.data.name !== undefined) fields.name = parsed.data.name
  if (parsed.data.category !== undefined) fields.category = parsed.data.category
  if (parsed.data.is_active !== undefined) fields.is_active = parsed.data.is_active
  if (Object.keys(fields).length === 0) return res.status(400).json({ message: 'No fields to update' })

  const db = await getDb()
  const existing = await db.collection('skills').findOne({ skill_id: id }, { projection: { _id: 0, skill_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Skill not found' })
  try {
    await db.collection('skills').updateOne({ skill_id: id }, { $set: fields })
    const updated = await db.collection('skills').findOne({ skill_id: id }, { projection: { _id: 0 } })
    return res.json({ skill: updated })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Skill already exists' })
    return res.status(500).json({ message: 'Failed to update skill' })
  }
})

app.delete('/api/skills/:id', authMiddleware, requireStaff, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid skill id' })
  const db = await getDb()
  const existing = await db.collection('skills').findOne({ skill_id: id }, { projection: { _id: 0, skill_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Skill not found' })
  await db.collection('student_skills').deleteMany({ skill_id: id })
  await db.collection('skills').deleteOne({ skill_id: id })
  return res.json({ ok: true })
})

app.get('/api/qualification-reports', authMiddleware, requireStaff, async (req, res) => {
  const db = await getDb()
  const categoryRaw = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : ''
  if (categoryRaw) {
    const parsed = qualificationCategorySchema.safeParse(categoryRaw)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid category' })
    }
  }

  const matchSkill = { 'skill.is_active': 1 }
  if (categoryRaw) matchSkill['skill.category'] = categoryRaw

  const rows = await db
    .collection('student_skills')
    .aggregate([
      { $lookup: { from: 'students', localField: 'student_id', foreignField: 'student_id', as: 'student' } },
      { $unwind: '$student' },
      { $lookup: { from: 'users', localField: 'student.user_id', foreignField: 'user_id', as: 'user' } },
      { $unwind: '$user' },
      { $lookup: { from: 'skills', localField: 'skill_id', foreignField: 'skill_id', as: 'skill' } },
      { $unwind: '$skill' },
      { $match: { ...matchSkill, 'user.active': 1, 'user.role': 'student' } },
      {
        $project: {
          _id: 0,
          student_id: '$student.student_id',
          user_id: '$user.user_id',
          first_name: '$student.first_name',
          last_name: '$student.last_name',
          category: '$skill.category',
          skill_name: '$skill.name',
        },
      },
      { $sort: { last_name: 1, first_name: 1, skill_name: 1 } },
    ])
    .toArray()

  const map = new Map()
  for (const row of rows) {
    const key = String(row.student_id)
    if (!map.has(key)) {
      map.set(key, {
        student_id: row.student_id,
        user_id: row.user_id,
        name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
        skills: [],
      })
    }
    const student = map.get(key)
    student.skills.push({
      category: row.category,
      name: row.skill_name,
    })
  }

  return res.json({
    category: categoryRaw || 'all',
    students: Array.from(map.values()),
  })
})

const syllabusSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().default(''),
  course_code: z.string().trim().max(50).optional().default(''),
  faculty_user_id: z.number().int().positive().nullable().optional(),
})

const syllabusUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  course_code: z.string().trim().max(50).optional(),
  faculty_user_id: z.number().int().positive().nullable().optional(),
  is_archived: z.number().int().min(0).max(1).optional(),
})

const lessonSchema = z.object({
  syllabus_id: z.number().int().positive(),
  title: z.string().trim().min(1).max(220),
  content: z.string().trim().max(12000).optional().default(''),
  curriculum_unit: z.string().trim().max(120).optional().default(''),
  week_number: z.number().int().min(1).max(52).optional().nullable(),
  order_index: z.number().int().min(1).max(1000).optional(),
})

const lessonUpdateSchema = z.object({
  title: z.string().trim().min(1).max(220).optional(),
  content: z.string().trim().max(12000).optional(),
  curriculum_unit: z.string().trim().max(120).optional(),
  week_number: z.number().int().min(1).max(52).optional().nullable(),
  order_index: z.number().int().min(1).max(1000).optional(),
  is_archived: z.number().int().min(0).max(1).optional(),
})

const curriculumReorderSchema = z.object({
  lessons: z.array(
    z.object({
      lesson_id: z.number().int().positive(),
      order_index: z.number().int().min(1).max(1000),
      curriculum_unit: z.string().trim().max(120).optional(),
      week_number: z.number().int().min(1).max(52).optional().nullable(),
    }),
  ),
})

// Scheduling: Course -> Section -> Rooms -> Lab -> Faculty
const scheduleCourseSchema = z.object({
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(160),
})

const scheduleCourseUpdateSchema = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  title: z.string().trim().min(1).max(160).optional(),
})

const scheduleSectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

const scheduleSectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
})

const roomSchema = z.object({
  section_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  building: z.string().trim().max(80).optional().nullable(),
  capacity: z.number().int().min(0).max(1000).optional().nullable(),
})

const roomUpdateSchema = z.object({
  section_id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  building: z.string().trim().max(80).optional().nullable(),
  capacity: z.number().int().min(0).max(1000).optional().nullable(),
})

const labSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

const labUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  faculty_user_id: z.number().int().positive().nullable().optional(),
})

app.get('/api/instruction/syllabi', authMiddleware, async (req, res) => {
  const db = await getDb()
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true'
  const query = includeArchived ? {} : { is_archived: { $ne: 1 } }
  const syllabi = await db
    .collection('syllabi')
    .aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'users',
          let: { facultyUserId: '$faculty_user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$user_id', '$$facultyUserId'] },
                    { $eq: [{ $toString: '$user_id' }, { $toString: '$$facultyUserId' }] },
                  ],
                },
              },
            },
            {
              $project: { _id: 0, username: 1 },
            },
          ],
          as: 'faculty_user',
        },
      },
      {
        $addFields: {
          faculty_name: {
            $let: {
              vars: { faculty: { $arrayElemAt: ['$faculty_user', 0] } },
              in: '$$faculty.username',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          faculty_user: 0,
        },
      },
      { $sort: { created_at: -1 } },
    ])
    .toArray()
  return res.json({ syllabi })
})

app.post('/api/instruction/syllabi', authMiddleware, requireInstructionEditor, async (req, res) => {
  const parsed = syllabusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  if (parsed.data.faculty_user_id !== undefined && req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can assign faculty to courses' })
  }
  if (parsed.data.faculty_user_id != null) {
    const faculty = await db.collection('users').findOne(
      { user_id: parsed.data.faculty_user_id, role: 'faculty', active: 1 },
      { projection: { _id: 0, user_id: 1 } },
    )
    if (!faculty) return res.status(400).json({ message: 'Invalid faculty user' })
  }
  const created = {
    syllabus_id: await nextSequence(db, 'syllabi'),
    title: parsed.data.title,
    description: parsed.data.description,
    course_code: parsed.data.course_code,
    faculty_user_id: parsed.data.faculty_user_id ?? null,
    is_archived: 0,
    created_by: Number(req.auth?.sub) || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.collection('syllabi').insertOne(created)
  return res.status(201).json({ syllabus: created })
})

app.put('/api/instruction/syllabi/:id', authMiddleware, requireInstructionEditor, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid syllabus id' })
  const parsed = syllabusUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()

  const fields = {}
  if (parsed.data.title !== undefined) fields.title = parsed.data.title
  if (parsed.data.description !== undefined) fields.description = parsed.data.description
  if (parsed.data.course_code !== undefined) fields.course_code = parsed.data.course_code
  if (parsed.data.faculty_user_id !== undefined) {
    if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Only admin can assign faculty to courses' })
    if (parsed.data.faculty_user_id != null) {
      const faculty = await db.collection('users').findOne(
        { user_id: parsed.data.faculty_user_id, role: 'faculty', active: 1 },
        { projection: { _id: 0, user_id: 1 } },
      )
      if (!faculty) return res.status(400).json({ message: 'Invalid faculty user' })
    }
    fields.faculty_user_id = parsed.data.faculty_user_id
  }
  if (parsed.data.is_archived !== undefined) fields.is_archived = parsed.data.is_archived
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })

  const existing = await db.collection('syllabi').findOne({ syllabus_id: id }, { projection: { _id: 0, syllabus_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Syllabus not found' })
  await db.collection('syllabi').updateOne({ syllabus_id: id }, { $set: fields })
  const updated = await db.collection('syllabi').findOne({ syllabus_id: id }, { projection: { _id: 0 } })
  return res.json({ syllabus: updated })
})

app.delete('/api/instruction/syllabi/:id', authMiddleware, requireInstructionEditor, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid syllabus id' })
  const db = await getDb()
  const existing = await db.collection('syllabi').findOne({ syllabus_id: id }, { projection: { _id: 0, syllabus_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Syllabus not found' })

  const hardDelete = req.auth?.role === 'admin' && String(req.query.hard || '').toLowerCase() === 'true'
  if (hardDelete) {
    await db.collection('lessons').deleteMany({ syllabus_id: id })
    await db.collection('syllabi').deleteOne({ syllabus_id: id })
    return res.json({ ok: true, mode: 'deleted' })
  }

  await db.collection('syllabi').updateOne({ syllabus_id: id }, { $set: { is_archived: 1, updated_at: new Date() } })
  await db.collection('lessons').updateMany({ syllabus_id: id }, { $set: { is_archived: 1, updated_at: new Date() } })
  return res.json({ ok: true, mode: 'archived' })
})

app.get('/api/instruction/syllabi/:id/lessons', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid syllabus id' })
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true'
  const query = includeArchived ? { syllabus_id: id } : { syllabus_id: id, is_archived: { $ne: 1 } }
  const db = await getDb()
  const syllabus = await db.collection('syllabi').findOne({ syllabus_id: id }, { projection: { _id: 0 } })
  if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' })
  const lessons = await db
    .collection('lessons')
    .find(query, { projection: { _id: 0 } })
    .sort({ order_index: 1, lesson_id: 1 })
    .toArray()
  return res.json({ syllabus, lessons })
})

app.post('/api/instruction/lessons', authMiddleware, requireInstructionEditor, async (req, res) => {
  const parsed = lessonSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const syllabus = await db.collection('syllabi').findOne(
    { syllabus_id: parsed.data.syllabus_id, is_archived: { $ne: 1 } },
    { projection: { _id: 0, syllabus_id: 1 } },
  )
  if (!syllabus) return res.status(404).json({ message: 'Syllabus not found or archived' })

  let orderIndex = parsed.data.order_index
  if (!orderIndex) {
    const last = await db
      .collection('lessons')
      .find({ syllabus_id: parsed.data.syllabus_id }, { projection: { _id: 0, order_index: 1 } })
      .sort({ order_index: -1 })
      .limit(1)
      .toArray()
    orderIndex = (last[0]?.order_index ?? 0) + 1
  }

  const lesson = {
    lesson_id: await nextSequence(db, 'lessons'),
    syllabus_id: parsed.data.syllabus_id,
    title: parsed.data.title,
    content: parsed.data.content,
    curriculum_unit: parsed.data.curriculum_unit,
    week_number: parsed.data.week_number ?? null,
    order_index: orderIndex,
    is_archived: 0,
    created_by: Number(req.auth?.sub) || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.collection('lessons').insertOne(lesson)
  return res.status(201).json({ lesson })
})

app.put('/api/instruction/lessons/:id', authMiddleware, requireInstructionEditor, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid lesson id' })
  const parsed = lessonUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const fields = {}
  if (parsed.data.title !== undefined) fields.title = parsed.data.title
  if (parsed.data.content !== undefined) fields.content = parsed.data.content
  if (parsed.data.curriculum_unit !== undefined) fields.curriculum_unit = parsed.data.curriculum_unit
  if (parsed.data.week_number !== undefined) fields.week_number = parsed.data.week_number
  if (parsed.data.order_index !== undefined) fields.order_index = parsed.data.order_index
  if (parsed.data.is_archived !== undefined) fields.is_archived = parsed.data.is_archived
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })
  const db = await getDb()
  const existing = await db.collection('lessons').findOne({ lesson_id: id }, { projection: { _id: 0, lesson_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Lesson not found' })
  await db.collection('lessons').updateOne({ lesson_id: id }, { $set: fields })
  const updated = await db.collection('lessons').findOne({ lesson_id: id }, { projection: { _id: 0 } })
  return res.json({ lesson: updated })
})

app.delete('/api/instruction/lessons/:id', authMiddleware, requireInstructionEditor, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid lesson id' })
  const db = await getDb()
  const existing = await db.collection('lessons').findOne({ lesson_id: id }, { projection: { _id: 0, lesson_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Lesson not found' })
  const hardDelete = req.auth?.role === 'admin' && String(req.query.hard || '').toLowerCase() === 'true'
  if (hardDelete) {
    await db.collection('lessons').deleteOne({ lesson_id: id })
    return res.json({ ok: true, mode: 'deleted' })
  }
  await db.collection('lessons').updateOne({ lesson_id: id }, { $set: { is_archived: 1, updated_at: new Date() } })
  return res.json({ ok: true, mode: 'archived' })
})

app.put('/api/instruction/syllabi/:id/curriculum', authMiddleware, requireInstructionEditor, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid syllabus id' })
  const parsed = curriculumReorderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const syllabus = await db.collection('syllabi').findOne({ syllabus_id: id }, { projection: { _id: 0, syllabus_id: 1 } })
  if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' })

  for (const entry of parsed.data.lessons) {
    await db.collection('lessons').updateOne(
      { lesson_id: entry.lesson_id, syllabus_id: id },
      {
        $set: {
          order_index: entry.order_index,
          curriculum_unit: entry.curriculum_unit ?? '',
          week_number: entry.week_number ?? null,
          updated_at: new Date(),
        },
      },
    )
  }

  const lessons = await db
    .collection('lessons')
    .find({ syllabus_id: id, is_archived: { $ne: 1 } }, { projection: { _id: 0 } })
    .sort({ order_index: 1, lesson_id: 1 })
    .toArray()
  return res.json({ lessons })
})

app.get('/api/scheduling/courses', authMiddleware, requireAdmin, async (_req, res) => {
  const db = await getDb()
  const courses = await db
    .collection('schedule_courses')
    .find({}, { projection: { _id: 0 } })
    .sort({ code: 1, course_id: 1 })
    .toArray()
  return res.json({ courses })
})

app.post('/api/scheduling/courses', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = scheduleCourseSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  try {
    const created = {
      course_id: await nextSequence(db, 'schedule_courses'),
      code: parsed.data.code,
      title: parsed.data.title,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.collection('schedule_courses').insertOne(created)
    return res.status(201).json({ course: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Course already exists' })
    return res.status(500).json({ message: 'Failed to create course' })
  }
})

app.put('/api/scheduling/courses/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid course id' })
  const parsed = scheduleCourseUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const fields = {}
  if (parsed.data.code !== undefined) fields.code = parsed.data.code
  if (parsed.data.title !== undefined) fields.title = parsed.data.title
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })
  const db = await getDb()
  const existing = await db.collection('schedule_courses').findOne({ course_id: id }, { projection: { _id: 0, course_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Course not found' })
  try {
    await db.collection('schedule_courses').updateOne({ course_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Course already exists' })
    return res.status(500).json({ message: 'Failed to update course' })
  }
  const updated = await db.collection('schedule_courses').findOne({ course_id: id }, { projection: { _id: 0 } })
  return res.json({ course: updated })
})

app.delete('/api/scheduling/courses/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid course id' })
  const db = await getDb()
  const existing = await db.collection('schedule_courses').findOne({ course_id: id }, { projection: { _id: 0, course_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Course not found' })
  const sections = await db.collection('schedule_sections').find({ course_id: id }, { projection: { _id: 0, section_id: 1 } }).toArray()
  const sectionIds = sections.map((s) => s.section_id)
  if (sectionIds.length > 0) {
    const rooms = await db.collection('rooms').find({ section_id: { $in: sectionIds } }, { projection: { _id: 0, room_id: 1 } }).toArray()
    const roomIds = rooms.map((r) => r.room_id)
    if (roomIds.length > 0) {
      await db.collection('labs').deleteMany({ room_id: { $in: roomIds } })
      await db.collection('rooms').deleteMany({ room_id: { $in: roomIds } })
    }
    await db.collection('schedule_sections').deleteMany({ section_id: { $in: sectionIds } })
  }
  await db.collection('schedule_courses').deleteOne({ course_id: id })
  return res.json({ ok: true })
})

app.get('/api/scheduling/courses/:id/sections', authMiddleware, requireAdmin, async (req, res) => {
  const courseId = Number(req.params.id)
  if (!courseId) return res.status(400).json({ message: 'Invalid course id' })
  const db = await getDb()
  const course = await db.collection('schedule_courses').findOne({ course_id: courseId }, { projection: { _id: 0, course_id: 1 } })
  if (!course) return res.status(404).json({ message: 'Course not found' })
  const sections = await db
    .collection('schedule_sections')
    .find({ course_id: courseId }, { projection: { _id: 0 } })
    .sort({ name: 1, section_id: 1 })
    .toArray()
  return res.json({ sections })
})

app.post('/api/scheduling/courses/:id/sections', authMiddleware, requireAdmin, async (req, res) => {
  const courseId = Number(req.params.id)
  if (!courseId) return res.status(400).json({ message: 'Invalid course id' })
  const parsed = scheduleSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const course = await db.collection('schedule_courses').findOne({ course_id: courseId }, { projection: { _id: 0, course_id: 1 } })
  if (!course) return res.status(404).json({ message: 'Course not found' })
  try {
    const created = {
      section_id: await nextSequence(db, 'schedule_sections'),
      course_id: courseId,
      name: parsed.data.name,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.collection('schedule_sections').insertOne(created)
    return res.status(201).json({ section: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Section already exists for this course' })
    return res.status(500).json({ message: 'Failed to create section' })
  }
})

app.put('/api/scheduling/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })
  const parsed = scheduleSectionUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const fields = {}
  if (parsed.data.name !== undefined) fields.name = parsed.data.name
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })
  const db = await getDb()
  const existing = await db.collection('schedule_sections').findOne({ section_id: id }, { projection: { _id: 0, section_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Section not found' })
  try {
    await db.collection('schedule_sections').updateOne({ section_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Section already exists for this course' })
    return res.status(500).json({ message: 'Failed to update section' })
  }
  const updated = await db.collection('schedule_sections').findOne({ section_id: id }, { projection: { _id: 0 } })
  return res.json({ section: updated })
})

app.delete('/api/scheduling/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })
  const db = await getDb()
  const existing = await db.collection('schedule_sections').findOne({ section_id: id }, { projection: { _id: 0, section_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Section not found' })
  const rooms = await db.collection('rooms').find({ section_id: id }, { projection: { _id: 0, room_id: 1 } }).toArray()
  const roomIds = rooms.map((r) => r.room_id)
  if (roomIds.length > 0) {
    await db.collection('labs').deleteMany({ room_id: { $in: roomIds } })
    await db.collection('rooms').deleteMany({ room_id: { $in: roomIds } })
  }
  await db.collection('schedule_sections').deleteOne({ section_id: id })
  return res.json({ ok: true })
})

app.get('/api/scheduling/sections/:id/rooms', authMiddleware, requireAdmin, async (req, res) => {
  const sectionId = Number(req.params.id)
  if (!sectionId) return res.status(400).json({ message: 'Invalid section id' })
  const db = await getDb()
  const section = await db.collection('schedule_sections').findOne({ section_id: sectionId }, { projection: { _id: 0, section_id: 1 } })
  if (!section) return res.status(404).json({ message: 'Section not found' })
  const rooms = await db
    .collection('rooms')
    .find({ section_id: sectionId }, { projection: { _id: 0 } })
    .sort({ name: 1, room_id: 1 })
    .toArray()
  return res.json({ rooms })
})

app.post('/api/scheduling/sections/:id/rooms', authMiddleware, requireAdmin, async (req, res) => {
  const sectionId = Number(req.params.id)
  if (!sectionId) return res.status(400).json({ message: 'Invalid section id' })
  const parsed = roomSchema.safeParse({ ...req.body, section_id: sectionId })
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const section = await db.collection('schedule_sections').findOne({ section_id: sectionId }, { projection: { _id: 0, section_id: 1 } })
  if (!section) return res.status(404).json({ message: 'Section not found' })
  try {
    const created = {
      room_id: await nextSequence(db, 'rooms'),
      section_id: sectionId,
      name: parsed.data.name,
      building: parsed.data.building ?? null,
      capacity: parsed.data.capacity ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.collection('rooms').insertOne(created)
    return res.status(201).json({ room: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Room already exists for this section' })
    return res.status(500).json({ message: 'Failed to create room' })
  }
})

app.get('/api/scheduling/rooms', authMiddleware, requireAdmin, async (_req, res) => {
  const db = await getDb()
  const rooms = await db
    .collection('rooms')
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1, room_id: 1 })
    .toArray()
  return res.json({ rooms })
})

app.post('/api/scheduling/rooms', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = roomSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const section = await db.collection('schedule_sections').findOne(
    { section_id: parsed.data.section_id },
    { projection: { _id: 0, section_id: 1 } },
  )
  if (!section) return res.status(404).json({ message: 'Section not found' })
  try {
    const created = {
      room_id: await nextSequence(db, 'rooms'),
      section_id: parsed.data.section_id,
      name: parsed.data.name,
      building: parsed.data.building ?? null,
      capacity: parsed.data.capacity ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.collection('rooms').insertOne(created)
    return res.status(201).json({ room: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Room already exists for this section' })
    return res.status(500).json({ message: 'Failed to create room' })
  }
})

app.put('/api/scheduling/rooms/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid room id' })
  const parsed = roomUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const fields = {}
  if (parsed.data.section_id !== undefined) fields.section_id = parsed.data.section_id
  if (parsed.data.name !== undefined) fields.name = parsed.data.name
  if (parsed.data.building !== undefined) fields.building = parsed.data.building
  if (parsed.data.capacity !== undefined) fields.capacity = parsed.data.capacity
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })

  const db = await getDb()
  const existing = await db.collection('rooms').findOne({ room_id: id }, { projection: { _id: 0, room_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Room not found' })
  if (parsed.data.section_id !== undefined) {
    const section = await db.collection('schedule_sections').findOne(
      { section_id: parsed.data.section_id },
      { projection: { _id: 0, section_id: 1 } },
    )
    if (!section) return res.status(404).json({ message: 'Section not found' })
  }
  try {
    await db.collection('rooms').updateOne({ room_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Room already exists for this section' })
    return res.status(500).json({ message: 'Failed to update room' })
  }
  const updated = await db.collection('rooms').findOne({ room_id: id }, { projection: { _id: 0 } })
  return res.json({ room: updated })
})

app.delete('/api/scheduling/rooms/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid room id' })
  const db = await getDb()
  const existing = await db.collection('rooms').findOne({ room_id: id }, { projection: { _id: 0, room_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Room not found' })
  await db.collection('labs').deleteMany({ room_id: id })
  await db.collection('rooms').deleteOne({ room_id: id })
  return res.json({ ok: true })
})

app.get('/api/scheduling/rooms/:id/labs', authMiddleware, requireAdmin, async (req, res) => {
  const roomId = Number(req.params.id)
  if (!roomId) return res.status(400).json({ message: 'Invalid room id' })
  const db = await getDb()
  const room = await db.collection('rooms').findOne({ room_id: roomId }, { projection: { _id: 0, room_id: 1 } })
  if (!room) return res.status(404).json({ message: 'Room not found' })
  const labs = await db
    .collection('labs')
    .find({ room_id: roomId }, { projection: { _id: 0 } })
    .sort({ name: 1, lab_id: 1 })
    .toArray()
  return res.json({ labs })
})

app.post('/api/scheduling/rooms/:id/labs', authMiddleware, requireAdmin, async (req, res) => {
  const roomId = Number(req.params.id)
  if (!roomId) return res.status(400).json({ message: 'Invalid room id' })
  const parsed = labSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const room = await db.collection('rooms').findOne({ room_id: roomId }, { projection: { _id: 0, room_id: 1 } })
  if (!room) return res.status(404).json({ message: 'Room not found' })
  try {
    const created = {
      lab_id: await nextSequence(db, 'labs'),
      room_id: roomId,
      name: parsed.data.name,
      faculty_user_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await db.collection('labs').insertOne(created)
    return res.status(201).json({ lab: created })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Lab already exists in this room' })
    return res.status(500).json({ message: 'Failed to create lab' })
  }
})

app.put('/api/scheduling/labs/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid lab id' })
  const parsed = labUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const fields = {}
  if (parsed.data.name !== undefined) fields.name = parsed.data.name
  if (parsed.data.faculty_user_id !== undefined) fields.faculty_user_id = parsed.data.faculty_user_id
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })

  const db = await getDb()
  const existing = await db.collection('labs').findOne({ lab_id: id }, { projection: { _id: 0, lab_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Lab not found' })

  if (parsed.data.faculty_user_id !== undefined && parsed.data.faculty_user_id != null) {
    const faculty = await db.collection('users').findOne(
      { user_id: parsed.data.faculty_user_id, role: 'faculty', active: 1 },
      { projection: { _id: 0, user_id: 1 } },
    )
    if (!faculty) return res.status(400).json({ message: 'Invalid faculty user' })
  }

  try {
    await db.collection('labs').updateOne({ lab_id: id }, { $set: fields })
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'Lab already exists in this room' })
    return res.status(500).json({ message: 'Failed to update lab' })
  }
  const updated = await db.collection('labs').findOne({ lab_id: id }, { projection: { _id: 0 } })
  return res.json({ lab: updated })
})

app.delete('/api/scheduling/labs/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid lab id' })
  const db = await getDb()
  const existing = await db.collection('labs').findOne({ lab_id: id }, { projection: { _id: 0, lab_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Lab not found' })
  await db.collection('labs').deleteOne({ lab_id: id })
  return res.json({ ok: true })
})

app.get('/api/scheduling/faculty', authMiddleware, requireAdmin, async (_req, res) => {
  const db = await getDb()
  const faculty = await db
    .collection('users')
    .find({ role: 'faculty', active: 1 }, { projection: { _id: 0, user_id: 1, username: 1, email: 1, faculty_type: 1 } })
    .sort({ username: 1, user_id: 1 })
    .toArray()
  return res.json({ faculty })
})

app.get('/api/scheduling/student-view', authMiddleware, requireStaffOrStudent, async (req, res) => {
  const db = await getDb()
  const authRole = req.auth?.role
  const authUserId = Number(req.auth?.sub)
  const requestedStudentId = Number(req.query.student_id)

  let student
  if (authRole === 'student') {
    student = await db.collection('students').findOne({ user_id: authUserId }, { projection: { _id: 0 } })
  } else if (requestedStudentId) {
    student = await db.collection('students').findOne({ student_id: requestedStudentId }, { projection: { _id: 0 } })
  } else {
    student = await db.collection('students').findOne({}, { projection: { _id: 0 }, sort: { student_id: 1 } })
  }

  if (!student) return res.status(404).json({ message: 'Student not found' })

  const sectionName = String(student.section || '').trim()
  if (!sectionName) {
    return res.json({
      student: {
        student_id: student.student_id,
        first_name: student.first_name ?? '',
        last_name: student.last_name ?? '',
        section: student.section ?? null,
      },
      schedules: [],
    })
  }

  const sections = await db
    .collection('schedule_sections')
    .find({ name: sectionName }, { projection: { _id: 0 } })
    .sort({ section_id: 1 })
    .toArray()

  if (sections.length === 0) {
    return res.json({
      student: {
        student_id: student.student_id,
        first_name: student.first_name ?? '',
        last_name: student.last_name ?? '',
        section: student.section ?? null,
      },
      schedules: [],
    })
  }

  const courseIds = Array.from(new Set(sections.map((s) => s.course_id)))
  const courses = await db
    .collection('schedule_courses')
    .find({ course_id: { $in: courseIds } }, { projection: { _id: 0 } })
    .toArray()
  const courseMap = new Map(courses.map((c) => [c.course_id, c]))

  const sectionIds = sections.map((s) => s.section_id)
  const rooms = await db
    .collection('rooms')
    .find({ section_id: { $in: sectionIds } }, { projection: { _id: 0 } })
    .sort({ name: 1, room_id: 1 })
    .toArray()
  const roomsBySection = new Map()
  for (const room of rooms) {
    const key = room.section_id
    if (!roomsBySection.has(key)) roomsBySection.set(key, [])
    roomsBySection.get(key).push(room)
  }

  const roomIds = rooms.map((r) => r.room_id)
  const labs = roomIds.length
    ? await db
        .collection('labs')
        .find({ room_id: { $in: roomIds } }, { projection: { _id: 0 } })
        .sort({ name: 1, lab_id: 1 })
        .toArray()
    : []
  const labsByRoom = new Map()
  for (const lab of labs) {
    const key = lab.room_id
    if (!labsByRoom.has(key)) labsByRoom.set(key, [])
    labsByRoom.get(key).push(lab)
  }

  const facultyIds = Array.from(
    new Set(
      labs
        .map((l) => l.faculty_user_id)
        .filter((id) => id != null),
    ),
  )
  const facultyUsers = facultyIds.length
    ? await db
        .collection('users')
        .find({ user_id: { $in: facultyIds } }, { projection: { _id: 0, user_id: 1, username: 1 } })
        .toArray()
    : []
  const facultyMap = new Map(facultyUsers.map((f) => [f.user_id, f.username]))

  const schedules = sections.map((section) => {
    const sectionRooms = roomsBySection.get(section.section_id) ?? []
    const mappedRooms = sectionRooms.map((room) => {
      const roomLabs = labsByRoom.get(room.room_id) ?? []
      return {
        ...room,
        labs: roomLabs.map((lab) => ({
          ...lab,
          faculty_name: lab.faculty_user_id ? facultyMap.get(lab.faculty_user_id) ?? null : null,
        })),
      }
    })

    return {
      section_id: section.section_id,
      section_name: section.name,
      course: courseMap.get(section.course_id) ?? null,
      rooms: mappedRooms,
    }
  })

  return res.json({
    student: {
      student_id: student.student_id,
      first_name: student.first_name ?? '',
      last_name: student.last_name ?? '',
      section: student.section ?? null,
    },
    schedules,
  })
})

app.get('/api/scheduling/faculty-view', authMiddleware, requireStaff, async (req, res) => {
  const db = await getDb()
  const authRole = req.auth?.role
  const authUserId = Number(req.auth?.sub)
  const requestedFacultyId = Number(req.query.faculty_user_id)

  const facultyUserId = authRole === 'faculty' ? authUserId : requestedFacultyId || authUserId
  if (!facultyUserId) return res.status(400).json({ message: 'Invalid faculty user id' })

  const faculty = await db
    .collection('users')
    .findOne({ user_id: facultyUserId, role: 'faculty' }, { projection: { _id: 0, user_id: 1, username: 1, email: 1, faculty_type: 1 } })
  if (!faculty) return res.status(404).json({ message: 'Faculty not found' })

  // Legacy-safe lookup: some old records may store faculty_user_id as string (or username).
  const possibleFacultyKeys = Array.from(
    new Set(
      [facultyUserId, String(facultyUserId), faculty.username, faculty.email]
        .map((v) => (typeof v === 'string' ? v.trim() : v))
        .filter((v) => v != null && v !== ''),
    ),
  )
  let labs = await db
    .collection('labs')
    .find({ faculty_user_id: { $in: possibleFacultyKeys } }, { projection: { _id: 0 } })
    .sort({ name: 1, lab_id: 1 })
    .toArray()

  if (labs.length === 0) {
    return res.json({ faculty, schedules: [] })
  }

  const labFacultyIds = Array.from(new Set(labs.map((l) => Number(l.faculty_user_id)).filter((id) => Number.isFinite(id) && id > 0)))
  const labFacultyUsers = labFacultyIds.length
    ? await db
        .collection('users')
        .find({ user_id: { $in: labFacultyIds } }, { projection: { _id: 0, user_id: 1, username: 1 } })
        .toArray()
    : []
  const labFacultyMap = new Map(labFacultyUsers.map((u) => [u.user_id, u.username]))

  const roomIds = Array.from(new Set(labs.map((l) => l.room_id)))
  const rooms = await db
    .collection('rooms')
    .find({ room_id: { $in: roomIds } }, { projection: { _id: 0 } })
    .toArray()
  const roomMap = new Map(rooms.map((r) => [r.room_id, r]))

  const sectionIds = Array.from(new Set(rooms.map((r) => r.section_id).filter((id) => id != null)))
  const sections = sectionIds.length
    ? await db
        .collection('schedule_sections')
        .find({ section_id: { $in: sectionIds } }, { projection: { _id: 0 } })
        .toArray()
    : []
  const sectionMap = new Map(sections.map((s) => [s.section_id, s]))

  const courseIds = Array.from(new Set(sections.map((s) => s.course_id)))
  const courses = courseIds.length
    ? await db
        .collection('schedule_courses')
        .find({ course_id: { $in: courseIds } }, { projection: { _id: 0 } })
        .toArray()
    : []
  const courseMap = new Map(courses.map((c) => [c.course_id, c]))

  const schedules = labs.map((lab) => {
    const room = roomMap.get(lab.room_id) ?? null
    const section = room?.section_id ? sectionMap.get(room.section_id) ?? null : null
    const course = section?.course_id ? courseMap.get(section.course_id) ?? null : null
    return {
      course,
      section,
      room,
      lab: {
        ...lab,
        faculty_name: Number(lab.faculty_user_id) ? labFacultyMap.get(Number(lab.faculty_user_id)) ?? null : null,
      },
    }
  })

  return res.json({ faculty, schedules })
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

async function startServer() {
  try {
    await getDb()
    console.log('MongoDB connection OK')
    app.listen(PORT, () => {
      console.log(`SPMS API running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('MongoDB connection failed:', error?.message || error)
    process.exit(1)
  }
}

startServer()

