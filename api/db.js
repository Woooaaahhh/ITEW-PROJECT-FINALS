import 'dotenv/config'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

let client
let dbPromise

async function getNextSequence(db, name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  // mongodb driver versions may return either the document directly
  // or a wrapper object with `value`.
  if (typeof result?.value === 'number') return result.value
  if (typeof result?.value?.value === 'number') return result.value.value
  return 1
}

async function ensureIndexes(db) {
  await db.collection('users').createIndex({ username: 1 }, { unique: true })
  await db.collection('users').createIndex({ email: 1 }, { unique: true })
  await db.collection('students').createIndex({ user_id: 1 }, { unique: true })
  await db.collection('sections').createIndex({ year_level: 1, section: 1 }, { unique: true })
  await db.collection('skills').createIndex({ name: 1, category: 1 }, { unique: true })
  await db.collection('student_skills').createIndex({ student_id: 1, skill_id: 1 }, { unique: true })
  await db.collection('syllabi').createIndex({ syllabus_id: 1 }, { unique: true })
  await db.collection('syllabi').createIndex({ title: 1 })
  await db.collection('lessons').createIndex({ lesson_id: 1 }, { unique: true })
  await db.collection('lessons').createIndex({ syllabus_id: 1, order_index: 1 })
}

export async function getDb() {
  if (dbPromise) return dbPromise
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI environment variable')
  }
  if (!client) client = new MongoClient(MONGODB_URI)

  dbPromise = (async () => {
    await client.connect()
    const db = client.db(DB_NAME)
    await ensureIndexes(db)

    const userCount = await db.collection('users').countDocuments()
    if (userCount === 0) {
      const seedUsers = [
        { username: 'registrar', email: 'registrar@spms.edu', password: 'reg123', role: 'admin' },
        { username: 'faculty', email: 'faculty@spms.edu', password: 'faculty123', role: 'faculty', faculty_type: 'Teacher' },
        { username: 'student', email: 'student@spms.edu', password: 'student123', role: 'student' },
      ]
      for (const user of seedUsers) {
        const userId = await getNextSequence(db, 'users')
        const hash = await bcrypt.hash(user.password, 10)
        await db.collection('users').insertOne({
          user_id: userId,
          username: user.username,
          email: user.email,
          password: hash,
          role: user.role,
          faculty_type: user.faculty_type ?? null,
          active: 1,
          created_at: new Date(),
        })

        if (user.role === 'student') {
          const studentId = await getNextSequence(db, 'students')
          await db.collection('students').insertOne({
            student_id: studentId,
            user_id: userId,
            first_name: 'Student',
            last_name: 'User',
            year_level: '2nd',
            section: 'BSIT-2A',
          })
        }
      }
    }

    const sectionCount = await db.collection('sections').countDocuments()
    if (sectionCount === 0) {
      const defaultSections = [
        { year_level: '2nd', section: 'BSIT-2A' },
        { year_level: '1st', section: 'BSBA-1B' },
      ]
      for (const item of defaultSections) {
        const sectionId = await getNextSequence(db, 'sections')
        await db.collection('sections').insertOne({
          section_id: sectionId,
          year_level: item.year_level,
          section: item.section,
          created_at: new Date(),
        })
      }
    }

    const skillCount = await db.collection('skills').countDocuments()
    if (skillCount === 0) {
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
        const skillId = await getNextSequence(db, 'skills')
        await db.collection('skills').insertOne({
          skill_id: skillId,
          name: skill.name,
          category: skill.category,
          is_active: 1,
          created_at: new Date(),
        })
      }
    }

    const studentSkillsCount = await db.collection('student_skills').countDocuments()
    if (studentSkillsCount === 0) {
      const firstStudent = await db.collection('students').findOne({}, { sort: { student_id: 1 } })
      if (firstStudent?.student_id) {
        const programming = await db.collection('skills').findOne({ category: 'programming' }, { sort: { skill_id: 1 } })
        const academic = await db.collection('skills').findOne({ category: 'academic' }, { sort: { skill_id: 1 } })
        if (programming?.skill_id) {
          await db.collection('student_skills').updateOne(
            { student_id: firstStudent.student_id, skill_id: programming.skill_id },
            { $setOnInsert: { created_at: new Date() } },
            { upsert: true },
          )
        }
        if (academic?.skill_id) {
          await db.collection('student_skills').updateOne(
            { student_id: firstStudent.student_id, skill_id: academic.skill_id },
            { $setOnInsert: { created_at: new Date() } },
            { upsert: true },
          )
        }
      }
    }

    return db
  })()

  return dbPromise
}

