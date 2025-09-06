import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types/database'
import authRoutes from './routes/auth'
import programsRoutes from './routes/programs'
import workoutsRoutes from './routes/workouts'
import nutritionRoutes from './routes/nutrition'
import appointmentsRoutes from './routes/appointments'
import messagesRoutes from './routes/messages'
import usersRoutes from './routes/users'
import { authMiddleware } from './utils/auth'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'https://coachfit.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Routes d'authentification (pas de middleware auth requis)
app.route('/api/auth', authRoutes)

// Routes protégées avec authentification
app.route('/api/programs', programsRoutes)
app.route('/api/workouts', workoutsRoutes)
app.route('/api/nutrition', nutritionRoutes)
app.route('/api/appointments', appointmentsRoutes)
app.route('/api/messages', messagesRoutes)
app.route('/api/users', usersRoutes)

// Nouvelle interface moderne
app.get('/v2', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CoachFit V2 - Plateforme de Coaching Fitness</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <!-- Application content will be dynamically rendered here -->
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// API Routes avec base de données
app.get('/api/stats', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    
    // Statistiques globales pour admin/coach
    if (user.role === 'admin' || user.role === 'coach') {
      const [clients, programs, workouts, appointments] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "client" AND status = "active"').first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM programs WHERE status = "active"').first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM workouts WHERE status = "completed"').first(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM appointments WHERE status IN ("confirmed", "scheduled")').first()
      ])
      
      return c.json({
        success: true,
        data: {
          clients: clients?.count || 0,
          programs: programs?.count || 0,
          completedWorkouts: workouts?.count || 0,
          appointments: appointments?.count || 0
        }
      })
    }
    
    // Statistiques personnelles pour client
    const [workouts, appointments, meals] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM workouts WHERE client_id = ? AND status = "completed" AND DATE(scheduled_date) >= DATE("now", "-7 days")').bind(user.userId).first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM appointments WHERE client_id = ? AND scheduled_date >= DATE("now")').bind(user.userId).first(),
      c.env.DB.prepare('SELECT COALESCE(SUM(calories), 0) as total FROM meals WHERE client_id = ? AND date = DATE("now")').bind(user.userId).first()
    ])
    
    return c.json({
      success: true,
      data: {
        workouts: workouts?.count || 0,
        calories: meals?.total || 0,
        appointments: appointments?.count || 0,
        goals: 8 // À implémenter avec les objectifs
      }
    })
    
  } catch (error) {
    console.error('Erreur stats:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// API Users
app.get('/api/users', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    
    // Seuls les admins et coaches peuvent voir la liste des utilisateurs
    if (user.role === 'client') {
      return c.json({ success: false, message: 'Accès refusé' }, 403)
    }
    
    let query = 'SELECT id, email, name, role, phone, bio, status, created_at FROM users WHERE status = "active"'
    
    // Les coaches ne voient que leurs clients
    if (user.role === 'coach') {
      const users = await c.env.DB.prepare(
        query + ' AND (role = "client" AND coach_id = ? OR id = ?)'
      ).bind(user.userId, user.userId).all()
      return c.json({ success: true, data: users.results })
    }
    
    // Les admins voient tout
    const users = await c.env.DB.prepare(query).all()
    return c.json({ success: true, data: users.results })
    
  } catch (error) {
    console.error('Erreur users:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// API Programs
app.get('/api/programs', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    let query = `
      SELECT p.*, u.name as coach_name, c.name as client_name
      FROM programs p
      LEFT JOIN users u ON p.coach_id = u.id
      LEFT JOIN users c ON p.client_id = c.id
      WHERE 1=1
    `
    
    if (user.role === 'client') {
      query += ' AND p.client_id = ?'
      const programs = await c.env.DB.prepare(query).bind(user.userId).all()
      return c.json({ success: true, data: programs.results })
    } else if (user.role === 'coach') {
      query += ' AND p.coach_id = ?'
      const programs = await c.env.DB.prepare(query).bind(user.userId).all()
      return c.json({ success: true, data: programs.results })
    }
    
    // Admin voit tout
    const programs = await c.env.DB.prepare(query).all()
    return c.json({ success: true, data: programs.results })
    
  } catch (error) {
    console.error('Erreur programs:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// API Workouts
app.get('/api/workouts', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role === 'client') {
      const workouts = await c.env.DB.prepare(`
        SELECT w.*, p.name as program_name 
        FROM workouts w
        LEFT JOIN programs p ON w.program_id = p.id
        WHERE w.client_id = ?
        ORDER BY w.scheduled_date DESC
      `).bind(user.userId).all()
      
      return c.json({ success: true, data: workouts.results })
    } else if (user.role === 'coach') {
      const workouts = await c.env.DB.prepare(`
        SELECT w.*, p.name as program_name, u.name as client_name
        FROM workouts w
        LEFT JOIN programs p ON w.program_id = p.id
        LEFT JOIN users u ON w.client_id = u.id
        WHERE u.coach_id = ? OR w.program_id IN (SELECT id FROM programs WHERE coach_id = ?)
        ORDER BY w.scheduled_date DESC
      `).bind(user.userId, user.userId).all()
      
      return c.json({ success: true, data: workouts.results })
    }
    
    // Admin
    const workouts = await c.env.DB.prepare(`
      SELECT w.*, p.name as program_name, u.name as client_name
      FROM workouts w
      LEFT JOIN programs p ON w.program_id = p.id
      LEFT JOIN users u ON w.client_id = u.id
      ORDER BY w.scheduled_date DESC
    `).all()
    
    return c.json({ success: true, data: workouts.results })
    
  } catch (error) {
    console.error('Erreur workouts:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// API Meals
app.get('/api/meals', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    const date = c.req.query('date') || new Date().toISOString().split('T')[0]
    
    if (user.role === 'client') {
      const meals = await c.env.DB.prepare(
        'SELECT * FROM meals WHERE client_id = ? AND date = ? ORDER BY type'
      ).bind(user.userId, date).all()
      
      return c.json({ success: true, data: meals.results })
    } else if (user.role === 'coach') {
      // Coach peut voir les repas de ses clients
      const meals = await c.env.DB.prepare(`
        SELECT m.*, u.name as client_name
        FROM meals m
        JOIN users u ON m.client_id = u.id
        WHERE u.coach_id = ? AND m.date = ?
        ORDER BY u.name, m.type
      `).bind(user.userId, date).all()
      
      return c.json({ success: true, data: meals.results })
    }
    
    return c.json({ success: false, message: 'Accès refusé' }, 403)
    
  } catch (error) {
    console.error('Erreur meals:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// API Appointments
app.get('/api/appointments', authMiddleware(), async (c) => {
  try {
    const user = c.get('user')
    
    let query = `
      SELECT a.*, 
             coach.name as coach_name, 
             client.name as client_name
      FROM appointments a
      JOIN users coach ON a.coach_id = coach.id
      JOIN users client ON a.client_id = client.id
      WHERE 1=1
    `
    
    if (user.role === 'client') {
      query += ' AND a.client_id = ?'
      const appointments = await c.env.DB.prepare(query + ' ORDER BY a.scheduled_date DESC, a.start_time DESC').bind(user.userId).all()
      return c.json({ success: true, data: appointments.results })
    } else if (user.role === 'coach') {
      query += ' AND a.coach_id = ?'
      const appointments = await c.env.DB.prepare(query + ' ORDER BY a.scheduled_date DESC, a.start_time DESC').bind(user.userId).all()
      return c.json({ success: true, data: appointments.results })
    }
    
    // Admin
    const appointments = await c.env.DB.prepare(query + ' ORDER BY a.scheduled_date DESC, a.start_time DESC').all()
    return c.json({ success: true, data: appointments.results })
    
  } catch (error) {
    console.error('Erreur appointments:', error)
    return c.json({ success: false, message: 'Erreur serveur' }, 500)
  }
})

// Page principale avec authentification intégrée
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CoachFit - Plateforme de Coaching Fitness</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            primary: '#4f46e5',
                            secondary: '#06b6d4',
                            accent: '#10b981',
                            dark: '#1f2937'
                        }
                    }
                }
            }
        </script>
        <style>
            .glass-effect {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
        </style>
    </head>
    <body class="bg-gradient-to-br from-gray-900 to-gray-800 text-white min-h-screen" x-data="coachFitApp()">
        
        <!-- Écran de connexion -->
        <div x-show="!isAuthenticated" class="min-h-screen flex items-center justify-center px-4">
            <div class="glass-effect rounded-xl p-8 w-full max-w-md">
                <div class="text-center mb-8">
                    <i class="fas fa-dumbbell text-4xl text-primary mb-4"></i>
                    <h1 class="text-3xl font-bold">CoachFit</h1>
                    <p class="text-gray-400">Votre plateforme de coaching fitness</p>
                </div>
                
                <!-- Toggle Login/Register -->
                <div class="flex mb-6 bg-gray-800 rounded-lg p-1">
                    <button @click="authMode = 'login'" 
                            :class="authMode === 'login' ? 'bg-primary text-white' : 'text-gray-400'"
                            class="flex-1 py-2 rounded-md transition-all">
                        Connexion
                    </button>
                    <button @click="authMode = 'register'" 
                            :class="authMode === 'register' ? 'bg-primary text-white' : 'text-gray-400'"
                            class="flex-1 py-2 rounded-md transition-all">
                        Inscription
                    </button>
                </div>
                
                <!-- Formulaire de connexion -->
                <form x-show="authMode === 'login'" @submit.prevent="login()" class="space-y-4">
                    <div>
                        <input type="email" x-model="loginForm.email" placeholder="Email" required
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <input type="password" x-model="loginForm.password" placeholder="Mot de passe" required
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <button type="submit" :disabled="isLoading"
                            class="w-full bg-primary hover:bg-primary/80 py-3 rounded-lg font-bold transition-all disabled:opacity-50">
                        <span x-show="!isLoading">Se connecter</span>
                        <span x-show="isLoading">Connexion...</span>
                    </button>
                </form>
                
                <!-- Formulaire d'inscription -->
                <form x-show="authMode === 'register'" @submit.prevent="register()" class="space-y-4">
                    <div>
                        <input type="text" x-model="registerForm.name" placeholder="Nom complet" required
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <input type="email" x-model="registerForm.email" placeholder="Email" required
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <input type="password" x-model="registerForm.password" placeholder="Mot de passe (min 6 caractères)" required
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <input type="tel" x-model="registerForm.phone" placeholder="Téléphone (optionnel)"
                               class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <select x-model="registerForm.role" 
                                class="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="client">👤 Client</option>
                            <option value="coach">💪 Coach</option>
                        </select>
                    </div>
                    <button type="submit" :disabled="isLoading"
                            class="w-full bg-primary hover:bg-primary/80 py-3 rounded-lg font-bold transition-all disabled:opacity-50">
                        <span x-show="!isLoading">S'inscrire</span>
                        <span x-show="isLoading">Inscription...</span>
                    </button>
                </form>
                
                <!-- Messages d'erreur -->
                <div x-show="authError" x-text="authError" class="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm"></div>
                
                <!-- Comptes de démo -->
                <div class="mt-6 p-4 bg-gray-800/50 rounded-lg">
                    <h3 class="font-bold mb-2">🎯 Comptes de démo :</h3>
                    <div class="text-sm space-y-1">
                        <div><strong>Client :</strong> marie.client@example.com</div>
                        <div><strong>Coach :</strong> coach.thomas@coachfit.com</div>
                        <div><strong>Mot de passe :</strong> demo123</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Interface principale (visible après connexion) -->
        <div x-show="isAuthenticated" style="display: none;">
            
            <!-- Navigation -->
            <nav class="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
                <div class="max-w-7xl mx-auto px-4">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <i class="fas fa-dumbbell text-2xl text-primary mr-3"></i>
                            <span class="text-xl font-bold">CoachFit</span>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <!-- Info utilisateur -->
                            <div class="text-sm">
                                <span x-text="user.name"></span>
                                <span class="text-gray-400">(<span x-text="user.role"></span>)</span>
                            </div>
                            
                            <!-- Menu burger mobile -->
                            <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden">
                                <i class="fas fa-bars text-xl"></i>
                            </button>
                            
                            <!-- Déconnexion -->
                            <button @click="logout()" class="text-gray-400 hover:text-white">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Menu mobile -->
                    <div x-show="mobileMenuOpen" x-transition class="md:hidden pb-4">
                        <div class="flex flex-wrap gap-2">
                            <button v-for="module in visibleModules" @click="currentModule = module.key" 
                                    :class="currentModule === module.key ? 'bg-primary' : 'bg-gray-700'"
                                    class="px-3 py-1 rounded-lg text-sm">
                                <i :class="module.icon" class="mr-1"></i>
                                <span x-text="module.name"></span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Menu desktop -->
                    <div class="hidden md:block">
                        <div class="flex space-x-1 pb-4">
                            <template x-for="module in visibleModules" :key="module.key">
                                <button @click="currentModule = module.key" 
                                        :class="currentModule === module.key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
                                        class="px-4 py-2 rounded-lg transition-all">
                                    <i :class="module.icon" class="mr-2"></i>
                                    <span x-text="module.name"></span>
                                </button>
                            </template>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Contenu principal -->
            <main class="max-w-7xl mx-auto px-4 py-6">
                
                <!-- Dashboard Module -->
                <div x-show="currentModule === 'dashboard'" x-transition>
                    <div class="mb-6">
                        <h1 class="text-3xl font-bold mb-2">
                            <i class="fas fa-tachometer-alt text-primary mr-3"></i>
                            <span x-text="user.role === 'client' ? 'Mon Tableau de Bord' : 'Dashboard ' + user.role"></span>
                        </h1>
                        <p class="text-gray-400">Vue d'ensemble de vos activités</p>
                    </div>
                    
                    <!-- Stats Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <template x-for="(value, key) in stats" :key="key">
                            <div class="glass-effect rounded-xl p-6">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-400" x-text="getStatLabel(key)"></p>
                                        <p class="text-2xl font-bold" x-text="value"></p>
                                    </div>
                                    <i :class="getStatIcon(key)" class="text-3xl"></i>
                                </div>
                            </div>
                        </template>
                    </div>
                    
                    <!-- Messages d'info -->
                    <div class="glass-effect rounded-xl p-6 mb-6">
                        <h3 class="text-xl font-bold mb-4">
                            <i class="fas fa-info-circle mr-2"></i>
                            Informations
                        </h3>
                        <div x-show="user.role === 'client'">
                            <p class="text-gray-300">Bienvenue sur votre tableau de bord ! Consultez vos programmes d'entraînement, suivez votre nutrition et communiquez avec votre coach.</p>
                        </div>
                        <div x-show="user.role === 'coach'">
                            <p class="text-gray-300">Gérez vos clients, créez des programmes personnalisés et suivez leur progression.</p>
                        </div>
                        <div x-show="user.role === 'admin'">
                            <p class="text-gray-300">Administration complète de la plateforme CoachFit.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Autres modules (simplifié pour cette version) -->
                <div x-show="currentModule !== 'dashboard'" x-transition>
                    <div class="glass-effect rounded-xl p-8 text-center">
                        <i class="fas fa-tools text-4xl text-primary mb-4"></i>
                        <h2 class="text-2xl font-bold mb-4">Module en développement</h2>
                        <p class="text-gray-400">Cette section sera disponible dans les prochaines étapes du développement.</p>
                    </div>
                </div>
                
            </main>
        </div>

        <script>
            function coachFitApp() {
                return {
                    // État d'authentification
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    authMode: 'login',
                    isLoading: false,
                    authError: '',
                    
                    // Formulaires
                    loginForm: {
                        email: '',
                        password: ''
                    },
                    registerForm: {
                        name: '',
                        email: '',
                        password: '',
                        phone: '',
                        role: 'client'
                    },
                    
                    // État de l'app
                    currentModule: 'dashboard',
                    mobileMenuOpen: false,
                    stats: {},
                    
                    // Modules disponibles selon le rôle
                    get visibleModules() {
                        const clientModules = [
                            { key: 'dashboard', name: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                            { key: 'workouts', name: 'Entraînement', icon: 'fas fa-dumbbell' },
                            { key: 'nutrition', name: 'Nutrition', icon: 'fas fa-apple-alt' },
                            { key: 'progress', name: 'Progrès', icon: 'fas fa-chart-line' },
                            { key: 'messages', name: 'Messages', icon: 'fas fa-comments' },
                            { key: 'appointments', name: 'RDV', icon: 'fas fa-calendar' }
                        ]
                        
                        const coachModules = [
                            { key: 'dashboard', name: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                            { key: 'clients', name: 'Clients', icon: 'fas fa-users' },
                            { key: 'programs', name: 'Programmes', icon: 'fas fa-dumbbell' },
                            { key: 'nutrition', name: 'Nutrition', icon: 'fas fa-apple-alt' },
                            { key: 'analytics', name: 'Analytics', icon: 'fas fa-chart-line' },
                            { key: 'messages', name: 'Messages', icon: 'fas fa-comments' },
                            { key: 'calendar', name: 'Calendrier', icon: 'fas fa-calendar' }
                        ]
                        
                        const adminModules = [
                            { key: 'dashboard', name: 'Dashboard', icon: 'fas fa-tachometer-alt' },
                            { key: 'users', name: 'Utilisateurs', icon: 'fas fa-users' },
                            { key: 'programs', name: 'Programmes', icon: 'fas fa-dumbbell' },
                            { key: 'analytics', name: 'Analytics', icon: 'fas fa-chart-bar' },
                            { key: 'settings', name: 'Paramètres', icon: 'fas fa-cog' }
                        ]
                        
                        if (!this.user) return clientModules
                        
                        switch (this.user.role) {
                            case 'coach': return coachModules
                            case 'admin': return adminModules
                            default: return clientModules
                        }
                    },
                    
                    // Initialisation
                    async init() {
                        // Vérifier si un token existe déjà
                        this.token = localStorage.getItem('coachfit_token')
                        if (this.token) {
                            await this.checkAuth()
                        }
                    },
                    
                    // Connexion
                    async login() {
                        this.isLoading = true
                        this.authError = ''
                        
                        try {
                            const response = await axios.post('/api/auth/login', this.loginForm)
                            
                            if (response.data.success) {
                                this.token = response.data.token
                                this.user = response.data.user
                                this.isAuthenticated = true
                                
                                localStorage.setItem('coachfit_token', this.token)
                                axios.defaults.headers.common['Authorization'] = \`Bearer \${this.token}\`
                                
                                await this.loadStats()
                            }
                        } catch (error) {
                            this.authError = error.response?.data?.message || 'Erreur de connexion'
                        } finally {
                            this.isLoading = false
                        }
                    },
                    
                    // Inscription
                    async register() {
                        this.isLoading = true
                        this.authError = ''
                        
                        try {
                            const response = await axios.post('/api/auth/register', this.registerForm)
                            
                            if (response.data.success) {
                                this.token = response.data.token
                                this.user = response.data.user
                                this.isAuthenticated = true
                                
                                localStorage.setItem('coachfit_token', this.token)
                                axios.defaults.headers.common['Authorization'] = \`Bearer \${this.token}\`
                                
                                await this.loadStats()
                            }
                        } catch (error) {
                            this.authError = error.response?.data?.message || 'Erreur d\\'inscription'
                        } finally {
                            this.isLoading = false
                        }
                    },
                    
                    // Vérifier l'authentification
                    async checkAuth() {
                        try {
                            axios.defaults.headers.common['Authorization'] = \`Bearer \${this.token}\`
                            const response = await axios.get('/api/auth/me')
                            
                            if (response.data.success) {
                                this.user = response.data.user
                                this.isAuthenticated = true
                                await this.loadStats()
                            } else {
                                this.logout()
                            }
                        } catch (error) {
                            this.logout()
                        }
                    },
                    
                    // Déconnexion
                    async logout() {
                        try {
                            if (this.token) {
                                await axios.post('/api/auth/logout')
                            }
                        } catch (error) {
                            // Ignorer les erreurs de déconnexion
                        } finally {
                            this.token = null
                            this.user = null
                            this.isAuthenticated = false
                            this.stats = {}
                            localStorage.removeItem('coachfit_token')
                            delete axios.defaults.headers.common['Authorization']
                        }
                    },
                    
                    // Charger les statistiques
                    async loadStats() {
                        try {
                            const response = await axios.get('/api/stats')
                            if (response.data.success) {
                                this.stats = response.data.data
                            }
                        } catch (error) {
                            console.error('Erreur chargement stats:', error)
                        }
                    },
                    
                    // Helpers pour les statistiques
                    getStatLabel(key) {
                        const labels = {
                            clients: 'Clients actifs',
                            programs: 'Programmes',
                            workouts: 'Séances cette semaine',
                            completedWorkouts: 'Séances terminées',
                            appointments: 'Prochains RDV',
                            calories: 'Calories aujourd\\'hui',
                            goals: 'Objectifs atteints'
                        }
                        return labels[key] || key
                    },
                    
                    getStatIcon(key) {
                        const icons = {
                            clients: 'fas fa-users text-blue-500',
                            programs: 'fas fa-dumbbell text-primary',
                            workouts: 'fas fa-dumbbell text-primary',
                            completedWorkouts: 'fas fa-check-circle text-accent',
                            appointments: 'fas fa-calendar text-blue-500',
                            calories: 'fas fa-fire text-orange-500',
                            goals: 'fas fa-trophy text-yellow-500'
                        }
                        return icons[key] || 'fas fa-chart-bar text-gray-500'
                    }
                }
            }
        </script>
    </body>
    </html>
  `)
})

export default app