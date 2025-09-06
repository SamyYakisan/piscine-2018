import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Mock data pour CoachFit
const mockData = {
  users: [
    { id: 1, name: 'Marie Client', email: 'marie@example.com', role: 'client', coachId: 1 },
    { id: 2, name: 'Coach Thomas', email: 'thomas@example.com', role: 'coach' },
    { id: 3, name: 'Julie Client', email: 'julie@example.com', role: 'client', coachId: 2 }
  ],
  programs: [
    { id: 1, name: 'Programme Perte de Poids', clientId: 1, coachId: 2, status: 'active' },
    { id: 2, name: 'Programme Musculation', clientId: 3, coachId: 2, status: 'active' }
  ],
  workouts: [
    { id: 1, date: '2024-01-15', exercises: '3 séries squat, 2 séries pompes', clientId: 1, completed: true },
    { id: 2, date: '2024-01-16', exercises: '20 min course, étirements', clientId: 1, completed: false }
  ],
  meals: [
    { id: 1, date: '2024-01-15', type: 'breakfast', food: 'Avoine + fruits', calories: 350, clientId: 1 },
    { id: 2, date: '2024-01-15', type: 'lunch', food: 'Salade de quinoa', calories: 450, clientId: 1 }
  ],
  appointments: [
    { id: 1, date: '2024-01-20', time: '10:00', clientId: 1, coachId: 2, status: 'confirmed' },
    { id: 2, date: '2024-01-22', time: '14:00', clientId: 3, coachId: 2, status: 'pending' }
  ]
}

// API Routes
app.get('/api/stats', (c) => {
  return c.json({
    clients: mockData.users.filter(u => u.role === 'client').length,
    coaches: mockData.users.filter(u => u.role === 'coach').length,
    programs: mockData.programs.length,
    appointments: mockData.appointments.length,
    completedWorkouts: mockData.workouts.filter(w => w.completed).length
  })
})

app.get('/api/users', (c) => c.json(mockData.users))
app.get('/api/programs', (c) => c.json(mockData.programs))
app.get('/api/workouts', (c) => c.json(mockData.workouts))
app.get('/api/meals', (c) => c.json(mockData.meals))
app.get('/api/appointments', (c) => c.json(mockData.appointments))

