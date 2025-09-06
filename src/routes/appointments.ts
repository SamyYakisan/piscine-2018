import { Hono } from 'hono'
import type { Bindings, Appointment, AppointmentCreateRequest, AppointmentUpdateRequest } from '../types/database'
import { authMiddleware, requireRole } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification pour toutes les routes
app.use('*', authMiddleware())

// GET /api/appointments - Récupérer les rendez-vous selon le rôle
app.get('/', async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT 
        a.*,
        c.name as client_name,
        c.email as client_email,
        co.name as coach_name,
        co.email as coach_email
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users co ON a.coach_id = co.id
    `
    let params: any[] = []

    // Filtrage selon le rôle
    if (user.role === 'client') {
      query += ' WHERE a.client_id = ? AND a.status != "cancelled"'
      params.push(user.id)
    } else if (user.role === 'coach') {
      query += ' WHERE a.coach_id = ? AND a.status != "cancelled"'
      params.push(user.id)
    }
    // Admin voit tous les rendez-vous

    // Paramètres de pagination
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '10'), 100)
    const offset = (page - 1) * limit

    // Filtres optionnels
    const status = c.req.query('status')
    const date = c.req.query('date')
    const coachId = c.req.query('coach_id')
    const clientId = c.req.query('client_id')

    if (status) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} a.status = ?`
      params.push(status)
    }

    if (date) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} DATE(a.scheduled_at) = ?`
      params.push(date)
    }

    if (coachId && user.role === 'admin') {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} a.coach_id = ?`
      params.push(coachId)
    }

    if (clientId && (user.role === 'admin' || (user.role === 'coach' && user.id == coachId))) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} a.client_id = ?`
      params.push(clientId)
    }

    // Comptage total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM')
    const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first() as { total: number } | null
    const total = totalResult?.total || 0

    // Requête avec pagination
    query += ' ORDER BY a.scheduled_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await c.env.DB.prepare(query).bind(...params).all()
    const appointments = result.results as Appointment[]

    return c.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des rendez-vous'
    }, 500)
  }
})

// GET /api/appointments/:id - Récupérer un rendez-vous spécifique
app.get('/:id', async (c) => {
  try {
    const appointmentId = c.req.param('id')
    const user = c.get('user')

    const query = `
      SELECT 
        a.*,
        c.name as client_name,
        c.email as client_email,
        co.name as coach_name,
        co.email as coach_email
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users co ON a.coach_id = co.id
      WHERE a.id = ?
    `

    const appointment = await c.env.DB.prepare(query).bind(appointmentId).first() as Appointment | null

    if (!appointment) {
      return c.json({
        success: false,
        error: 'Rendez-vous non trouvé'
      }, 404)
    }

    // Vérification d'autorisation
    if (user.role === 'client' && appointment.client_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    if (user.role === 'coach' && appointment.coach_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    return c.json({
      success: true,
      data: appointment
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du rendez-vous:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération du rendez-vous'
    }, 500)
  }
})

// POST /api/appointments - Créer un nouveau rendez-vous
app.post('/', async (c) => {
  try {
    const user = c.get('user')
    const appointmentData = await c.req.json() as AppointmentCreateRequest

    // Validation des données
    if (!appointmentData.scheduled_at || !appointmentData.duration_minutes) {
      return c.json({
        success: false,
        error: 'Date et durée sont obligatoires'
      }, 400)
    }

    // Déterminer coach_id et client_id selon le rôle
    let coachId: number
    let clientId: number

    if (user.role === 'coach') {
      if (!appointmentData.client_id) {
        return c.json({
          success: false,
          error: 'Client ID requis pour les coaches'
        }, 400)
      }
      coachId = user.id
      clientId = appointmentData.client_id
    } else if (user.role === 'client') {
      if (!appointmentData.coach_id) {
        return c.json({
          success: false,
          error: 'Coach ID requis pour les clients'
        }, 400)
      }
      coachId = appointmentData.coach_id
      clientId = user.id
    } else if (user.role === 'admin') {
      if (!appointmentData.coach_id || !appointmentData.client_id) {
        return c.json({
          success: false,
          error: 'Coach ID et Client ID requis pour les admins'
        }, 400)
      }
      coachId = appointmentData.coach_id
      clientId = appointmentData.client_id
    } else {
      return c.json({
        success: false,
        error: 'Rôle non autorisé'
      }, 403)
    }

    // Vérifier que le coach et le client existent
    const [coach, client] = await Promise.all([
      c.env.DB.prepare('SELECT id, role FROM users WHERE id = ? AND role = "coach" AND status = "active"').bind(coachId).first(),
      c.env.DB.prepare('SELECT id, role FROM users WHERE id = ? AND role = "client" AND status = "active"').bind(clientId).first()
    ])

    if (!coach) {
      return c.json({
        success: false,
        error: 'Coach non trouvé ou inactif'
      }, 400)
    }

    if (!client) {
      return c.json({
        success: false,
        error: 'Client non trouvé ou inactif'
      }, 400)
    }

    // Vérifier les conflits d'horaires
    const scheduledAt = new Date(appointmentData.scheduled_at)
    const endTime = new Date(scheduledAt.getTime() + appointmentData.duration_minutes * 60000)

    const conflictQuery = `
      SELECT id FROM appointments 
      WHERE coach_id = ? 
      AND status IN ('scheduled', 'confirmed')
      AND (
        (datetime(scheduled_at) <= datetime(?) AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') > datetime(?))
        OR
        (datetime(scheduled_at) < datetime(?) AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') >= datetime(?))
        OR
        (datetime(scheduled_at) >= datetime(?) AND datetime(scheduled_at) < datetime(?))
      )
    `

    const conflict = await c.env.DB.prepare(conflictQuery).bind(
      coachId,
      appointmentData.scheduled_at, appointmentData.scheduled_at,
      endTime.toISOString(), endTime.toISOString(),
      appointmentData.scheduled_at, endTime.toISOString()
    ).first()

    if (conflict) {
      return c.json({
        success: false,
        error: 'Conflit d\'horaires détecté'
      }, 409)
    }

    // Créer le rendez-vous
    const result = await c.env.DB.prepare(`
      INSERT INTO appointments (
        coach_id, client_id, scheduled_at, duration_minutes,
        type, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      coachId,
      clientId,
      appointmentData.scheduled_at,
      appointmentData.duration_minutes,
      appointmentData.type || 'consultation',
      appointmentData.status || 'scheduled',
      appointmentData.notes || null
    ).run()

    // Récupérer le rendez-vous créé avec les infos utilisateur
    const createdAppointment = await c.env.DB.prepare(`
      SELECT 
        a.*,
        c.name as client_name,
        c.email as client_email,
        co.name as coach_name,
        co.email as coach_email
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users co ON a.coach_id = co.id
      WHERE a.id = ?
    `).bind(result.meta.last_row_id).first()

    return c.json({
      success: true,
      data: createdAppointment,
      message: 'Rendez-vous créé avec succès'
    }, 201)
  } catch (error) {
    console.error('Erreur lors de la création du rendez-vous:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la création du rendez-vous'
    }, 500)
  }
})

