import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const JWT_ISSUER = 'spms-api'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h', issuer: JWT_ISSUER })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER })
}

