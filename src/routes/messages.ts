import { Hono } from 'hono'
import type { Bindings, Message, MessageCreateRequest } from '../types/database'
import { authMiddleware } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware d'authentification pour toutes les routes
app.use('*', authMiddleware())

// GET /api/messages - Récupérer les messages selon le rôle
app.get('/', async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT 
        m.*,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.role as sender_role,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.role as recipient_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
    `
    let params: any[] = []

    // Filtrage selon le rôle - voir seulement ses messages
    if (user.role === 'client' || user.role === 'coach') {
      query += ' WHERE (m.sender_id = ? OR m.recipient_id = ?)'
      params.push(user.id, user.id)
    }
    // Admin voit tous les messages

    // Paramètres de pagination
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Filtres optionnels
    const conversationWith = c.req.query('conversation_with')
    const unreadOnly = c.req.query('unread_only') === 'true'
    const messageType = c.req.query('type')

    if (conversationWith) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))`
      if (user.role !== 'admin') {
        // S'assurer que l'utilisateur fait partie de la conversation
        params.push(user.id, conversationWith, conversationWith, user.id)
      } else {
        params.push(conversationWith, user.id, user.id, conversationWith)
      }
    }

    if (unreadOnly) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} m.read_at IS NULL`
      if (user.role !== 'admin') {
        query += ' AND m.recipient_id = ?'
        params.push(user.id)
      }
    }

    if (messageType) {
      const connector = params.length > 0 ? 'AND' : 'WHERE'
      query += ` ${connector} m.type = ?`
      params.push(messageType)
    }

    // Comptage total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM')
    const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first() as { total: number } | null
    const total = totalResult?.total || 0

    // Requête avec pagination et tri
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await c.env.DB.prepare(query).bind(...params).all()
    const messages = result.results as Message[]

    return c.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des messages'
    }, 500)
  }
})

// GET /api/messages/conversations - Récupérer la liste des conversations
app.get('/conversations', async (c) => {
  try {
    const user = c.get('user')
    
    let query = `
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.recipient_id 
          ELSE m.sender_id 
        END as conversation_with_id,
        CASE 
          WHEN m.sender_id = ? THEN recipient.name 
          ELSE sender.name 
        END as conversation_with_name,
        CASE 
          WHEN m.sender_id = ? THEN recipient.role 
          ELSE sender.role 
        END as conversation_with_role,
        MAX(m.created_at) as last_message_at,
        COUNT(CASE WHEN m.recipient_id = ? AND m.read_at IS NULL THEN 1 END) as unread_count,
        (SELECT content FROM messages m2 
         JOIN users s ON m2.sender_id = s.id 
         WHERE (m2.sender_id = ? AND m2.recipient_id = conversation_with_id) 
            OR (m2.sender_id = conversation_with_id AND m2.recipient_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message_content
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.sender_id = ? OR m.recipient_id = ?
      GROUP BY conversation_with_id
      ORDER BY last_message_at DESC
    `

    const params = [user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id]
    
    // Pour admin, récupérer toutes les conversations
    if (user.role === 'admin') {
      query = `
        SELECT 
          DISTINCT
          CASE 
            WHEN sender_id < recipient_id THEN sender_id 
            ELSE recipient_id 
          END as user1_id,
          CASE 
            WHEN sender_id < recipient_id THEN recipient_id 
            ELSE sender_id 
          END as user2_id,
          u1.name as user1_name,
          u1.role as user1_role,
          u2.name as user2_name,
          u2.role as user2_role,
          MAX(m.created_at) as last_message_at,
          COUNT(CASE WHEN m.read_at IS NULL THEN 1 END) as total_unread
        FROM messages m
        JOIN users u1 ON (CASE WHEN sender_id < recipient_id THEN sender_id ELSE recipient_id END) = u1.id
        JOIN users u2 ON (CASE WHEN sender_id < recipient_id THEN recipient_id ELSE sender_id END) = u2.id
        GROUP BY user1_id, user2_id
        ORDER BY last_message_at DESC
      `
      params.length = 0
    }

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      data: result.results
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération des conversations'
    }, 500)
  }
})

// GET /api/messages/:id - Récupérer un message spécifique
app.get('/:id', async (c) => {
  try {
    const messageId = c.req.param('id')
    const user = c.get('user')

    const query = `
      SELECT 
        m.*,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.role as sender_role,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.role as recipient_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.id = ?
    `

    const message = await c.env.DB.prepare(query).bind(messageId).first() as Message | null

    if (!message) {
      return c.json({
        success: false,
        error: 'Message non trouvé'
      }, 404)
    }

    // Vérification d'autorisation - seuls l'expéditeur, le destinataire ou admin peuvent voir
    if (user.role !== 'admin' && 
        message.sender_id !== user.id && 
        message.recipient_id !== user.id) {
      return c.json({
        success: false,
        error: 'Accès non autorisé'
      }, 403)
    }

    // Marquer comme lu si c'est le destinataire
    if (message.recipient_id === user.id && !message.read_at) {
      await c.env.DB.prepare(`
        UPDATE messages 
        SET read_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(messageId).run()
      
      message.read_at = new Date().toISOString()
    }

    return c.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du message:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la récupération du message'
    }, 500)
  }
})

