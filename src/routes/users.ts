import { Hono } from 'hono'
import type { Bindings, User, UserProfile, UserCreateRequest, UserUpdateRequest, UserProfileUpdateRequest } from '../types/database'
import { authMiddleware, requireRole, hashPassword } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification pour toutes les routes
app.use('*', authMiddleware())

// GET /api/users - Récupérer la liste des utilisateurs (admin/coach)
app.get('/', requireRole(['admin', 'coach']), async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT 
        u.id, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
        u.phone, u.date_of_birth, u.gender, u.profile_image_url, u.bio,
        up.height, up.weight, up.body_fat_percentage, up.muscle_mass, up.bmi,
        up.fitness_level, up.goals, up.medical_conditions, up.preferences
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
    `
    let params: any[] = []

    // Les coaches ne voient que leurs clients
    if (user.role === 'coach') {
      query += ` WHERE u.role = 'client' AND u.id IN (
        SELECT DISTINCT p.client_id FROM programs p WHERE p.coach_id = ?
        UNION
        SELECT DISTINCT a.client_id FROM appointments a WHERE a.coach_id = ?
      )`
      params.push(user.id, user.id)
    }
    // Admin voit tous les utilisateurs

    // Paramètres de pagination
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Filtres
    const role = c.req.query('role')
    const status = c.req.query('status')
    const search = c.req.query('search')

    if (role && user.role === 'admin') {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} u.role = ?`
      params.push(role)
    }

    if (status) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} u.status = ?`
      params.push(status)
    }

    if (search) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} (u.name LIKE ? OR u.email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    // Comptage total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT u.id) as total FROM')
    const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first() as { total: number } | null
    const total = totalResult?.total || 0

    // Requête avec pagination
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await c.env.DB.prepare(query).bind(...params).all()
    const users = result.results

    return c.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des utilisateurs'
    }, 500)
  }
})

// GET /api/users/coaches - Récupérer la liste des coaches actifs
app.get('/coaches', async (c) => {
  try {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.created_at,
        u.phone, u.bio
      FROM users u
      WHERE u.role = 'coach' AND u.status = 'active'
      ORDER BY u.name
    `

    const result = await c.env.DB.prepare(query).all()

    return c.json({
      success: true,
      data: result.results
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des coaches:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des coaches'
    }, 500)
  }
})

