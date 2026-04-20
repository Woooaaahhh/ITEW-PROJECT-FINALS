import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

const STUDENT_COUNT = 100
const FACULTY_COUNT = 20
const SALT_ROUNDS = 10

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const FACULTY_TYPES = ['Teacher', 'Coach', 'Adviser']
const SECTION_SUFFIXES = ['A', 'B']

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function sectionForYear(yearLevel) {
  const yearNumber = yearLevel[0]
  return `BSIT-${yearNumber}${randomItem(SECTION_SUFFIXES)}`
}

function normalize(value) {
  return String(value).toLowerCase()
}

function uniqueUsername(base, used) {
  let candidate = normalize(base)
  let suffix = 1
  while (used.has(candidate)) {
    candidate = `${normalize(base)}${suffix}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
}

function uniqueEmail(firstName, lastName, domain, used) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '')
  let candidate = `${base}@${domain}`
  let suffix = 1
  while (used.has(candidate)) {
    candidate = `${base}${suffix}@${domain}`
    suffix += 1
  }
  used.add(candidate)
  return candidate
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

async function seedMongo() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment')
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  const usedUsernames = new Set()
  const usedEmails = new Set()

  const existingUsers = await db
    .collection('users')
    .find({}, { projection: { _id: 0, username: 1, email: 1 } })
    .toArray()

  for (const user of existingUsers) {
    if (user.username) usedUsernames.add(normalize(user.username))
    if (user.email) usedEmails.add(normalize(user.email))
  }

  try {
    for (let i = 0; i < FACULTY_COUNT; i += 1) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const usernameSeed = `${firstName}.${lastName}`.replace(/[^a-zA-Z0-9.]/g, '')
      const username = uniqueUsername(usernameSeed, usedUsernames)
      const email = uniqueEmail(firstName, lastName, 'spms.edu', usedEmails)
      const password = await bcrypt.hash('Faculty123!', SALT_ROUNDS)
      const userId = await nextSequence(db, 'users')

      await db.collection('users').insertOne({
        user_id: userId,
        username,
        email,
        password,
        role: 'faculty',
        faculty_type: randomItem(FACULTY_TYPES),
        active: 1,
        created_at: new Date(),
      })
    }

    for (let i = 0; i < STUDENT_COUNT; i += 1) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const usernameSeed = `${firstName}${lastName}`.replace(/[^a-zA-Z0-9]/g, '')
      const username = uniqueUsername(usernameSeed, usedUsernames)
      const email = uniqueEmail(firstName, lastName, 'gmail.com', usedEmails)
      const password = await bcrypt.hash('Student123!', SALT_ROUNDS)
      const yearLevel = randomItem(YEAR_LEVELS)
      const section = sectionForYear(yearLevel)

      const userId = await nextSequence(db, 'users')
      await db.collection('users').insertOne({
        user_id: userId,
        username,
        email,
        password,
        role: 'student',
        faculty_type: null,
        active: 1,
        created_at: new Date(),
      })

      const studentId = await nextSequence(db, 'students')
      await db.collection('students').insertOne({
        student_id: studentId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        year_level: yearLevel,
        section,
      })
    }

    console.log('Seeding completed successfully')
  } finally {
    await client.close()
  }
}

seedMongo().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
