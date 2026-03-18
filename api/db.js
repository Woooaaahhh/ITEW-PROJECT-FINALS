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

  return db
}