// GET /api/users/clients - Récupérer la liste des clients (coach/admin)
app.get('/clients', requireRole(['admin', 'coach']), async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT 
        u.id, u.name, u.email, u.status, u.created_at,
        u.phone, u.date_of_birth, u.gender,
        up.height, up.weight, up.fitness_level, up.goals
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.role = 'client'
    `
    let params: any[] = []

    // Les coaches ne voient que leurs clients
    if (user.role === 'coach') {
      query += ` AND u.id IN (
        SELECT DISTINCT p.client_id FROM programs p WHERE p.coach_id = ?
        UNION
        SELECT DISTINCT a.client_id FROM appointments a WHERE a.coach_id = ?
      )`
      params.push(user.id, user.id)
    }

    query += ' ORDER BY u.name'
    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des clients'
    }, 500)
  }
})

// GET /api/users/:id - Récupérer un utilisateur spécifique
app.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const user = c.get('user')

    const query = `
      SELECT 
        u.id, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
        u.phone, u.date_of_birth, u.gender, u.profile_image_url, u.bio,
        up.height, up.weight, up.body_fat_percentage, up.muscle_mass, up.bmi,
        up.fitness_level, up.goals, up.medical_conditions, up.preferences
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `

    const targetUser = await c.env.DB.prepare(query).bind(userId).first()

    if (!targetUser) {
      return c.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, 404)
    }

    // Vérification d'autorisation
    if (user.role === 'client') {
      // Les clients ne peuvent voir que leur propre profil
      if (parseInt(userId) !== user.id) {
        return c.json({
          success: false,
          error: 'Accès non autorisé'
        }, 403)
      }
    } else if (user.role === 'coach') {
      // Les coaches peuvent voir leur profil, leurs clients, et autres coaches
      if (parseInt(userId) !== user.id && targetUser.role === 'client') {
        // Vérifier que c'est bien un client du coach
        const clientRelation = await c.env.DB.prepare(`
          SELECT 1 FROM programs p WHERE p.coach_id = ? AND p.client_id = ?
          UNION
          SELECT 1 FROM appointments a WHERE a.coach_id = ? AND a.client_id = ?
        `).bind(user.id, userId, user.id, userId).first()

        if (!clientRelation) {
          return c.json({
            success: false,
            error: 'Accès non autorisé'
          }, 403)
        }
      }
    }
    // Admin peut voir tous les profils

    return c.json({
      success: true,
      data: targetUser
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération de l\'utilisateur'
    }, 500)
  }
})

// POST /api/users - Créer un nouvel utilisateur (admin uniquement)
app.post('/', requireRole(['admin']), async (c) => {
  try {
    const userData = await c.req.json() as UserCreateRequest

    // Validation des données
    if (!userData.email || !userData.password || !userData.name) {
      return c.json({
        success: false,
        error: 'Email, nom et mot de passe sont obligatoires'
      }, 400)
    }

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(userData.email).first()

    if (existingUser) {
      return c.json({
        success: false,
        error: 'Un utilisateur avec cet email existe déjà'
      }, 400)
    }

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(userData.password)

    // Créer l'utilisateur
    const result = await c.env.DB.prepare(`
      INSERT INTO users (
        email, password_hash, name, role, status, phone, date_of_birth, gender, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      userData.email,
      hashedPassword,
      userData.name,
      userData.role || 'client',
      userData.status || 'active',
      userData.profile?.phone || null,
      userData.profile?.date_of_birth || null,
      userData.profile?.gender || null
    ).run()

    // Créer le profil utilisateur si nécessaire
    if (userData.profile?.goals) {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (
          user_id, goals, created_at
        ) VALUES (?, ?, datetime('now'))
      `).bind(
        result.meta.last_row_id,
        userData.profile.goals
      ).run()
    }

    // Récupérer l'utilisateur créé
    const createdUser = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.role, u.status, u.created_at,
        u.phone, u.date_of_birth, u.gender,
        up.goals
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `).bind(result.meta.last_row_id).first()

    return c.json({
      success: true,
      data: createdUser,
      message: 'Utilisateur créé avec succès'
    }, 201)
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la création de l\'utilisateur'
    }, 500)
  }
})