// Main application route
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
        
        <!-- Navigation Mobile-First -->
        <nav class="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <i class="fas fa-dumbbell text-2xl text-primary mr-3"></i>
                        <span class="text-xl font-bold">CoachFit</span>
                    </div>
                    
                    <!-- Role Selector -->
                    <div class="flex items-center space-x-4">
                        <select x-model="currentRole" @change="switchRole()" 
                                class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm">
                            <option value="client">👤 Client</option>
                            <option value="coach">💪 Coach</option>
                        </select>
                        
                        <!-- Mobile Menu Button -->
                        <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Mobile Menu -->
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
                
                <!-- Desktop Menu -->
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

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 py-6">
            
            <!-- Dashboard Module -->
            <div x-show="currentModule === 'dashboard'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-tachometer-alt text-primary mr-3"></i>
                        <span x-text="currentRole === 'client' ? 'Mon Tableau de Bord' : 'Dashboard Coach'"></span>
                    </h1>
                    <p class="text-gray-400">Vue d'ensemble de vos activités</p>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-400">Séances cette semaine</p>
                                <p class="text-2xl font-bold" x-text="stats.workouts || '12'"></p>
                            </div>
                            <i class="fas fa-dumbbell text-3xl text-primary"></i>
                        </div>
                    </div>
                    
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-400">Calories brûlées</p>
                                <p class="text-2xl font-bold" x-text="stats.calories || '2,450'"></p>
                            </div>
                            <i class="fas fa-fire text-3xl text-orange-500"></i>
                        </div>
                    </div>
                    
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-400" x-text="currentRole === 'client' ? 'Objectifs atteints' : 'Clients actifs'"></p>
                                <p class="text-2xl font-bold" x-text="stats.goals || '8'"></p>
                            </div>
                            <i class="fas fa-trophy text-3xl text-yellow-500"></i>
                        </div>
                    </div>
                    
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-400">Prochains RDV</p>
                                <p class="text-2xl font-bold" x-text="stats.appointments || '3'"></p>
                            </div>
                            <i class="fas fa-calendar text-3xl text-blue-500"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Progress Chart -->
                <div class="glass-effect rounded-xl p-6 mb-6">
                    <h3 class="text-xl font-bold mb-4">
                        <i class="fas fa-chart-line mr-2"></i>
                        Évolution de la performance
                    </h3>
                    <canvas id="progressChart" width="400" height="200"></canvas>
                </div>
            </div>
            
            <!-- Programme d'Entraînement Module -->
            <div x-show="currentModule === 'workouts'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-dumbbell text-primary mr-3"></i>
                        Programme d'Entraînement
                    </h1>
                    <p class="text-gray-400">Gérez vos séances et programmes</p>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-3 mb-6">
                    <button class="bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg transition-all">
                        <i class="fas fa-plus mr-2"></i>
                        <span x-text="currentRole === 'client' ? 'Nouvelle séance' : 'Créer programme'"></span>
                    </button>
                    <button class="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg transition-all">
                        <i class="fas fa-calendar mr-2"></i>
                        Planning hebdomadaire
                    </button>
                </div>
                
                <!-- Workout Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-3">Séance du jour</h3>
                        <p class="text-sm text-gray-400 mb-3">Lundi 15 Janvier</p>
                        <div class="space-y-2 mb-4">
                            <div class="flex justify-between">
                                <span>Squats</span>
                                <span class="text-primary">3 × 12</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Pompes</span>
                                <span class="text-primary">3 × 10</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Planches</span>
                                <span class="text-primary">3 × 30s</span>
                            </div>
                        </div>
                        <button class="w-full bg-accent hover:bg-accent/80 py-2 rounded-lg transition-all">
                            <i class="fas fa-play mr-2"></i>
                            Commencer
                        </button>
                    </div>
                    
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-3">Programme Cardio</h3>
                        <p class="text-sm text-gray-400 mb-3">Mardi 16 Janvier</p>
                        <div class="space-y-2 mb-4">
                            <div class="flex justify-between">
                                <span>Course</span>
                                <span class="text-primary">20 min</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Vélo</span>
                                <span class="text-primary">15 min</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Étirements</span>
                                <span class="text-primary">10 min</span>
                            </div>
                        </div>
                        <button class="w-full bg-gray-600 py-2 rounded-lg">
                            <i class="fas fa-clock mr-2"></i>
                            Programmé
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Nutrition Module -->
            <div x-show="currentModule === 'nutrition'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-apple-alt text-primary mr-3"></i>
                        Nutrition
                    </h1>
                    <p class="text-gray-400">Suivez votre alimentation et vos objectifs nutritionnels</p>
                </div>
                
                <!-- Daily Summary -->
                <div class="glass-effect rounded-xl p-6 mb-6">
                    <h3 class="text-xl font-bold mb-4">Résumé du jour</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <p class="text-2xl font-bold text-primary">1,850</p>
                            <p class="text-sm text-gray-400">Calories consommées</p>
                        </div>
                        <div class="text-center">
                            <p class="text-2xl font-bold text-accent">120g</p>
                            <p class="text-sm text-gray-400">Protéines</p>
                        </div>
                        <div class="text-center">
                            <p class="text-2xl font-bold text-yellow-500">45g</p>
                            <p class="text-sm text-gray-400">Lipides</p>
                        </div>
                        <div class="text-center">
                            <p class="text-2xl font-bold text-blue-500">180g</p>
                            <p class="text-sm text-gray-400">Glucides</p>
                        </div>
                    </div>
                </div>
                
                <!-- Meal Tracking -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Repas d'aujourd'hui</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                                <div>
                                    <p class="font-medium">Petit-déjeuner</p>
                                    <p class="text-sm text-gray-400">Avoine + fruits</p>
                                </div>
                                <span class="text-primary font-bold">350 kcal</span>
                            </div>
                            <div class="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                                <div>
                                    <p class="font-medium">Déjeuner</p>
                                    <p class="text-sm text-gray-400">Salade quinoa</p>
                                </div>
                                <span class="text-primary font-bold">450 kcal</span>
                            </div>
                        </div>
                        <button class="w-full mt-4 bg-primary hover:bg-primary/80 py-2 rounded-lg transition-all">
                            <i class="fas fa-plus mr-2"></i>
                            Ajouter un repas
                        </button>
                    </div>
                    
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Objectifs nutritionnels</h3>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between mb-1">
                                    <span>Calories</span>
                                    <span>1,850 / 2,200</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-primary h-2 rounded-full" style="width: 84%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between mb-1">
                                    <span>Protéines</span>
                                    <span>120g / 140g</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-accent h-2 rounded-full" style="width: 86%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between mb-1">
                                    <span>Hydratation</span>
                                    <span>1.5L / 2.5L</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: 60%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Suivi de Progrès Module -->
            <div x-show="currentModule === 'progress'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-chart-line text-primary mr-3"></i>
                        Suivi de Progrès
                    </h1>
                    <p class="text-gray-400">Analysez vos performances et évolution</p>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Metrics -->
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Mesures corporelles</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center">
                                <span>Poids</span>
                                <div class="text-right">
                                    <p class="font-bold">68.5 kg</p>
                                    <p class="text-sm text-accent">-0.8 kg</p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>IMC</span>
                                <div class="text-right">
                                    <p class="font-bold">22.1</p>
                                    <p class="text-sm text-accent">Normal</p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>Masse grasse</span>
                                <div class="text-right">
                                    <p class="font-bold">18%</p>
                                    <p class="text-sm text-accent">-2%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Performance -->
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Records personnels</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between items-center">
                                <span>Développé couché</span>
                                <div class="text-right">
                                    <p class="font-bold">75 kg</p>
                                    <p class="text-sm text-accent">+5 kg</p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>Squat</span>
                                <div class="text-right">
                                    <p class="font-bold">90 kg</p>
                                    <p class="text-sm text-accent">+10 kg</p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>Course 5km</span>
                                <div class="text-right">
                                    <p class="font-bold">24:30</p>
                                    <p class="text-sm text-accent">-1:15</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Messages Module -->
            <div x-show="currentModule === 'messages'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-comments text-primary mr-3"></i>
                        Messages
                    </h1>
                    <p class="text-gray-400">Communiquez avec votre coach/clients</p>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Conversations List -->
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Conversations</h3>
                        <div class="space-y-3">
                            <div class="flex items-center p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                                <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">Coach Thomas</p>
                                    <p class="text-sm text-gray-400">Comment va l'entraînement ?</p>
                                </div>
                                <span class="text-xs text-gray-500">10:30</span>
                            </div>
                            <div class="flex items-center p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                                <div class="w-10 h-10 bg-accent rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">Support CoachFit</p>
                                    <p class="text-sm text-gray-400">Besoin d'aide ?</p>
                                </div>
                                <span class="text-xs text-gray-500">Hier</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Chat Area -->
                    <div class="lg:col-span-2 glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Chat avec Coach Thomas</h3>
                        <div class="h-64 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
                            <div class="space-y-3">
                                <div class="flex">
                                    <div class="bg-primary text-white p-3 rounded-lg rounded-bl-none max-w-xs">
                                        Salut ! Comment s'est passée ta séance d'hier ?
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <div class="bg-gray-700 text-white p-3 rounded-lg rounded-br-none max-w-xs">
                                        Super bien ! J'ai réussi à faire tous les exercices 💪
                                    </div>
                                </div>
                                <div class="flex">
                                    <div class="bg-primary text-white p-3 rounded-lg rounded-bl-none max-w-xs">
                                        Parfait ! On peut augmenter l'intensité la semaine prochaine
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <input type="text" placeholder="Tapez votre message..." 
                                   class="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                            <button class="bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg transition-all">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Rendez-vous Module -->
            <div x-show="currentModule === 'appointments'" x-transition>
                <div class="mb-6">
                    <h1 class="text-3xl font-bold mb-2">
                        <i class="fas fa-calendar text-primary mr-3"></i>
                        Rendez-vous
                    </h1>
                    <p class="text-gray-400">Gérez vos rendez-vous et disponibilités</p>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Calendar -->
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Calendrier</h3>
                        <div class="space-y-2">
                            <div class="grid grid-cols-7 gap-1 text-center text-sm">
                                <div class="p-2 font-bold">L</div>
                                <div class="p-2 font-bold">M</div>
                                <div class="p-2 font-bold">M</div>
                                <div class="p-2 font-bold">J</div>
                                <div class="p-2 font-bold">V</div>
                                <div class="p-2 font-bold">S</div>
                                <div class="p-2 font-bold">D</div>
                            </div>
                            <div class="grid grid-cols-7 gap-1 text-center text-sm">
                                <div class="p-2 text-gray-500">1</div>
                                <div class="p-2 text-gray-500">2</div>
                                <div class="p-2">3</div>
                                <div class="p-2">4</div>
                                <div class="p-2">5</div>
                                <div class="p-2">6</div>
                                <div class="p-2">7</div>
                                <div class="p-2">8</div>
                                <div class="p-2">9</div>
                                <div class="p-2">10</div>
                                <div class="p-2">11</div>
                                <div class="p-2">12</div>
                                <div class="p-2">13</div>
                                <div class="p-2">14</div>
                                <div class="p-2 bg-primary text-white rounded">15</div>
                                <div class="p-2">16</div>
                                <div class="p-2">17</div>
                                <div class="p-2">18</div>
                                <div class="p-2">19</div>
                                <div class="p-2 bg-accent text-white rounded">20</div>
                                <div class="p-2">21</div>
                                <div class="p-2 bg-secondary text-white rounded">22</div>
                                <div class="p-2">23</div>
                                <div class="p-2">24</div>
                                <div class="p-2">25</div>
                                <div class="p-2">26</div>
                                <div class="p-2">27</div>
                                <div class="p-2">28</div>
                                <div class="p-2">29</div>
                                <div class="p-2">30</div>
                                <div class="p-2">31</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Upcoming Appointments -->
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="font-bold text-lg mb-4">Prochains rendez-vous</h3>
                        <div class="space-y-3">
                            <div class="flex items-center p-4 bg-gray-800 rounded-lg">
                                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-4">
                                    <i class="fas fa-calendar text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">Séance avec Coach Thomas</p>
                                    <p class="text-sm text-gray-400">20 Jan 2024 - 10:00</p>
                                    <p class="text-sm text-accent">Confirmé</p>
                                </div>
                                <button class="text-red-400 hover:text-red-300">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <div class="flex items-center p-4 bg-gray-800 rounded-lg">
                                <div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mr-4">
                                    <i class="fas fa-clock text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">Bilan nutritionnel</p>
                                    <p class="text-sm text-gray-400">22 Jan 2024 - 14:00</p>
                                    <p class="text-sm text-yellow-500">En attente</p>
                                </div>
                                <button class="text-accent hover:text-accent/80">
                                    <i class="fas fa-check"></i>
                                </button>
                            </div>
                        </div>
                        
                        <button class="w-full mt-4 bg-primary hover:bg-primary/80 py-2 rounded-lg transition-all">
                            <i class="fas fa-plus mr-2"></i>
                            Nouveau rendez-vous
                        </button>
                    </div>
                </div>
            </div>
            
        </main>

        <script>
            function coachFitApp() {
                return {
                    currentRole: 'client',
                    currentModule: 'dashboard',
                    mobileMenuOpen: false,
                    stats: {
                        workouts: 12,
                        calories: '2,450',
                        goals: 8,
                        appointments: 3
                    },
                    
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
                            { key: 'workouts', name: 'Programmes', icon: 'fas fa-dumbbell' },
                            { key: 'nutrition', name: 'Nutrition', icon: 'fas fa-apple-alt' },
                            { key: 'progress', name: 'Analytics', icon: 'fas fa-chart-line' },
                            { key: 'messages', name: 'Messages', icon: 'fas fa-comments' },
                            { key: 'appointments', name: 'Calendrier', icon: 'fas fa-calendar' }
                        ]
                        
                        return this.currentRole === 'client' ? clientModules : coachModules
                    },
                    
                    switchRole() {
                        this.currentModule = 'dashboard'
                        this.mobileMenuOpen = false
                        this.loadStats()
                    },
                    
                    async loadStats() {
                        try {
                            const response = await fetch('/api/stats')
                            const data = await response.json()
                            this.stats = data
                        } catch (error) {
                            console.error('Erreur de chargement des stats:', error)
                        }
                    },
                    
                    init() {
                        this.loadStats()
                        this.initChart()
                    },
                    
                    initChart() {
                        this.$nextTick(() => {
                            const ctx = document.getElementById('progressChart')
                            if (ctx) {
                                new Chart(ctx, {
                                    type: 'line',
                                    data: {
                                        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                                        datasets: [{
                                            label: 'Performance',
                                            data: [65, 72, 68, 85],
                                            borderColor: '#4f46e5',
                                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                            tension: 0.4
                                        }]
                                    },
                                    options: {
                                        responsive: true,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: { beginAtZero: true }
                                        }
                                    }
                                })
                            }
                        })
                    }
                }
            }
        </script>
    </body>
    </html>
  `)
})

export default app