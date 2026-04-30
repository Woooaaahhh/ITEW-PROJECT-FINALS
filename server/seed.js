import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = process.env.SPMS_SQLITE_PATH || path.join(__dirname, 'spms.sqlite')

const STUDENT_COUNT = 100
const FACULTY_COUNT = 20
const SALT_ROUNDS = 10

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const FACULTY_TYPES = ['Teacher', 'Coach', 'Adviser']
const SECTION_SUFFIXES = ['A', 'B']

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function createStudentSection(yearLevel) {
  const yearNumber = yearLevel[0]
  return `BSIT-${yearNumber}${randomItem(SECTION_SUFFIXES)}`
}

function uniqueUsername(base, usedUsernames) {
  let candidate = base.toLowerCase()
  let suffix = 1
  while (usedUsernames.has(candidate)) {
    candidate = `${base.toLowerCase()}${suffix}`
    suffix += 1
  }
  usedUsernames.add(candidate)
  return candidate
}

function uniqueEmail(firstName, lastName, domain, usedEmails) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '')
  let candidate = `${base}@${domain}`
  let suffix = 1
  while (usedEmails.has(candidate)) {
    candidate = `${base}${suffix}@${domain}`
    suffix += 1
  }
  usedEmails.add(candidate)
  return candidate
}

async function seed() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  })

  await db.exec('PRAGMA foreign_keys = ON;')

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('registrar', 'faculty', 'student')),
      faculty_type TEXT
    );
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      section TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
  `)

  const usedUsernames = new Set()
  const usedEmails = new Set()

  const existingUsers = await db.all('SELECT username, email FROM users')
  for (const row of existingUsers) {
    usedUsernames.add(String(row.username).toLowerCase())
    usedEmails.add(String(row.email).toLowerCase())
  }

  const insertUserStmt = await db.prepare(`
    INSERT INTO users (username, email, password, role, faculty_type)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertStudentStmt = await db.prepare(`
    INSERT INTO students (user_id, first_name, last_name, year_level, section)
    VALUES (?, ?, ?, ?, ?)
  `)

  try {
    await db.exec('BEGIN TRANSACTION;')

    for (let i = 0; i < FACULTY_COUNT; i += 1) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const usernameSeed = `${firstName}.${lastName}`.replace(/[^a-zA-Z0-9.]/g, '')
      const username = uniqueUsername(usernameSeed, usedUsernames)
      const email = uniqueEmail(firstName, lastName, 'spms.edu', usedEmails)
      const passwordHash = await bcrypt.hash('Faculty123!', SALT_ROUNDS)
      const facultyType = randomItem(FACULTY_TYPES)

      await insertUserStmt.run(username, email, passwordHash, 'faculty', facultyType)
    }

    for (let i = 0; i < STUDENT_COUNT; i += 1) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const usernameSeed = `${firstName}${lastName}`.replace(/[^a-zA-Z0-9]/g, '')
      const username = uniqueUsername(usernameSeed, usedUsernames)
      const email = uniqueEmail(firstName, lastName, 'gmail.com', usedEmails)
      const passwordHash = await bcrypt.hash('Student123!', SALT_ROUNDS)
      const yearLevel = randomItem(YEAR_LEVELS)
      const section = createStudentSection(yearLevel)

      const userResult = await insertUserStmt.run(username, email, passwordHash, 'student', null)
      const userId = userResult.lastID
      await insertStudentStmt.run(userId, firstName, lastName, yearLevel, section)
    }

    await db.exec('COMMIT;')
    console.log('Seeding completed successfully')
  } catch (error) {
    await db.exec('ROLLBACK;')
    console.error('Seeding failed:', error)
    process.exitCode = 1
  } finally {
    await insertStudentStmt.finalize()
    await insertUserStmt.finalize()
    await db.close()
  }
}

seed()
