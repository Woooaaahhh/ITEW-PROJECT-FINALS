import dns from 'node:dns'
import { MongoClient } from 'mongodb'

// Set Google DNS servers to resolve SRV records
dns.setServers(['8.8.8.8', '8.8.4.4'])

let cachedDb = null

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  
  const db = client.db(process.env.MONGODB_DB_NAME || 'spms')
  cachedDb = db
  
  return db
}

function signToken(payload) {
  // Simple JWT implementation for Vercel
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))
  const signature = btoa(`${header}.${payloadStr}.${process.env.JWT_SECRET || 'secret'}`)
  return `${header}.${payloadStr}.${signature}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const db = await connectToDatabase()
    
    if (req.method === 'POST' && req.url === '/api/auth/login') {
      const { identifier, password } = req.body
      
      const user = await db.collection('users').findOne({
        $or: [
          { username: identifier },
          { email: identifier },
          { student_id: parseInt(identifier) }
        ]
      })
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
      
      const token = signToken({ sub: user.user_id, role: user.role })
      const { password: _, ...userOut } = user
      
      return res.json({ token, user: userOut })
    }
    
    if (req.method === 'GET' && req.url === '/api/auth/me') {
      const header = req.headers.authorization || ''
      const [, token] = header.split(' ')
      
      if (!token) {
        return res.status(401).json({ message: 'Missing token' })
      }
      
      // Simple token validation
      try {
        const [, payloadStr] = token.split('.')
        const payload = JSON.parse(atob(payloadStr))
        
        if (payload.exp < Date.now()) {
          return res.status(401).json({ message: 'Token expired' })
        }
        
        const user = await db.collection('users').findOne({ user_id: payload.sub })
        if (!user) {
          return res.status(401).json({ message: 'User not found' })
        }
        
        const { password: _, ...userOut } = user
        return res.json({ user: userOut })
        
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' })
      }
    }
    
    res.status(404).json({ message: 'Endpoint not found' })
    
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