// POST /api/messages - Créer un nouveau message
app.post('/', async (c) => {
  try {
    const user = c.get('user')
    const messageData = await c.req.json() as MessageCreateRequest

    // Validation des données
    if (!messageData.recipient_id || !messageData.content?.trim()) {
      return c.json({
        success: false,
        error: 'Destinataire et contenu sont obligatoires'
      }, 400)
    }

    // Vérifier que le destinataire existe
    const recipient = await c.env.DB.prepare(`
      SELECT id, role FROM users 
      WHERE id = ? AND status = 'active'
    `).bind(messageData.recipient_id).first()

    if (!recipient) {
      return c.json({
        success: false,
        error: 'Destinataire non trouvé ou inactif'
      }, 400)
    }

    // Vérifier les permissions de communication
    if (user.role === 'client') {
      // Les clients ne peuvent envoyer qu'à leurs coaches
      const coachRelation = await c.env.DB.prepare(`
        SELECT 1 FROM programs p
        WHERE p.coach_id = ? AND p.client_id = ?
        AND p.status = 'active'
        UNION
        SELECT 1 FROM appointments a
        WHERE a.coach_id = ? AND a.client_id = ?
        AND a.status IN ('scheduled', 'confirmed', 'completed')
      `).bind(
        messageData.recipient_id, user.id,
        messageData.recipient_id, user.id
      ).first()

      if (!coachRelation && recipient.role === 'coach') {
        return c.json({
          success: false,
          error: 'Vous ne pouvez envoyer des messages qu\'à vos coaches'
        }, 403)
      }
    } else if (user.role === 'coach') {
      // Les coaches peuvent envoyer à leurs clients ou autres coaches/admins
      if (recipient.role === 'client') {
        const clientRelation = await c.env.DB.prepare(`
          SELECT 1 FROM programs p
          WHERE p.coach_id = ? AND p.client_id = ?
          AND p.status = 'active'
          UNION
          SELECT 1 FROM appointments a
          WHERE a.coach_id = ? AND a.client_id = ?
          AND a.status IN ('scheduled', 'confirmed', 'completed')
        `).bind(
          user.id, messageData.recipient_id,
          user.id, messageData.recipient_id
        ).first()

        if (!clientRelation) {
          return c.json({
            success: false,
            error: 'Vous ne pouvez envoyer des messages qu\'à vos clients'
          }, 403)
        }
      }
    }
    // Admin peut envoyer à tout le monde

    // Ne pas s'envoyer un message à soi-même
    if (user.id === messageData.recipient_id) {
      return c.json({
        success: false,
        error: 'Impossible de s\'envoyer un message à soi-même'
      }, 400)
    }

    // Créer le message
    const result = await c.env.DB.prepare(`
      INSERT INTO messages (
        sender_id, recipient_id, content, type, 
        parent_message_id, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      user.id,
      messageData.recipient_id,
      messageData.content.trim(),
      messageData.type || 'text',
      messageData.parent_message_id || null
    ).run()

    // Récupérer le message créé avec les infos utilisateur
    const createdMessage = await c.env.DB.prepare(`
      SELECT 
        m.*,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.role as sender_role,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.role as recipient_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.id = ?
    `).bind(result.meta.last_row_id).first()

    // Créer une notification pour le destinataire
    await c.env.DB.prepare(`
      INSERT INTO notifications (
        user_id, title, message, type, 
        reference_id, reference_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      messageData.recipient_id,
      `Nouveau message de ${user.name}`,
      messageData.content.length > 100 ? 
        messageData.content.substring(0, 100) + '...' : 
        messageData.content,
      'message',
      result.meta.last_row_id,
      'message'
    ).run()

    return c.json({
      success: true,
      data: createdMessage,
      message: 'Message envoyé avec succès'
    }, 201)
  } catch (error) {
    console.error('Erreur lors de la création du message:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de l\'envoi du message'
    }, 500)
  }
})

