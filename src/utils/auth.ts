import { Context } from 'hono'
import { sign, verify } from 'hono/jwt'
import * as bcrypt from 'bcryptjs'
import type { JWTPayload, User, Bindings } from '../types/database'

// Constantes
const JWT_SECRET = 'coachfit-secret-key-change-in-production'
const JWT_EXPIRES_IN = 60 * 60 * 24 * 7 // 7 jours

/**
 * Hash un mot de passe avec bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Vérifie un mot de passe avec le hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

/**
 * Génère un token JWT
 */
export const generateJWT = async (user: User): Promise<string> => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN
  }
  
  return await sign(payload, JWT_SECRET)
}

/**
 * Vérifie et décode un token JWT
 */
export const verifyJWT = async (token: string): Promise<JWTPayload | null> => {
  try {
    const payload = await verify(token, JWT_SECRET) as JWTPayload
    
    // Vérifier l'expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch (error) {
    return null
  }
}

/**
 * Middleware d'authentification
 */
export const authMiddleware = () => {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, message: 'Token manquant' }, 401)
    }
    
    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)
    
    if (!payload) {
      return c.json({ success: false, message: 'Token invalide' }, 401)
    }
    
    // Ajouter les infos utilisateur au context
    c.set('user', payload)
    
    await next()
  }
}

/**
 * Middleware pour vérifier le rôle utilisateur
 */
export const requireRole = (roles: string[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      return c.json({ success: false, message: 'Utilisateur non authentifié' }, 401)
    }
    
    if (!roles.includes(user.role)) {
      return c.json({ success: false, message: 'Accès refusé' }, 403)
    }
    
    await next()
  }
}

/**
 * Récupère l'utilisateur depuis la base de données
 */
export const getUserById = async (db: D1Database, userId: number): Promise<User | null> => {
  const result = await db.prepare(
    'SELECT * FROM users WHERE id = ? AND status = "active"'
  ).bind(userId).first()
  
  return result as User | null
}

/**
 * Récupère l'utilisateur par email
 */
export const getUserByEmail = async (db: D1Database, email: string): Promise<User | null> => {
  const result = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND status = "active"'
  ).bind(email).first()
  
  return result as User | null
}

/**
 * Crée un nouvel utilisateur
 */
export const createUser = async (
  db: D1Database, 
  email: string, 
  password: string, 
  name: string, 
  role: 'client' | 'coach' = 'client',
  phone?: string
): Promise<User | null> => {
  try {
    const hashedPassword = await hashPassword(password)
    
    const result = await db.prepare(`
      INSERT INTO users (email, password_hash, name, role, phone, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      RETURNING *
    `).bind(email, hashedPassword, name, role, phone || null).first()
    
    return result as User
  } catch (error) {
    console.error('Erreur création utilisateur:', error)
    return null
  }
}

/**
 * Validation email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validation mot de passe (minimum 6 caractères)
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6
}

/**
 * Nettoie les données utilisateur (supprime le hash du mot de passe)
 */
export const sanitizeUser = (user: User): Omit<User, 'password_hash'> => {
  const { password_hash, ...sanitized } = user
  return sanitized
}