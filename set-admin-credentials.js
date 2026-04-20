import 'dotenv/config'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

const OLD_EMAIL = 'registrar@spms.edu'
const NEW_EMAIL = 'admin@spms.edu'
const NEW_PASSWORD = 'admin123'

async function run() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  try {
    const hash = await bcrypt.hash(NEW_PASSWORD, 10)

    const existingNew = await db.collection('users').findOne({ email: NEW_EMAIL })
    const existingOld = await db.collection('users').findOne({ email: OLD_EMAIL })

    if (existingNew) {
      await db.collection('users').updateOne(
        { email: NEW_EMAIL },
        { $set: { username: 'admin', password: hash, role: 'admin', faculty_type: null, active: 1 } },
      )
      if (existingOld) {
        await db.collection('users').deleteOne({ _id: existingOld._id })
      }
      console.log(`UPDATED ${NEW_EMAIL} (and removed ${OLD_EMAIL} if present)`)
      return
    }

    if (existingOld) {
      await db.collection('users').updateOne(
        { _id: existingOld._id },
        { $set: { username: 'admin', email: NEW_EMAIL, password: hash, role: 'admin', faculty_type: null, active: 1 } },
      )
      console.log(`MIGRATED ${OLD_EMAIL} -> ${NEW_EMAIL}`)
      return
    }

    // If neither exists, create a fresh admin account with a new user_id counter value (same allocator as API).
    const seq = await db.collection('counters').findOneAndUpdate(
      { _id: 'users' },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
    const userId = typeof seq?.value === 'number' ? seq.value : (seq?.value?.value ?? 1)

    await db.collection('users').insertOne({
      user_id: userId,
      username: 'admin',
      email: NEW_EMAIL,
      password: hash,
      role: 'admin',
      faculty_type: null,
      active: 1,
      created_at: new Date(),
    })
    console.log(`CREATED ${NEW_EMAIL} user_id=${userId}`)
  } finally {
    await client.close()
  }
}

run().catch((error) => {
  console.error('Failed to set admin credentials:', error)
  process.exit(1)
})

