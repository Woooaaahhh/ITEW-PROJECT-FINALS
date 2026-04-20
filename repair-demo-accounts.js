import 'dotenv/config'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

async function run() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)

  async function nextSequence(name) {
    const result = await db.collection('counters').findOneAndUpdate(
      { _id: name },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
    if (typeof result?.value === 'number') return result.value
    if (typeof result?.value?.value === 'number') return result.value.value
    return 1
  }

  async function ensureAccount({ username, email, password, role, faculty_type = null }) {
    const hash = await bcrypt.hash(password, 10)
    const existing = await db.collection('users').findOne({ email })
    if (existing) {
      await db.collection('users').updateOne(
        { email },
        { $set: { username, email, password: hash, role, faculty_type, active: 1 } },
      )
      console.log(`UPDATED ${email}`)
      return
    }

    const userId = await nextSequence('users')
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
    console.log(`CREATED ${email} user_id=${userId}`)
  }

  try {
    await ensureAccount({
      username: 'registrar',
      email: 'registrar@spms.edu',
      password: 'reg123',
      role: 'admin',
    })
    await ensureAccount({
      username: 'faculty',
      email: 'faculty@spms.edu',
      password: 'faculty123',
      role: 'faculty',
      faculty_type: 'Teacher',
    })
    console.log('Demo account repair completed')
  } finally {
    await client.close()
  }
}

run().catch((error) => {
  console.error('Demo account repair failed:', error)
  process.exit(1)
})
