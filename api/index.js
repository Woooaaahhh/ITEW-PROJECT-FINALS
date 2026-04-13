import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from './db.js'
import { signToken, verifyToken } from './jwt.js'

const PORT = Number(process.env.API_PORT || 3001)

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '100kb' }))

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
  return res.json({ token, user: pickUser(row) })
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
  return res.json({ user: row })
})

// Public read: Add Student and other forms need sections even when the API was started
// before login headers are applied; avoids blocking local IndexedDB student creation.
app.get('/api/sections', async (_req, res) => {
  const db = await getDb()
  const rows = await db
    .collection('sections')
    .find({}, { projection: { _id: 0 } })
    .sort({ year_level: 1, section: 1 })
    .toArray()
  return res.json({ sections: rows })
})

const createSectionSchema = z.object({
  year_level: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(40),
})

app.post('/api/sections', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = createSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const { year_level, section } = parsed.data
  const db = await getDb()
  try {
    const created = {
      section_id: await nextSequence(db, 'sections'),
      year_level,
      section,
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

  const parsed = createSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const db = await getDb()
  const existing = await db.collection('sections').findOne({ section_id: id }, { projection: { _id: 0, section_id: 1 } })
  if (!existing) return res.status(404).json({ message: 'Section not found' })

  try {
    await db
      .collection('sections')
      .updateOne({ section_id: id }, { $set: { year_level: parsed.data.year_level, section: parsed.data.section } })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Section already exists for this year level' })
    }
    return res.status(409).json({ message: 'Section already exists for this year level' })
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

app.post('/api/create-user', authMiddleware, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

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

app.get('/api/skills', authMiddleware, requireStaff, async (req, res) => {
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
})

const syllabusUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  course_code: z.string().trim().max(50).optional(),
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

app.get('/api/instruction/syllabi', authMiddleware, async (req, res) => {
  const db = await getDb()
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true'
  const query = includeArchived ? {} : { is_archived: { $ne: 1 } }
  const syllabi = await db
    .collection('syllabi')
    .find(query, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray()
  return res.json({ syllabi })
})

app.post('/api/instruction/syllabi', authMiddleware, requireInstructionEditor, async (req, res) => {
  const parsed = syllabusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })
  const db = await getDb()
  const created = {
    syllabus_id: await nextSequence(db, 'syllabi'),
    title: parsed.data.title,
    description: parsed.data.description,
    course_code: parsed.data.course_code,
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

  const fields = {}
  if (parsed.data.title !== undefined) fields.title = parsed.data.title
  if (parsed.data.description !== undefined) fields.description = parsed.data.description
  if (parsed.data.course_code !== undefined) fields.course_code = parsed.data.course_code
  if (parsed.data.is_archived !== undefined) fields.is_archived = parsed.data.is_archived
  fields.updated_at = new Date()
  if (Object.keys(fields).length === 1) return res.status(400).json({ message: 'No fields to update' })

  const db = await getDb()
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