// PUT /api/appointments/:id - Mettre à jour un rendez-vous
app.put('/:id', async (c) => {
  try {
    const appointmentId = c.req.param('id')
    const user = c.get('user')
    const updateData = await c.req.json() as AppointmentUpdateRequest

    // Récupérer le rendez-vous existant
    const existingAppointment = await c.env.DB.prepare(`
      SELECT * FROM appointments WHERE id = ?
    `).bind(appointmentId).first() as Appointment | null

    if (!existingAppointment) {
      return c.json({
        success: false,
        error: 'Rendez-vous non trouvé'
      }, 404)
    }

    // Vérification d'autorisation
    if (user.role === 'client' && existingAppointment.client_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    if (user.role === 'coach' && existingAppointment.coach_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    // Les clients ne peuvent que annuler ou confirmer
    if (user.role === 'client' && updateData.status && !['confirmed', 'cancelled'].includes(updateData.status)) {
      return c.json({
        success: false,
        error: 'Les clients ne peuvent que confirmer ou annuler'
      }, 403)
    }

    // Vérifier les conflits si l'horaire change
    if (updateData.scheduled_at || updateData.duration_minutes) {
      const newScheduledAt = updateData.scheduled_at || existingAppointment.scheduled_at
      const newDuration = updateData.duration_minutes || existingAppointment.duration_minutes
      const endTime = new Date(new Date(newScheduledAt).getTime() + newDuration * 60000)

      const conflictQuery = `
        SELECT id FROM appointments 
        WHERE coach_id = ? AND id != ?
        AND status IN ('scheduled', 'confirmed')
        AND (
          (datetime(scheduled_at) <= datetime(?) AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') > datetime(?))
          OR
          (datetime(scheduled_at) < datetime(?) AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') >= datetime(?))
          OR
          (datetime(scheduled_at) >= datetime(?) AND datetime(scheduled_at) < datetime(?))
        )
      `

      const conflict = await c.env.DB.prepare(conflictQuery).bind(
        existingAppointment.coach_id,
        appointmentId,
        newScheduledAt, newScheduledAt,
        endTime.toISOString(), endTime.toISOString(),
        newScheduledAt, endTime.toISOString()
      ).first()

      if (conflict) {
        return c.json({
          success: false,
          error: 'Conflit d\'horaires détecté'
        }, 409)
      }
    }

    // Construire la requête de mise à jour
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (updateData.scheduled_at !== undefined) {
      updateFields.push('scheduled_at = ?')
      updateValues.push(updateData.scheduled_at)
    }
    if (updateData.duration_minutes !== undefined) {
      updateFields.push('duration_minutes = ?')
      updateValues.push(updateData.duration_minutes)
    }
    if (updateData.type !== undefined) {
      updateFields.push('type = ?')
      updateValues.push(updateData.type)
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?')
      updateValues.push(updateData.status)
    }
    if (updateData.notes !== undefined) {
      updateFields.push('notes = ?')
      updateValues.push(updateData.notes)
    }

    updateFields.push('updated_at = datetime(\'now\')')

    if (updateFields.length === 1) { // Seulement updated_at
      return c.json({
        success: false,
        error: 'Aucune donnée à mettre à jour'
      }, 400)
    }

    updateValues.push(appointmentId)

    await c.env.DB.prepare(`
      UPDATE appointments 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run()

    // Récupérer le rendez-vous mis à jour
    const updatedAppointment = await c.env.DB.prepare(`
      SELECT 
        a.*,
        c.name as client_name,
        c.email as client_email,
        co.name as coach_name,
        co.email as coach_email
      FROM appointments a
      JOIN users c ON a.client_id = c.id
      JOIN users co ON a.coach_id = co.id
      WHERE a.id = ?
    `).bind(appointmentId).first()

    return c.json({
      success: true,
      data: updatedAppointment,
      message: 'Rendez-vous mis à jour avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rendez-vous:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la mise à jour du rendez-vous'
    }, 500)
  }
})

// DELETE /api/appointments/:id - Supprimer un rendez-vous (soft delete)
app.delete('/:id', async (c) => {
  try {
    const appointmentId = c.req.param('id')
    const user = c.get('user')

    // Récupérer le rendez-vous
    const appointment = await c.env.DB.prepare(`
      SELECT * FROM appointments WHERE id = ?
    `).bind(appointmentId).first() as Appointment | null

    if (!appointment) {
      return c.json({
        success: false,
        error: 'Rendez-vous non trouvé'
      }, 404)
    }

    // Vérification d'autorisation
    if (user.role === 'client' && appointment.client_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    if (user.role === 'coach' && appointment.coach_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    // Soft delete - marquer comme cancelled
    await c.env.DB.prepare(`
      UPDATE appointments 
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).bind(appointmentId).run()

    return c.json({
      success: true,
      message: 'Rendez-vous annulé avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de l\'annulation du rendez-vous:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de l\'annulation du rendez-vous'
    }, 500)
  }
})

// GET /api/appointments/available-slots - Obtenir les créneaux disponibles pour un coach
app.get('/available-slots', async (c) => {
  try {
    const coachId = c.req.query('coach_id')
    const date = c.req.query('date')
    const duration = parseInt(c.req.query('duration') || '60')

    if (!coachId || !date) {
      return c.json({
        success: false,
        error: 'Coach ID et date sont requis'
      }, 400)
    }

    // Vérifier que le coach existe
    const coach = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ? AND role = 'coach' AND status = 'active'
    `).bind(coachId).first()

    if (!coach) {
      return c.json({
        success: false,
        error: 'Coach non trouvé'
      }, 404)
    }

    // Récupérer les rendez-vous existants pour cette date
    const existingAppointments = await c.env.DB.prepare(`
      SELECT scheduled_at, duration_minutes
      FROM appointments
      WHERE coach_id = ?
      AND DATE(scheduled_at) = ?
      AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_at
    `).bind(coachId, date).all()

    // Générer les créneaux disponibles (exemple: 8h-18h par créneaux de 1h)
    const availableSlots: string[] = []
    const startHour = 8
    const endHour = 18
    const slotDuration = duration // en minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`)
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)

        // Vérifier s'il y a un conflit
        const hasConflict = (existingAppointments.results as any[]).some((apt) => {
          const aptStart = new Date(apt.scheduled_at)
          const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
          
          return (slotStart < aptEnd && slotEnd > aptStart)
        })

        if (!hasConflict) {
          availableSlots.push(slotStart.toISOString())
        }
      }
    }

    return c.json({
      success: true,
      data: {
        date,
        coach_id: parseInt(coachId),
        duration_minutes: duration,
        available_slots: availableSlots
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des créneaux:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des créneaux'
    }, 500)
  }
})

export default app