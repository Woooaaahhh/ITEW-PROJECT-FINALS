import 'dotenv/config'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB_NAME || 'spms'

if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

const client = new MongoClient(MONGODB_URI)
await client.connect()
try {
  const db = client.db(DB_NAME)
  await db.collection('users').updateOne(
    { email: 'registrar@spms.edu' },
    { $set: { username: 'admin', active: 1, role: 'admin' } },
  )
  console.log('Updated demo admin account username to "admin"')
} finally {
  await client.close()
}