// PUT /api/users/:id - Mettre à jour un utilisateur
app.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const user = c.get('user')
    const updateData = await c.req.json() as UserUpdateRequest

    // Vérification d'autorisation
    if (user.role === 'client' && parseInt(userId) !== user.id) {
      return c.json({
        success: false,
        error: 'Vous ne pouvez modifier que votre propre profil'
      }, 403)
    }

    if (user.role === 'coach') {
      // Les coaches peuvent modifier leur profil ou celui de leurs clients
      if (parseInt(userId) !== user.id) {
        const clientRelation = await c.env.DB.prepare(`
          SELECT 1 FROM programs p WHERE p.coach_id = ? AND p.client_id = ?
          UNION
          SELECT 1 FROM appointments a WHERE a.coach_id = ? AND a.client_id = ?
        `).bind(user.id, userId, user.id, userId).first()

        if (!clientRelation) {
          return c.json({
            success: false,
            error: 'Accès non autorisé'
          }, 403)
        }
      }
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first() as User | null

    if (!existingUser) {
      return c.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, 404)
    }

    // Construire la requête de mise à jour des utilisateurs
    const userFields: string[] = []
    const userValues: any[] = []

    if (updateData.name !== undefined) {
      userFields.push('name = ?')
      userValues.push(updateData.name)
    }

    if (updateData.email !== undefined && updateData.email !== existingUser.email) {
      // Vérifier que le nouvel email n'existe pas
      const emailExists = await c.env.DB.prepare(`
        SELECT id FROM users WHERE email = ? AND id != ?
      `).bind(updateData.email, userId).first()

      if (emailExists) {
        return c.json({
          success: false,
          error: 'Cet email est déjà utilisé'
        }, 400)
      }

      userFields.push('email = ?')
      userValues.push(updateData.email)
    }

    // Seul admin peut changer le rôle et le statut
    if (user.role === 'admin') {
      if (updateData.role !== undefined) {
        userFields.push('role = ?')
        userValues.push(updateData.role)
      }
      if (updateData.status !== undefined) {
        userFields.push('status = ?')
        userValues.push(updateData.status)
      }
    }

    userFields.push('updated_at = datetime(\'now\')')
    userValues.push(userId)

    // Mettre à jour l'utilisateur
    if (userFields.length > 1) { // > 1 car updated_at est toujours présent
      await c.env.DB.prepare(`
        UPDATE users 
        SET ${userFields.join(', ')}
        WHERE id = ?
      `).bind(...userValues).run()
    }

    // Mettre à jour le profil si des données profil sont fournies
    if (updateData.profile) {
      const profileFields: string[] = []
      const profileValues: any[] = []

      const profileUpdates = updateData.profile as UserProfileUpdateRequest

      if (profileUpdates.phone !== undefined) {
        profileFields.push('phone = ?')
        profileValues.push(profileUpdates.phone)
      }
      if (profileUpdates.date_of_birth !== undefined) {
        profileFields.push('date_of_birth = ?')
        profileValues.push(profileUpdates.date_of_birth)
      }
      if (profileUpdates.gender !== undefined) {
        profileFields.push('gender = ?')
        profileValues.push(profileUpdates.gender)
      }
      if (profileUpdates.height_cm !== undefined) {
        profileFields.push('height_cm = ?')
        profileValues.push(profileUpdates.height_cm)
      }
      if (profileUpdates.weight_kg !== undefined) {
        profileFields.push('weight_kg = ?')
        profileValues.push(profileUpdates.weight_kg)
      }
      if (profileUpdates.activity_level !== undefined) {
        profileFields.push('activity_level = ?')
        profileValues.push(profileUpdates.activity_level)
      }
      if (profileUpdates.goals !== undefined) {
        profileFields.push('goals = ?')
        profileValues.push(profileUpdates.goals)
      }
      if (profileUpdates.medical_conditions !== undefined) {
        profileFields.push('medical_conditions = ?')
        profileValues.push(profileUpdates.medical_conditions)
      }
      if (profileUpdates.emergency_contact !== undefined) {
        profileFields.push('emergency_contact = ?')
        profileValues.push(profileUpdates.emergency_contact)
      }

      // Champs spécifiques aux coaches
      if (existingUser.role === 'coach') {
        if (profileUpdates.specializations !== undefined) {
          profileFields.push('specializations = ?')
          profileValues.push(profileUpdates.specializations)
        }
        if (profileUpdates.certifications !== undefined) {
          profileFields.push('certifications = ?')
          profileValues.push(profileUpdates.certifications)
        }
        if (profileUpdates.experience_years !== undefined) {
          profileFields.push('experience_years = ?')
          profileValues.push(profileUpdates.experience_years)
        }
        if (profileUpdates.bio !== undefined) {
          profileFields.push('bio = ?')
          profileValues.push(profileUpdates.bio)
        }
        if (profileUpdates.hourly_rate !== undefined) {
          profileFields.push('hourly_rate = ?')
          profileValues.push(profileUpdates.hourly_rate)
        }
        if (profileUpdates.availability !== undefined) {
          profileFields.push('availability = ?')
          profileValues.push(JSON.stringify(profileUpdates.availability))
        }
      }

      profileFields.push('updated_at = datetime(\'now\')')
      profileValues.push(userId)

      if (profileFields.length > 1) {
        // Vérifier si le profil existe
        const existingProfile = await c.env.DB.prepare(`
          SELECT user_id FROM user_profiles WHERE user_id = ?
        `).bind(userId).first()

        if (existingProfile) {
          // Mettre à jour
          await c.env.DB.prepare(`
            UPDATE user_profiles 
            SET ${profileFields.join(', ')}
            WHERE user_id = ?
          `).bind(...profileValues).run()
        } else {
          // Créer le profil
          const insertFields = profileFields.map(f => f.split(' = ')[0])
          insertFields.push('user_id', 'created_at')
          
          const insertValues = [...profileValues.slice(0, -1), userId, 'datetime(\'now\')']
          const placeholders = insertValues.map(() => '?').join(', ')

          await c.env.DB.prepare(`
            INSERT INTO user_profiles (${insertFields.join(', ')})
            VALUES (${placeholders})
          `).bind(...insertValues).run()
        }
      }
    }

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
        u.phone, u.date_of_birth, u.gender, u.profile_image_url, u.bio,
        up.height, up.weight, up.body_fat_percentage, up.muscle_mass, up.bmi,
        up.fitness_level, up.goals, up.medical_conditions, up.preferences
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `).bind(userId).first()

    return c.json({
      success: true,
      data: updatedUser,
      message: 'Utilisateur mis à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'utilisateur'
    }, 500)
  }
})

// DELETE /api/users/:id - Supprimer un utilisateur (soft delete, admin uniquement)
app.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const userId = c.req.param('id')

    // Vérifier que l'utilisateur existe
    const user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first() as User | null

    if (!user) {
      return c.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, 404)
    }

    // Soft delete - marquer comme inactif
    await c.env.DB.prepare(`
      UPDATE users 
      SET status = 'inactive', updated_at = datetime('now')
      WHERE id = ?
    `).bind(userId).run()

    return c.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la suppression de l\'utilisateur'
    }, 500)
  }
})

// GET /api/users/:id/stats - Statistiques d'un utilisateur
app.get('/:id/stats', async (c) => {
  try {
    const userId = c.req.param('id')
    const user = c.get('user')

    // Vérification d'autorisation similaire à GET /:id
    if (user.role === 'client' && parseInt(userId) !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    const targetUser = await c.env.DB.prepare(`
      SELECT id, role FROM users WHERE id = ?
    `).bind(userId).first() as Pick<User, 'id' | 'role'> | null

    if (!targetUser) {
      return c.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, 404)
    }

    let stats = {}

    if (targetUser.role === 'client') {
      // Statistiques pour un client
      const [programs, workouts, appointments, meals] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM programs WHERE client_id = ? AND status = "active"').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM workouts WHERE client_id = ? AND status = "completed"').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM appointments WHERE client_id = ? AND status IN ("confirmed", "scheduled")').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM meals WHERE client_id = ? AND logged_at >= date("now", "-7 days")').bind(userId).first()
      ])

      stats = {
        active_programs: programs?.count || 0,
        completed_workouts: workouts?.count || 0,
        upcoming_appointments: appointments?.count || 0,
        meals_this_week: meals?.count || 0
      }
    } else if (targetUser.role === 'coach') {
      // Statistiques pour un coach
      const [clients, programs, appointments, messages] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(DISTINCT client_id) as count FROM programs WHERE coach_id = ? AND status = "active"').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM programs WHERE coach_id = ? AND status = "active"').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM appointments WHERE coach_id = ? AND status IN ("confirmed", "scheduled")').bind(userId).first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND read_at IS NULL').bind(userId).first()
      ])

      stats = {
        active_clients: clients?.count || 0,
        active_programs: programs?.count || 0,
        upcoming_appointments: appointments?.count || 0,
        unread_messages: messages?.count || 0
      }
    }

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    }, 500)
  }
})

export default app