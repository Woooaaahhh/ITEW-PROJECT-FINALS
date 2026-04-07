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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    const sectionId = await db.collection('counters').findOneAndUpdate(
      { _id: 'sections' },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
    const created = {
      section_id: sectionId.value?.value ?? 1,
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

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(120),
  password: z.string().min(6).max(100),
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

  const { username, email, password, role } = parsed.data
  const faculty_type = role === 'faculty' ? (parsed.data.faculty_type ?? null) : null
  const student = role === 'student' ? parsed.data.student : undefined

  if (role === 'faculty' && !faculty_type) {
    return res.status(400).json({ message: 'Faculty type is required' })
  }
  if (role === 'student' && !student) {
    return res.status(400).json({ message: 'Student profile fields are required' })
  }

  const db = await getDb()
  const hash = await bcrypt.hash(password, 10)

  try {
    const userCounter = await db.collection('counters').findOneAndUpdate(
      { _id: 'users' },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
    const userId = userCounter.value?.value ?? 1
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
      const studentCounter = await db.collection('counters').findOneAndUpdate(
        { _id: 'students' },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: 'after' },
      )
      const studentId = studentCounter.value?.value ?? 1
      await db.collection('students').insertOne({
        student_id: studentId,
        user_id: userId,
        first_name: student.first_name,
        last_name: student.last_name,
        year_level: student.year_level,
        section: student.section,
      })
    }

    const created = await db.collection('users').findOne(
      { user_id: userId },
      { projection: { _id: 0, password: 0 } },
    )
    return res.status(201).json({ user: created })
  } catch (e) {
    if (!isDuplicateKeyError(e)) {
      const created = await db.collection('users').findOne({ username, email })
      if (created?.user_id) {
        await db.collection('students').deleteOne({ user_id: created.user_id })
        await db.collection('users').deleteOne({ user_id: created.user_id })
      }
    }
    return res.status(409).json({ message: 'Username or email already exists' })
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

