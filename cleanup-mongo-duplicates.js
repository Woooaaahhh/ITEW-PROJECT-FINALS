import 'dotenv/config'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment')
}

function pickNewestByCreatedAt(a, b) {
  const at = a?.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
  if (at !== bt) return at > bt ? a : b
  return String(a?._id ?? '') > String(b?._id ?? '') ? a : b
}

async function cleanup() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  try {
    const users = await db.collection('users').find({}).toArray()
    const students = await db.collection('students').find({}).toArray()

    const duplicateUserGroups = new Map()
    for (const u of users) {
      const key = Number(u.user_id)
      if (!Number.isFinite(key)) continue
      const list = duplicateUserGroups.get(key) ?? []
      list.push(u)
      duplicateUserGroups.set(key, list)
    }

    const duplicateStudentGroups = new Map()
    for (const s of students) {
      const key = Number(s.student_id)
      if (!Number.isFinite(key)) continue
      const list = duplicateStudentGroups.get(key) ?? []
      list.push(s)
      duplicateStudentGroups.set(key, list)
    }

    const userIdsToDelete = []
    let duplicateUserRows = 0
    for (const list of duplicateUserGroups.values()) {
      if (list.length <= 1) continue
      duplicateUserRows += list.length - 1
      const keep = list.reduce((best, cur) => pickNewestByCreatedAt(best, cur))
      for (const row of list) {
        if (String(row._id) !== String(keep._id)) userIdsToDelete.push(row._id)
      }
    }

    const studentIdsToDelete = []
    let duplicateStudentRows = 0
    for (const list of duplicateStudentGroups.values()) {
      if (list.length <= 1) continue
      duplicateStudentRows += list.length - 1
      const keep = list.reduce((best, cur) => pickNewestByCreatedAt(best, cur))
      for (const row of list) {
        if (String(row._id) !== String(keep._id)) studentIdsToDelete.push(row._id)
      }
    }

    let deletedUsers = 0
    if (userIdsToDelete.length > 0) {
      const result = await db.collection('users').deleteMany({ _id: { $in: userIdsToDelete } })
      deletedUsers = result.deletedCount ?? 0
    }

    let deletedStudents = 0
    if (studentIdsToDelete.length > 0) {
      const result = await db.collection('students').deleteMany({ _id: { $in: studentIdsToDelete } })
      deletedStudents = result.deletedCount ?? 0
    }

    const maxUser = await db
      .collection('users')
      .find({}, { projection: { user_id: 1 } })
      .sort({ user_id: -1 })
      .limit(1)
      .toArray()
    const maxStudent = await db
      .collection('students')
      .find({}, { projection: { student_id: 1 } })
      .sort({ student_id: -1 })
      .limit(1)
      .toArray()

    await db.collection('counters').updateOne(
      { _id: 'users' },
      { $max: { value: maxUser[0]?.user_id ?? 0 } },
      { upsert: true },
    )
    await db.collection('counters').updateOne(
      { _id: 'students' },
      { $max: { value: maxStudent[0]?.student_id ?? 0 } },
      { upsert: true },
    )

    // Add missing uniqueness guards to prevent duplicate ID rows from returning.
    await db.collection('users').createIndex({ user_id: 1 }, { unique: true })
    await db.collection('students').createIndex({ student_id: 1 }, { unique: true })

    const afterUsers = await db.collection('users').countDocuments()
    const afterStudents = await db.collection('students').countDocuments()

    console.log(
      JSON.stringify(
        {
          duplicateUserRows,
          duplicateStudentRows,
          deletedUsers,
          deletedStudents,
          afterUsers,
          afterStudents,
        },
        null,
        2,
      ),
    )
    console.log('Cleanup completed successfully')
  } finally {
    await client.close()
  }
}

cleanup().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