// PUT /api/messages/:id/read - Marquer un message comme lu
app.put('/:id/read', async (c) => {
  try {
    const messageId = c.req.param('id')
    const user = c.get('user')

    // Vérifier que le message existe et que l'utilisateur est le destinataire
    const message = await c.env.DB.prepare(`
      SELECT * FROM messages WHERE id = ? AND recipient_id = ?
    `).bind(messageId, user.id).first() as Message | null

    if (!message) {
      return c.json({
        success: false,
        error: 'Message non trouvé ou accès non autorisé'
      }, 404)
    }

    if (message.read_at) {
      return c.json({
        success: true,
        message: 'Message déjà marqué comme lu'
      })
    }

    // Marquer comme lu
    await c.env.DB.prepare(`
      UPDATE messages 
      SET read_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(messageId).run()

    return c.json({
      success: true,
      message: 'Message marqué comme lu'
    })
  } catch (error) {
    console.error('Erreur lors du marquage du message:', error)
    return c.json({
      success: false,
      error: 'Erreur lors du marquage du message'
    }, 500)
  }
})

// PUT /api/messages/conversation/:userId/read - Marquer tous les messages d'une conversation comme lus
app.put('/conversation/:userId/read', async (c) => {
  try {
    const otherUserId = c.req.param('userId')
    const user = c.get('user')

    // Marquer tous les messages non lus de cette conversation comme lus
    const result = await c.env.DB.prepare(`
      UPDATE messages 
      SET read_at = datetime('now'), updated_at = datetime('now')
      WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL
    `).bind(otherUserId, user.id).run()

    return c.json({
      success: true,
      message: `${result.changes} message(s) marqué(s) comme lu(s)`
    })
  } catch (error) {
    console.error('Erreur lors du marquage de la conversation:', error)
    return c.json({
      success: false,
      error: 'Erreur lors du marquage de la conversation'
    }, 500)
  }
})

// DELETE /api/messages/:id - Supprimer un message (soft delete)
app.delete('/:id', async (c) => {
  try {
    const messageId = c.req.param('id')
    const user = c.get('user')

    // Récupérer le message
    const message = await c.env.DB.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).bind(messageId).first() as Message | null

    if (!message) {
      return c.json({
        success: false,
        error: 'Message non trouvé'
      }, 404)
    }

    // Seul l'expéditeur peut supprimer son message (ou admin)
    if (user.role !== 'admin' && message.sender_id !== user.id) {
      return c.json({
        success: false,
        error: 'Seul l\'expéditeur peut supprimer ce message'
      }, 403)
    }

    // Soft delete - marquer comme supprimé
    await c.env.DB.prepare(`
      UPDATE messages 
      SET content = '[Message supprimé]', updated_at = datetime('now')
      WHERE id = ?
    `).bind(messageId).run()

    return c.json({
      success: true,
      message: 'Message supprimé avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error)
    return c.json({
      success: false,
      error: 'Erreur lors de la suppression du message'
    }, 500)
  }
})

// GET /api/messages/unread/count - Compter les messages non lus
app.get('/unread/count', async (c) => {
  try {
    const user = c.get('user')

    const result = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM messages 
      WHERE recipient_id = ? AND read_at IS NULL
    `).bind(user.id).first() as { count: number } | null

    return c.json({
      success: true,
      data: {
        unread_count: result?.count || 0
      }
    })
  } catch (error) {
    console.error('Erreur lors du comptage des messages:', error)
    return c.json({
      success: false,
      error: 'Erreur lors du comptage des messages'
    }, 500)
  }
})

export default app