import { Hono } from 'hono'
import type { Bindings, Workout, WorkoutExercise, APIResponse } from '../types/database'
import { authMiddleware } from '../utils/auth'

const workouts = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification sur toutes les routes
workouts.use('*', authMiddleware())

/**
 * GET /api/workouts
 * Récupérer la liste des séances d'entraînement
 */
workouts.get('/', async (c) => {
  try {
    const user = c.get('user')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    
    let query = `
      SELECT w.*, 
             p.name as program_name,
             client.name as client_name,
             coach.name as coach_name
      FROM workouts w
      LEFT JOIN programs p ON w.program_id = p.id
      LEFT JOIN users client ON w.client_id = client.id
      LEFT JOIN users coach ON p.coach_id = coach.id
      WHERE 1=1
    `
    
    if (user.role === 'client') {
      query += ' AND w.client_id = ?'
      const result = await c.env.DB.prepare(query + ' ORDER BY w.scheduled_date DESC LIMIT ? OFFSET ?')
        .bind(user.userId, limit, offset).all()
      return c.json<APIResponse<Workout[]>>({ success: true, data: result.results as Workout[] })
    } else if (user.role === 'coach') {
      query += ' AND (client.coach_id = ? OR p.coach_id = ?)'
      const result = await c.env.DB.prepare(query + ' ORDER BY w.scheduled_date DESC LIMIT ? OFFSET ?')
        .bind(user.userId, user.userId, limit, offset).all()
      return c.json<APIResponse<Workout[]>>({ success: true, data: result.results as Workout[] })
    }
    
    // Admin voit tout
    const result = await c.env.DB.prepare(query + ' ORDER BY w.scheduled_date DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all()
    return c.json<APIResponse<Workout[]>>({ success: true, data: result.results as Workout[] })
    
  } catch (error) {
    console.error('Erreur GET workouts:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * GET /api/workouts/:id
 * Récupérer une séance spécifique avec ses exercices
 */
workouts.get('/:id', async (c) => {
  try {
    const user = c.get('user')
    const workoutId = c.req.param('id')
    
    // Récupérer la séance
    let query = `
      SELECT w.*, 
             p.name as program_name,
             client.name as client_name
      FROM workouts w
      LEFT JOIN programs p ON w.program_id = p.id
      LEFT JOIN users client ON w.client_id = client.id
      WHERE w.id = ?
    `
    
    // Vérification des autorisations
    if (user.role === 'client') {
      query += ' AND w.client_id = ?'
      const workout = await c.env.DB.prepare(query).bind(workoutId, user.userId).first()
      if (!workout) {
        return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
      }
      
      // Récupérer les exercices de la séance
      const exercises = await c.env.DB.prepare(`
        SELECT we.*, e.name as exercise_name, e.category, e.instructions
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.order_index
      `).bind(workoutId).all()
      
      return c.json<APIResponse>({ 
        success: true, 
        data: {
          ...workout,
          exercises: exercises.results
        }
      })
    } else if (user.role === 'coach') {
      const workout = await c.env.DB.prepare(`
        ${query} AND (client.coach_id = ? OR p.coach_id = ?)
      `).bind(workoutId, user.userId, user.userId).first()
      
      if (!workout) {
        return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
      }
      
      const exercises = await c.env.DB.prepare(`
        SELECT we.*, e.name as exercise_name, e.category, e.instructions
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.order_index
      `).bind(workoutId).all()
      
      return c.json<APIResponse>({ 
        success: true, 
        data: {
          ...workout,
          exercises: exercises.results
        }
      })
    }
    
    // Admin
    const workout = await c.env.DB.prepare(query).bind(workoutId).first()
    if (!workout) {
      return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
    }
    
    const exercises = await c.env.DB.prepare(`
      SELECT we.*, e.name as exercise_name, e.category, e.instructions
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
      ORDER BY we.order_index
    `).bind(workoutId).all()
    
    return c.json<APIResponse>({ 
      success: true, 
      data: {
        ...workout,
        exercises: exercises.results
      }
    })
    
  } catch (error) {
    console.error('Erreur GET workout:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/workouts
 * Créer une nouvelle séance d'entraînement
 */
workouts.post('/', async (c) => {
  try {
    const user = c.get('user')
    
    // Seuls les coaches et admins peuvent créer des séances
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const data = await c.req.json()
    const { program_id, client_id, name, description, scheduled_date, duration_minutes, exercises } = data
    
    // Validation des données requises
    if (!client_id || !name || !scheduled_date) {
      return c.json<APIResponse>({ success: false, message: 'Client, nom et date requis' }, 400)
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
    
    // Créer la séance
    const workoutResult = await c.env.DB.prepare(`
      INSERT INTO workouts (program_id, client_id, name, description, scheduled_date, duration_minutes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
      RETURNING *
    `).bind(
      program_id || null,
      client_id,
      name,
      description || null,
      scheduled_date,
      duration_minutes || null
    ).first()
    
    const workoutId = (workoutResult as any).id
    
    // Ajouter les exercices si fournis
    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i]
        await c.env.DB.prepare(`
          INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, duration_seconds, rest_seconds, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          workoutId,
          exercise.exercise_id,
          exercise.sets || null,
          exercise.reps || null,
          exercise.weight || null,
          exercise.duration_seconds || null,
          exercise.rest_seconds || null,
          i + 1
        ).run()
      }
    }
    
    return c.json<APIResponse<Workout>>({ 
      success: true, 
      data: workoutResult as Workout,
      message: 'Séance créée avec succès'
    }, 201)
    
  } catch (error) {
    console.error('Erreur POST workout:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * PUT /api/workouts/:id
 * Mettre à jour une séance d'entraînement
 */
workouts.put('/:id', async (c) => {
  try {
    const user = c.get('user')
    const workoutId = c.req.param('id')
    
    // Vérifier que la séance existe et appartient à l'utilisateur
    let checkQuery = `
      SELECT w.*, client.coach_id
      FROM workouts w
      JOIN users client ON w.client_id = client.id
      WHERE w.id = ?
    `
    
    const existingWorkout = await c.env.DB.prepare(checkQuery).bind(workoutId).first() as any
    
    if (!existingWorkout) {
      return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
    }
    
    // Vérification des autorisations
    if (user.role === 'client' && existingWorkout.client_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    } else if (user.role === 'coach' && existingWorkout.coach_id !== user.userId) {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const data = await c.req.json()
    const { name, description, scheduled_date, duration_minutes, status, notes, completion_rating, calories_burned } = data
    
    // Validation du statut si fourni
    if (status && !['scheduled', 'in_progress', 'completed', 'skipped'].includes(status)) {
      return c.json<APIResponse>({ success: false, message: 'Statut invalide' }, 400)
    }
    
    // Si la séance est marquée comme terminée, ajouter la date de completion
    const completed_at = status === 'completed' ? new Date().toISOString() : null
    
    const result = await c.env.DB.prepare(`
      UPDATE workouts 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          scheduled_date = COALESCE(?, scheduled_date),
          duration_minutes = COALESCE(?, duration_minutes),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          completion_rating = COALESCE(?, completion_rating),
          calories_burned = COALESCE(?, calories_burned),
          completed_at = COALESCE(?, completed_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      name || null,
      description || null,
      scheduled_date || null,
      duration_minutes || null,
      status || null,
      notes || null,
      completion_rating || null,
      calories_burned || null,
      completed_at,
      workoutId
    ).first()
    
    return c.json<APIResponse<Workout>>({ 
      success: true, 
      data: result as Workout,
      message: 'Séance mise à jour avec succès'
    })
    
  } catch (error) {
    console.error('Erreur PUT workout:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * DELETE /api/workouts/:id
 * Supprimer une séance d'entraînement
 */
workouts.delete('/:id', async (c) => {
  try {
    const user = c.get('user')
    const workoutId = c.req.param('id')
    
    // Seuls les coaches et admins peuvent supprimer
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    // Vérifier que la séance existe et appartient au coach
    if (user.role === 'coach') {
      const checkQuery = `
        SELECT w.id
        FROM workouts w
        JOIN users client ON w.client_id = client.id
        WHERE w.id = ? AND client.coach_id = ?
      `
      const existingWorkout = await c.env.DB.prepare(checkQuery).bind(workoutId, user.userId).first()
      if (!existingWorkout) {
        return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
      }
    }
    
    // Supprimer la séance (les exercices liés seront supprimés en cascade)
    await c.env.DB.prepare('DELETE FROM workouts WHERE id = ?').bind(workoutId).run()
    
    return c.json<APIResponse>({ 
      success: true, 
      message: 'Séance supprimée avec succès'
    })
    
  } catch (error) {
    console.error('Erreur DELETE workout:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * POST /api/workouts/:id/exercises
 * Ajouter un exercice à une séance
 */
workouts.post('/:id/exercises', async (c) => {
  try {
    const user = c.get('user')
    const workoutId = c.req.param('id')
    
    // Seuls les coaches peuvent ajouter des exercices
    if (user.role === 'client') {
      return c.json<APIResponse>({ success: false, message: 'Accès refusé' }, 403)
    }
    
    const { exercise_id, sets, reps, weight, duration_seconds, rest_seconds } = await c.req.json()
    
    if (!exercise_id) {
      return c.json<APIResponse>({ success: false, message: 'ID exercice requis' }, 400)
    }
    
    // Récupérer le prochain index d'ordre
    const orderResult = await c.env.DB.prepare(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM workout_exercises WHERE workout_id = ?'
    ).bind(workoutId).first() as any
    
    const result = await c.env.DB.prepare(`
      INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, duration_seconds, rest_seconds, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      workoutId,
      exercise_id,
      sets || null,
      reps || null,
      weight || null,
      duration_seconds || null,
      rest_seconds || null,
      orderResult.next_order
    ).first()
    
    return c.json<APIResponse<WorkoutExercise>>({ 
      success: true, 
      data: result as WorkoutExercise,
      message: 'Exercice ajouté avec succès'
    }, 201)
    
  } catch (error) {
    console.error('Erreur POST workout exercise:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

/**
 * PUT /api/workouts/:workoutId/exercises/:exerciseId
 * Marquer un exercice comme terminé ou mettre à jour ses paramètres
 */
workouts.put('/:workoutId/exercises/:exerciseId', async (c) => {
  try {
    const user = c.get('user')
    const workoutId = c.req.param('workoutId')
    const exerciseId = c.req.param('exerciseId')
    
    // Vérifier que l'utilisateur a accès à cette séance
    if (user.role === 'client') {
      const workoutCheck = await c.env.DB.prepare(
        'SELECT id FROM workouts WHERE id = ? AND client_id = ?'
      ).bind(workoutId, user.userId).first()
      
      if (!workoutCheck) {
        return c.json<APIResponse>({ success: false, message: 'Séance non trouvée' }, 404)
      }
    }
    
    const data = await c.req.json()
    const { completed, sets, reps, weight, duration_seconds, notes } = data
    
    const result = await c.env.DB.prepare(`
      UPDATE workout_exercises 
      SET completed = COALESCE(?, completed),
          sets = COALESCE(?, sets),
          reps = COALESCE(?, reps),
          weight = COALESCE(?, weight),
          duration_seconds = COALESCE(?, duration_seconds),
          notes = COALESCE(?, notes)
      WHERE id = ? AND workout_id = ?
      RETURNING *
    `).bind(
      completed !== undefined ? completed : null,
      sets || null,
      reps || null,
      weight || null,
      duration_seconds || null,
      notes || null,
      exerciseId,
      workoutId
    ).first()
    
    if (!result) {
      return c.json<APIResponse>({ success: false, message: 'Exercice non trouvé' }, 404)
    }
    
    return c.json<APIResponse<WorkoutExercise>>({ 
      success: true, 
      data: result as WorkoutExercise,
      message: 'Exercice mis à jour avec succès'
    })
    
  } catch (error) {
    console.error('Erreur PUT workout exercise:', error)
    return c.json<APIResponse>({ success: false, message: 'Erreur serveur' }, 500)
  }
})

export default workouts