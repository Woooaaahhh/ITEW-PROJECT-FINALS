import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Always resolve relative to the api/ folder, regardless of where node was started from.
const dataDir = path.resolve(__dirname, 'data')
const dbPath = path.join(dataDir, 'spms.sqlite')

export async function getDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  await db.exec(`PRAGMA foreign_keys = ON;`)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','faculty','student')),
      faculty_type TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // If an older DB exists, ensure new columns are present.
  const cols = await db.all(`PRAGMA table_info(users);`)
  const colNames = new Set(cols.map((c) => c.name))
  if (!colNames.has('faculty_type')) await db.exec(`ALTER TABLE users ADD COLUMN faculty_type TEXT;`)
  if (!colNames.has('active')) await db.exec(`ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;`)
  // SQLite ALTER TABLE cannot add a column with non-constant default (e.g. CURRENT_TIMESTAMP)
  if (!colNames.has('created_at')) await db.exec(`ALTER TABLE users ADD COLUMN created_at DATETIME;`)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      first_name TEXT,
      last_name TEXT,
      year_level TEXT,
      section TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('programming','sports','academic','creative')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS student_skills (
      student_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, skill_id),
      FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      section_id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_level TEXT NOT NULL,
      section TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year_level, section)
    );
  `)

  const usersSeeded = await db.get('SELECT value FROM meta WHERE key = ?', 'users_seeded')
  const userCount = await db.get('SELECT COUNT(1) as count FROM users')
  if (usersSeeded?.value !== 'true' && (userCount?.count ?? 0) === 0) {
    const seed = [
      { username: 'registrar', email: 'registrar@spms.edu', password: 'reg123', role: 'admin' },
      { username: 'faculty', email: 'faculty@spms.edu', password: 'faculty123', role: 'faculty', faculty_type: 'Teacher' },
      { username: 'student', email: 'student@spms.edu', password: 'student123', role: 'student' },
    ]

    for (const u of seed) {
      const hash = await bcrypt.hash(u.password, 10)
      const result = await db.run(
        'INSERT INTO users (username, email, password, role, faculty_type, active) VALUES (?, ?, ?, ?, ?, 1)',
        u.username,
        u.email,
        hash,
        u.role,
        u.faculty_type ?? null,
      )

      if (u.role === 'student') {
        await db.run(
          'INSERT INTO students (user_id, first_name, last_name, year_level, section) VALUES (?, ?, ?, ?, ?)',
          result.lastID,
          'Student',
          'User',
          '2nd',
          'BSIT-2A',
        )
      }
    }

    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'users_seeded', 'true')
  } else if (usersSeeded?.value !== 'true') {
    // If DB already had users but no seed flag, set it to avoid reseeding logic later.
    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'users_seeded', 'true')
  }

  const sectionsSeeded = await db.get('SELECT value FROM meta WHERE key = ?', 'sections_seeded')
  const sectionCount = await db.get('SELECT COUNT(1) as count FROM sections')
  if (sectionsSeeded?.value !== 'true' && (sectionCount?.count ?? 0) === 0) {
    await db.run('INSERT INTO sections (year_level, section) VALUES (?, ?)', '2nd', 'BSIT-2A')
    await db.run('INSERT INTO sections (year_level, section) VALUES (?, ?)', '1st', 'BSBA-1B')
    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'sections_seeded', 'true')
  } else if (sectionsSeeded?.value !== 'true') {
    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'sections_seeded', 'true')
  }

  const skillsSeeded = await db.get('SELECT value FROM meta WHERE key = ?', 'skills_seeded')
  const skillCount = await db.get('SELECT COUNT(1) as count FROM skills')
  if (skillsSeeded?.value !== 'true' && (skillCount?.count ?? 0) === 0) {
    const seededSkills = [
      { name: 'Python Programming', category: 'programming' },
      { name: 'Web Development', category: 'programming' },
      { name: 'Basketball', category: 'sports' },
      { name: 'Volleyball', category: 'sports' },
      { name: 'Mathematics', category: 'academic' },
      { name: 'Science Quiz', category: 'academic' },
      { name: 'Creative Writing', category: 'creative' },
      { name: 'Digital Arts', category: 'creative' },
    ]
    for (const skill of seededSkills) {
      await db.run(
        'INSERT INTO skills (name, category, is_active) VALUES (?, ?, 1)',
        skill.name,
        skill.category,
      )
    }
    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'skills_seeded', 'true')
  } else if (skillsSeeded?.value !== 'true') {
    await db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', 'skills_seeded', 'true')
  }

  const studentSkillsSeeded = await db.get('SELECT value FROM meta WHERE key = ?', 'student_skills_seeded')
  const studentSkillsCount = await db.get('SELECT COUNT(1) as count FROM student_skills')
  if (studentSkillsSeeded?.value !== 'true' && (studentSkillsCount?.count ?? 0) === 0) {
    const firstStudent = await db.get('SELECT student_id FROM students ORDER BY student_id ASC LIMIT 1')
    if (firstStudent?.student_id) {
      const programming = await db.get(
        "SELECT skill_id FROM skills WHERE category = 'programming' ORDER BY skill_id ASC LIMIT 1",
      )
      const academic = await db.get(
        "SELECT skill_id FROM skills WHERE category = 'academic' ORDER BY skill_id ASC LIMIT 1",
      )
      if (programming?.skill_id) {
        await db.run(
          'INSERT OR IGNORE INTO student_skills (student_id, skill_id) VALUES (?, ?)',
          firstStudent.student_id,
          programming.skill_id,
        )
      }
      if (academic?.skill_id) {
        await db.run(
          'INSERT OR IGNORE INTO student_skills (student_id, skill_id) VALUES (?, ?)',
          firstStudent.student_id,
          academic.skill_id,
        )
      }
    }
    await db.run(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      'student_skills_seeded',
      'true',
    )
  } else if (studentSkillsSeeded?.value !== 'true') {
    await db.run(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      'student_skills_seeded',
      'true',
    )
  }

  return db
}

