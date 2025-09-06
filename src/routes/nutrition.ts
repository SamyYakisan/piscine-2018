import { Hono } from 'hono'
import type { Bindings, Meal, NutritionGoal, APIResponse } from '../types/database'
import { authMiddleware } from '../utils/auth'

const nutrition = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification sur toutes les routes
nutrition.use('*', authMiddleware())

/**
 * GET /api/nutrition/meals
 * Récupérer les repas
 */
nutrition.get('/meals', async (c) => {
  try {
    const user = c.get('user')
    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    const client_id = c.req.query('client_id')
    
    if (user.role === 'client') {
      // Client ne voit que ses propres repas
      const meals = await c.env.DB.prepare(
        'SELECT * FROM meals WHERE client_id = ? AND date = ? ORDER BY type, created_at'
      ).bind(user.userId, date).all()
      
      return c.json<APIResponse<Meal[]>>({ success: true, data: meals.results as Meal[] })
    } else if (user.role === 'coach') {
      // Coach peut voir les repas de ses clients
      let query = `
        SELECT m.*, u.name as client_name
        FROM meals m
        JOIN users u ON m.client_id = u.id
        WHERE u.coach_id = ? AND m.date = ?
      `
      
      // Filtrer par client spécifique si fourni
      if (client_id) {
        query += ' AND m.client_id = ?'
        const meals = await c.env.DB.prepare(query + ' ORDER BY u.name, m.type, m.created_at')
          .bind(user.userId, date, client_id).all()
        return c.json<APIResponse<Meal[]>>({ success: true, data: meals.results as Meal[] })
      }
      
      const meals = await c.env.DB.prepare(query + ' ORDER BY u.name, m.type, m.created_at')
        .bind(user.userId, date).all()
      return c.json<APIResponse<Meal[]>>({ success: true, data: meals.results as Meal[] })
    }
    
    // Admin voit tout
    let query = 'SELECT m.*, u.name as client_name FROM meals m JOIN users u ON m.client_id = u.id WHERE m.date = ?'
    if (client_id) {
      query += ' AND m.client_id = ?'
      const meals = await c.env.DB.prepare(query + ' ORDER BY u.name, m.type, m.created_at')
        .bind(date, client_id).all()
      return c.json<APIResponse<Meal[]>>({ success: true, data: meals.results as Meal[] })
    }
    
    const meals = await c.env.DB.prepare(query + ' ORDER BY u.name, m.type, m.created_at')
      .bind(date).all()
    return c.json<APIResponse<Meal[]>>({ success: true, data: meals.results as Meal[] })
    
  } catch (error) {
    console.error('Erreur GET meals:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/nutrition/meals
 * Ajouter un repas
 */
nutrition.post('/meals', async (c) => {
  try {
    const user = c.get('user')
    const data = await c.req.json()
    let { client_id, date, type, name, description, calories, proteins, carbs, fats, fiber, sugar, sodium, image_url } = data
    
    // Validation des données requises
    if (!date || !type || !name) {
      return c.json<APIResponse>({ success: false, message: 'Date, type et nom requis' }, 400)
    }
    
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(type)) {
      return c.json<APIResponse>({ success: false, message: 'Type de repas invalide' }, 400)
    }
    
    // Déterminer l'ID du client
    if (user.role === 'client') {
      client_id = user.userId
    } else if (user.role === 'coach') {
      if (!client_id) {
        return c.json<APIResponse>({ success: false, message: 'ID client requis' }, 400)
      }
      // Vérifier que le client appartient au coach
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(client_id, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    } else if (user.role === 'admin') {
      if (!client_id) {
        return c.json<APIResponse>({ success: false, message: 'ID client requis' }, 400)
      }
    }
    
    const result = await c.env.DB.prepare(`
      INSERT INTO meals (client_id, date, type, name, description, calories, proteins, carbs, fats, fiber, sugar, sodium, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      client_id,
      date,
      type,
      name,
      description || null,
      calories || null,
      proteins || null,
      carbs || null,
      fats || null,
      fiber || null,
      sugar || null,
      sodium || null,
      image_url || null
    ).first()
    
    return c.json<APIResponse<Meal>>({ 
      success: true, 
      data: result as Meal,
      message: 'Repas ajouté avec succès'
    }, 201)
    
  } catch (error) {
    console.error('Erreur POST meal:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * PUT /api/nutrition/meals/:id
 * Mettre à jour un repas
 */
nutrition.put('/meals/:id', async (c) => {
  try {
    const user = c.get('user')
    const mealId = c.req.param('id')
    
    // Vérifier que le repas existe et appartient à l'utilisateur
    let checkQuery = 'SELECT m.*, u.coach_id FROM meals m JOIN users u ON m.client_id = u.id WHERE m.id = ?'
    const existingMeal = await c.env.DB.prepare(checkQuery).bind(mealId).first() as any
    
    if (!existingMeal) {
      return c.json<APIResponse>({ success: false, message: 'Repas non trouvé' }, 404)
    }
    
    // Vérification des autorisations
    if (user.role === 'client' && existingMeal.client_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach' && existingMeal.coach_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const data = await c.req.json()
    const { name, description, calories, proteins, carbs, fats, fiber, sugar, sodium, image_url } = data
    
    const result = await c.env.DB.prepare(`
      UPDATE meals 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          calories = COALESCE(?, calories),
          proteins = COALESCE(?, proteins),
          carbs = COALESCE(?, carbs),
          fats = COALESCE(?, fats),
          fiber = COALESCE(?, fiber),
          sugar = COALESCE(?, sugar),
          sodium = COALESCE(?, sodium),
          image_url = COALESCE(?, image_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      name || null,
      description || null,
      calories || null,
      proteins || null,
      carbs || null,
      fats || null,
      fiber || null,
      sugar || null,
      sodium || null,
      image_url || null,
      mealId
    ).first()
    
    return c.json<APIResponse<Meal>>({ 
      success: true, 
      data: result as Meal,
      message: 'Repas mis à jour avec succès'
    })
    
  } catch (error) {
    console.error('Erreur PUT meal:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /api/nutrition/meals/:id
 * Supprimer un repas
 */
nutrition.delete('/meals/:id', async (c) => {
  try {
    const user = c.get('user')
    const mealId = c.req.param('id')
    
    // Vérifier que le repas existe et appartient à l'utilisateur
    let checkQuery = 'SELECT m.*, u.coach_id FROM meals m JOIN users u ON m.client_id = u.id WHERE m.id = ?'
    const existingMeal = await c.env.DB.prepare(checkQuery).bind(mealId).first() as any
    
    if (!existingMeal) {
      return c.json<APIResponse>({ success: false, message: 'Repas non trouvé' }, 404)
    }
    
    // Vérification des autorisations
    if (user.role === 'client' && existingMeal.client_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach' && existingMeal.coach_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    await c.env.DB.prepare('DELETE FROM meals WHERE id = ?').bind(mealId).run()
    
    return c.json<APIResponse>({ 
      success: true, 
      message: 'Repas supprimé avec succès'
    })
    
  } catch (error) {
    console.error('Erreur DELETE meal:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * GET /api/nutrition/goals/:clientId
 * Récupérer les objectifs nutritionnels d'un client
 */
nutrition.get('/goals/:clientId', async (c) => {
  try {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    
    // Vérification des autorisations
    if (user.role === 'client' && parseInt(clientId) !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach') {
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(clientId, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    }
    
    const goal = await c.env.DB.prepare(
      'SELECT * FROM nutrition_goals WHERE client_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1'
    ).bind(clientId).first()
    
    return c.json<APIResponse<NutritionGoal | null>>({ 
      success: true, 
      data: goal as NutritionGoal || null
    })
    
  } catch (error) {
    console.error('Erreur GET nutrition goal:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/nutrition/goals
 * Créer ou mettre à jour les objectifs nutritionnels
 */
nutrition.post('/goals', async (c) => {
  try {
    const user = c.get('user')
    let data = await c.req.json()
    let { client_id, daily_calories, daily_proteins, daily_carbs, daily_fats, daily_fiber, daily_water_ml } = data
    
    // Seuls les coaches et admins peuvent créer des objectifs
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
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
    
    // Désactiver les anciens objectifs
    await c.env.DB.prepare(
      'UPDATE nutrition_goals SET is_active = false WHERE client_id = ?'
    ).bind(client_id).run()
    
    // Créer le nouvel objectif
    const result = await c.env.DB.prepare(`
      INSERT INTO nutrition_goals (client_id, daily_calories, daily_proteins, daily_carbs, daily_fats, daily_fiber, daily_water_ml, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
      RETURNING *
    `).bind(
      client_id,
      daily_calories || null,
      daily_proteins || null,
      daily_carbs || null,
      daily_fats || null,
      daily_fiber || null,
      daily_water_ml || null,
      user.userId
    ).first()
    
    return c.json<APIResponse<NutritionGoal>>({ 
      success: true, 
      data: result as NutritionGoal,
      message: 'Objectifs nutritionnels créés avec succès'
    }, 201)
    
  } catch (error) {
    console.error('Erreur POST nutrition goal:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * GET /api/nutrition/summary/:clientId
 * Récupérer le résumé nutritionnel d'un client pour une date
 */
nutrition.get('/summary/:clientId', async (c) => {
  try {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    
    // Vérification des autorisations
    if (user.role === 'client' && parseInt(clientId) !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach') {
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(clientId, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    }
    
    // Récupérer le résumé des macros du jour
    const summary = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(proteins), 0) as total_proteins,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fats), 0) as total_fats,
        COALESCE(SUM(fiber), 0) as total_fiber,
        COALESCE(SUM(sugar), 0) as total_sugar,
        COALESCE(SUM(sodium), 0) as total_sodium,
        COUNT(*) as total_meals
      FROM meals 
      WHERE client_id = ? AND date = ?
    `).bind(clientId, date).first()
    
    // Récupérer les objectifs actifs
    const goals = await c.env.DB.prepare(
      'SELECT * FROM nutrition_goals WHERE client_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1'
    ).bind(clientId).first()
    
    // Récupérer la répartition par type de repas
    const mealBreakdown = await c.env.DB.prepare(`
      SELECT 
        type,
        COALESCE(SUM(calories), 0) as calories,
        COALESCE(SUM(proteins), 0) as proteins,
        COALESCE(SUM(carbs), 0) as carbs,
        COALESCE(SUM(fats), 0) as fats,
        COUNT(*) as meal_count
      FROM meals 
      WHERE client_id = ? AND date = ?
      GROUP BY type
      ORDER BY 
        CASE type 
          WHEN 'breakfast' THEN 1
          WHEN 'lunch' THEN 2 
          WHEN 'dinner' THEN 3
          WHEN 'snack' THEN 4
        END
    `).bind(clientId, date).all()
    
    return c.json<APIResponse>({ 
      success: true, 
      data: {
        date,
        summary: summary,
        goals: goals,
        mealBreakdown: mealBreakdown.results
      }
    })
    
  } catch (error) {
    console.error('Erreur GET nutrition summary:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * GET /api/nutrition/progress/:clientId
 * Récupérer l'évolution nutritionnelle d'un client sur une période
 */
nutrition.get('/progress/:clientId', async (c) => {
  try {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const days = parseInt(c.req.query('days') || '7')
    
    // Vérification des autorisations
    if (user.role === 'client' && parseInt(clientId) !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach') {
      const clientCheck = await c.env.DB.prepare(
        'SELECT id FROM users WHERE id = ? AND coach_id = ? AND role = "client"'
      ).bind(clientId, user.userId).first()
      
      if (!clientCheck) {
        return c.json<APIResponse>({ success: false, message: 'Client non trouvé ou non assigné' }, 400)
      }
    }
    
    const progress = await c.env.DB.prepare(`
      SELECT 
        date,
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(proteins), 0) as total_proteins,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fats), 0) as total_fats,
        COUNT(*) as total_meals
      FROM meals 
      WHERE client_id = ? AND date >= DATE('now', ?)
      GROUP BY date
      ORDER BY date DESC
    `).bind(clientId, `-${days} days`).all()
    
    return c.json<APIResponse>({ 
      success: true, 
      data: progress.results
    })
    
  } catch (error) {
    console.error('Erreur GET nutrition progress:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

export default nutrition