import { Hono } from 'hono'
import type { Bindings, Program, APIResponse } from '../types/database'
import { authMiddleware } from '../utils/auth'

const programs = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification sur toutes les routes
programs.use('*', authMiddleware())

/**
 * GET /api/programs
 * Récupérer la liste des programmes
 */
programs.get('/', async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT p.*, 
             coach.name as coach_name, 
             client.name as client_name
      FROM programs p
      LEFT JOIN users coach ON p.coach_id = coach.id
      LEFT JOIN users client ON p.client_id = client.id
      WHERE 1=1
    `
    
    if (user.role === 'client') {
      query += ' AND p.client_id = ?'
      const result = await c.env.DB.prepare(query + ' ORDER BY p.created_at DESC').bind(user.userId).all()
      return c.json<APIResponse<Program[]>>({ success: true, data: result.results as Program[] })
    } else if (user.role === 'coach') {
      query += ' AND p.coach_id = ?'
      const result = await c.env.DB.prepare(query + ' ORDER BY p.created_at DESC').bind(user.userId).all()
      return c.json<APIResponse<Program[]>>({ success: true, data: result.results as Program[] })
    }
    
    // Admin voit tout
    const result = await c.env.DB.prepare(query + ' ORDER BY p.created_at DESC').all()
    return c.json<APIResponse<Program[]>>({ success: true, data: result.results as Program[] })
    
  } catch (error) {
    console.error('Erreur GET programs:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * GET /api/programs/:id
 * Récupérer un programme spécifique
 */
programs.get('/:id', async (c) => {
  try {
    const user = c.get('user')
    const programId = c.req.param('id')
    
    let query = `
      SELECT p.*, 
             coach.name as coach_name, 
             client.name as client_name
      FROM programs p
      LEFT JOIN users coach ON p.coach_id = coach.id
      LEFT JOIN users client ON p.client_id = client.id
      WHERE p.id = ?
    `
    
    // Vérification des autorisations
    if (user.role === 'client') {
      query += ' AND p.client_id = ?'
      const result = await c.env.DB.prepare(query).bind(programId, user.userId).first()
      if (!result) {
        return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
      }
      return c.json<APIResponse<Program>>({ success: true, data: result as Program })
    } else if (user.role === 'coach') {
      query += ' AND p.coach_id = ?'
      const result = await c.env.DB.prepare(query).bind(programId, user.userId).first()
      if (!result) {
        return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
      }
      return c.json<APIResponse<Program>>({ success: true, data: result as Program })
    }
    
    // Admin voit tout
    const result = await c.env.DB.prepare(query).bind(programId).first()
    if (!result) {
      return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
    }
    return c.json<APIResponse<Program>>({ success: true, data: result as Program })
    
  } catch (error) {
    console.error('Erreur GET program:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/programs
 * Créer un nouveau programme
 */
programs.post('/', async (c) => {
  try {
    const user = c.get('user')
    
    // Seuls les coaches et admins peuvent créer des programmes
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const data = await c.req.json()
    const { name, description, client_id, type, difficulty, duration_weeks, sessions_per_week, start_date, end_date } = data
    
    // Validation des données requises
    if (!name || !type) {
      return c.json<APIResponse>({ success: false, message: 'Nom et type requis' }, 400)
    }
    
    if (!['strength', 'cardio', 'flexibility', 'mixed'].includes(type)) {
      return c.json<APIResponse>({ success: false, message: 'Type de programme invalide' }, 400)
    }
    
    // Vérifier que le client appartient au coach (si spécifié)
    if (client_id && user.role === 'coach') {
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(client_id, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO programs (name, description, coach_id, client_id, type, difficulty, duration_weeks, sessions_per_week, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      RETURNING *
    `).bind(
      name,
      description || null,
      user.userId,
      client_id || null,
      type,
      difficulty || null,
      duration_weeks || null,
      sessions_per_week || null,
      start_date || null,
      end_date || null
    ).first()
    
    return c.json<APIResponse<Program>>({ 
      success: true, 
      data: result as Program,
      message: 'Programme créé avec succès'
    }, 201)
    
  } catch (error) {
    console.error('Erreur POST program:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * PUT /api/programs/:id
 * Mettre à jour un programme
 */
programs.put('/:id', async (c) => {
  try {
    const user = c.get('user')
    const programId = c.req.param('id')
    
    // Vérifier que le programme existe et appartient à l'utilisateur
    let checkQuery = 'SELECT * FROM programs WHERE id = ?'
    if (user.role === 'coach') {
      checkQuery += ' AND coach_id = ?'
    } else if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const existingProgram = user.role === 'coach' 
      ? await c.env.DB.prepare(checkQuery).bind(programId, user.userId).first()
      : await c.env.DB.prepare(checkQuery).bind(programId).first()
    
    if (!existingProgram) {
      return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
    }
    
    const data = await c.req.json()
    const { name, description, type, difficulty, duration_weeks, sessions_per_week, start_date, end_date, status } = data
    
    // Validation du type si fourni
    if (type && !['strength', 'cardio', 'flexibility', 'mixed'].includes(type)) {
      return c.json<APIResponse>({ success: false, message: 'Type de programme invalide' }, 400)
    }
    
    // Validation du statut si fourni
    if (status && !['draft', 'active', 'completed', 'paused'].includes(status)) {
      return c.json<APIResponse>({ success: false, message: 'Statut invalide' }, 400)
    }
    
    const result = await c.env.DB.prepare(`
      UPDATE programs 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          type = COALESCE(?, type),
          difficulty = COALESCE(?, difficulty),
          duration_weeks = COALESCE(?, duration_weeks),
          sessions_per_week = COALESCE(?, sessions_per_week),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      name || null,
      description || null,
      type || null,
      difficulty || null,
      duration_weeks || null,
      sessions_per_week || null,
      start_date || null,
      end_date || null,
      status || null,
      programId
    ).first()
    
    return c.json<APIResponse<Program>>({ 
      success: true, 
      data: result as Program,
      message: 'Programme mis à jour avec succès'
    })
    
  } catch (error) {
    console.error('Erreur PUT program:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /api/programs/:id
 * Supprimer un programme
 */
programs.delete('/:id', async (c) => {
  try {
    const user = c.get('user')
    const programId = c.req.param('id')
    
    // Seuls les coaches et admins peuvent supprimer
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    // Vérifier que le programme existe et appartient à l'utilisateur
    let checkQuery = 'SELECT * FROM programs WHERE id = ?'
    if (user.role === 'coach') {
      checkQuery += ' AND coach_id = ?'
      const existingProgram = await c.env.DB.prepare(checkQuery).bind(programId, user.userId).first()
      if (!existingProgram) {
        return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
      }
    }
    
    // Supprimer le programme (les séances liées seront supprimées en cascade)
    await c.env.DB.prepare('DELETE FROM programs WHERE id = ?').bind(programId).run()
    
    return c.json<APIResponse>({ 
      success: true, 
      message: 'Programme supprimé avec succès'
    })
    
  } catch (error) {
    console.error('Erreur DELETE program:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/programs/:id/assign
 * Assigner un programme à un client
 */
programs.post('/:id/assign', async (c) => {
  try {
    const user = c.get('user')
    const programId = c.req.param('id')
    
    // Seuls les coaches peuvent assigner des programmes
    if (user.role !== 'coach' && user.role !== 'admin') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const { client_id } = await c.req.json()
    
    if (!client_id) {
      return c.json<APIResponse>({ success: false, message: 'ID client requis' }, 400)
    }
    
    // Vérifier que le client appartient au coach
    if (user.role === 'coach') {
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(client_id, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    }
    
    // Mettre à jour le programme
    const result = await c.env.DB.prepare(`
      UPDATE programs 
      SET client_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND coach_id = ?
      RETURNING *
    `).bind(client_id, programId, user.userId).first()
    
    if (!result) {
      return c.json<APIResponse>({ success: false, message: 'Programme non trouvé' }, 404)
    }
    
    return c.json<APIResponse<Program>>({ 
      success: true, 
      data: result as Program,
      message: 'Programme assigné avec succès'
    })
    
  } catch (error) {
    console.error('Erreur assign program:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

export default programs