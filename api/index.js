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
  const row = await db.get(
    'SELECT user_id, username, email, password, role, faculty_type, active, created_at FROM users WHERE (lower(username) = ? OR lower(email) = ?) LIMIT 1',
    id,
    id,
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

  const row = await db.get(
    'SELECT user_id, username, email, role, faculty_type, active, created_at FROM users WHERE user_id = ? LIMIT 1',
    userId,
  )

  if (!row) return res.status(404).json({ message: 'User not found' })
  if ((row.active ?? 1) !== 1) return res.status(403).json({ message: 'Account is deactivated' })
  return res.json({ user: row })
})

// Public read: Add Student and other forms need sections even when the API was started
// before login headers are applied; avoids blocking local IndexedDB student creation.
app.get('/api/sections', async (_req, res) => {
  const db = await getDb()
  const rows = await db.all(
    'SELECT section_id, year_level, section, created_at FROM sections ORDER BY year_level ASC, section ASC',
  )
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
    const result = await db.run(
      'INSERT INTO sections (year_level, section) VALUES (?, ?)',
      year_level,
      section,
    )
    const created = await db.get(
      'SELECT section_id, year_level, section, created_at FROM sections WHERE section_id = ?',
      result.lastID,
    )
    return res.status(201).json({ section: created })
  } catch {
    return res.status(409).json({ message: 'Section already exists for this year level' })
  }
})

app.put('/api/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })

  const parsed = createSectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' })

  const db = await getDb()
  const existing = await db.get('SELECT section_id FROM sections WHERE section_id = ? LIMIT 1', id)
  if (!existing) return res.status(404).json({ message: 'Section not found' })

  try {
    await db.run('UPDATE sections SET year_level = ?, section = ? WHERE section_id = ?', parsed.data.year_level, parsed.data.section, id)
  } catch {
    return res.status(409).json({ message: 'Section already exists for this year level' })
  }

  const updated = await db.get(
    'SELECT section_id, year_level, section, created_at FROM sections WHERE section_id = ?',
    id,
  )
  return res.json({ section: updated })
})

app.delete('/api/sections/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid section id' })

  const db = await getDb()
  const existing = await db.get('SELECT section_id FROM sections WHERE section_id = ? LIMIT 1', id)
  if (!existing) return res.status(404).json({ message: 'Section not found' })

  await db.run('DELETE FROM sections WHERE section_id = ?', id)
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
  const rows = await db.all(
    'SELECT user_id, username, email, role, faculty_type, active, created_at FROM users ORDER BY user_id DESC',
  )
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
    await db.exec('BEGIN')
    const result = await db.run(
      'INSERT INTO users (username, email, password, role, faculty_type, active) VALUES (?, ?, ?, ?, ?, 1)',
      username,
      email,
      hash,
      role,
      faculty_type,
    )

    if (role === 'student' && student) {
      await db.run(
        'INSERT INTO students (user_id, first_name, last_name, year_level, section) VALUES (?, ?, ?, ?, ?)',
        result.lastID,
        student.first_name,
        student.last_name,
        student.year_level,
        student.section,
      )
    }

    await db.exec('COMMIT')
    const created = await db.get(
      'SELECT user_id, username, email, role, faculty_type, active, created_at FROM users WHERE user_id = ?',
      result.lastID,
    )
    return res.status(201).json({ user: created })
  } catch (e) {
    await db.exec('ROLLBACK')
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
  const existing = await db.get('SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1', id)
  if (!existing) return res.status(404).json({ message: 'User not found' })
  if (existing.role === 'admin') return res.status(403).json({ message: 'Cannot modify admin account' })

  const fields = []
  const params = []
  if (parsed.data.email !== undefined) {
    fields.push('email = ?')
    params.push(parsed.data.email)
  }
  if (parsed.data.active !== undefined) {
    fields.push('active = ?')
    params.push(parsed.data.active)
  }
  if (parsed.data.faculty_type !== undefined) {
    fields.push('faculty_type = ?')
    params.push(parsed.data.faculty_type)
  }
  if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' })

  try {
    await db.run(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, ...params, id)
  } catch {
    return res.status(409).json({ message: 'Email already exists' })
  }

  const updated = await db.get(
    'SELECT user_id, username, email, role, faculty_type, active, created_at FROM users WHERE user_id = ? LIMIT 1',
    id,
  )
  return res.json({ user: updated })
})

app.delete('/api/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid user id' })

  const db = await getDb()
  const existing = await db.get('SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1', id)
  if (!existing) return res.status(404).json({ message: 'User not found' })
  if (existing.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin account' })

  await db.run('UPDATE users SET active = 0 WHERE user_id = ?', id)
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

  const params = []
  let where = "WHERE sk.is_active = 1 AND u.active = 1 AND u.role = 'student'"
  if (categoryRaw) {
    where += ' AND sk.category = ?'
    params.push(categoryRaw)
  }

  const rows = await db.all(
    `
    SELECT
      s.student_id,
      u.user_id,
      st.first_name,
      st.last_name,
      sk.category,
      sk.name AS skill_name
    FROM student_skills s
    INNER JOIN students st ON st.student_id = s.student_id
    INNER JOIN users u ON u.user_id = st.user_id
    INNER JOIN skills sk ON sk.skill_id = s.skill_id
    ${where}
    ORDER BY st.last_name ASC, st.first_name ASC, sk.name ASC
    `,
    ...params,
  )

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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SPMS API running on http://localhost:${PORT}`)
})

