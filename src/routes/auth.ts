import { Hono } from 'hono'
import type { Bindings, LoginRequest, RegisterRequest, AuthResponse } from '../types/database'
import {
  getUserByEmail,
  createUser,
  verifyPassword,
  generateJWT,
  sanitizeUser,
  isValidEmail,
  isValidPassword,
  authMiddleware,
  getUserById
} from '../utils/auth'

const auth = new Hono<{ Bindings: Bindings }>()

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
auth.post('/login', async (c) => {
  try {
    const { email, password }: LoginRequest = await c.req.json()
    
    // Validation des données
    if (!email || !password) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Email et mot de passe requis' 
      }, 400)
    }
    
    if (!isValidEmail(email)) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Format d\'email invalide' 
      }, 400)
    }
    
    // Récupérer l'utilisateur
    const user = await getUserByEmail(c.env.DB, email)
    if (!user) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      }, 401)
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, user.password_hash)
    if (!isPasswordValid) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      }, 401)
    }
    
    // Générer le token JWT
    const token = await generateJWT(user)
    
    return c.json<AuthResponse>({
      success: true,
      token,
      user: sanitizeUser(user)
    })
    
  } catch (error) {
    console.error('Erreur login:', error)
    return c.json<AuthResponse>({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    }, 500)
  }
})

/**
 * POST /api/auth/register
 * Inscription utilisateur
 */
auth.post('/register', async (c) => {
  try {
    const { email, password, name, role, phone }: RegisterRequest = await c.req.json()
    
    // Validation des données
    if (!email || !password || !name) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Email, mot de passe et nom requis' 
      }, 400)
    }
    
    if (!isValidEmail(email)) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Format d\'email invalide' 
      }, 400)
    }
    
    if (!isValidPassword(password)) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400)
    }
    
    if (role && !['client', 'coach'].includes(role)) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Rôle invalide' 
      }, 400)
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await getUserByEmail(c.env.DB, email)
    if (existingUser) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Un compte avec cet email existe déjà' 
      }, 409)
    }
    
    // Créer l'utilisateur
    const newUser = await createUser(c.env.DB, email, password, name, role || 'client', phone)
    if (!newUser) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Erreur lors de la création du compte' 
      }, 500)
    }
    
    // Générer le token JWT
    const token = await generateJWT(newUser)
    
    return c.json<AuthResponse>({
      success: true,
      token,
      user: sanitizeUser(newUser)
    }, 201)
    
  } catch (error) {
    console.error('Erreur register:', error)
    return c.json<AuthResponse>({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    }, 500)
  }
})

/**
 * GET /api/auth/me
 * Récupérer les infos de l'utilisateur connecté
 */
auth.get('/me', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    
    // Récupérer les infos complètes depuis la DB
    const fullUser = await getUserById(c.env.DB, user.userId)
    if (!fullUser) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      }, 404)
    }
    
    return c.json<AuthResponse>({
      success: true,
      user: sanitizeUser(fullUser)
    })
    
  } catch (error) {
    console.error('Erreur /me:', error)
    return c.json<AuthResponse>({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    }, 500)
  }
})

/**
 * POST /api/auth/logout
 * Déconnexion (côté client seulement, JWT supprimé côté client)
 */
auth.post('/logout', authMiddleware(), async (c) => {
  // Le JWT sera supprimé côté client
  // Ici on peut log l'événement ou faire du cleanup si nécessaire
  
  return c.json<AuthResponse>({
    success: true,
    message: 'Déconnexion réussie'
  })
})

/**
 * POST /api/auth/change-password
 * Changer le mot de passe
 */
auth.post('/change-password', authMiddleware(), async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json()
    const user = c.get('user')
    
    if (!currentPassword || !newPassword) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Mot de passe actuel et nouveau requis' 
      }, 400)
    }
    
    if (!isValidPassword(newPassword)) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      }, 400)
    }
    
    // Récupérer l'utilisateur complet
    const fullUser = await getUserById(c.env.DB, user.userId)
    if (!fullUser) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      }, 404)
    }
    
    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await verifyPassword(currentPassword, fullUser.password_hash)
    if (!isCurrentPasswordValid) {
      return c.json<AuthResponse>({ 
        success: false, 
        message: 'Mot de passe actuel incorrect' 
      }, 401)
    }
    
    // Hasher le nouveau mot de passe
    const bcrypt = await import('bcryptjs')
    const newHashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Mettre à jour en base
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newHashedPassword, user.userId).run()
    
    return c.json<AuthResponse>({
      success: true,
      message: 'Mot de passe modifié avec succès'
    })
    
  } catch (error) {
    console.error('Erreur change-password:', error)
    return c.json<AuthResponse>({ 
      success: false, 
      message: 'Erreur interne du serveur' 
    }, 500)
  }
})

export default auth