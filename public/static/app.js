// CoachFit - Frontend Application
class CoachFitApp {
    constructor() {
        this.user = null
        this.token = localStorage.getItem('coachfit_token')
        this.currentModule = 'dashboard'
        this.init()
    }

    async init() {
        if (this.token) {
            await this.verifyToken()
        }
        this.render()
        this.attachEventListeners()
    }

    async verifyToken() {
        try {
            const response = await this.apiCall('/api/auth/me', 'GET')
            if (response.success) {
                this.user = response.user
                return true
            }
        } catch (error) {
            console.error('Token verification failed:', error)
        }
        
        localStorage.removeItem('coachfit_token')
        this.token = null
        return false
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        }

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`
        }

        if (data) {
            options.body = JSON.stringify(data)
        }

        const response = await fetch(endpoint, options)
        return await response.json()
    }

    async login(email, password) {
        const response = await this.apiCall('/api/auth/login', 'POST', { email, password })
        
        if (response.success) {
            this.token = response.token
            this.user = response.user
            localStorage.setItem('coachfit_token', this.token)
            this.render()
            this.loadDashboard()
        }
        
        return response
    }

    async register(userData) {
        const response = await this.apiCall('/api/auth/register', 'POST', userData)
        
        if (response.success) {
            this.token = response.token
            this.user = response.user
            localStorage.setItem('coachfit_token', this.token)
            this.render()
            this.loadDashboard()
        }
        
        return response
    }

    logout() {
        this.token = null
        this.user = null
        localStorage.removeItem('coachfit_token')
        this.render()
    }

    render() {
        const app = document.getElementById('app')
        
        if (!this.user) {
            app.innerHTML = this.renderAuthForms()
        } else {
            app.innerHTML = this.renderMainApp()
            this.loadModule(this.currentModule)
        }
    }

    renderAuthForms() {
        return `
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <div class="mb-6">
                    <div class="flex border-b">
                        <button id="login-tab" class="py-2 px-4 border-b-2 border-blue-500 text-blue-500">
                            Connexion
                        </button>
                        <button id="register-tab" class="py-2 px-4 text-gray-500 hover:text-blue-500">
                            Inscription
                        </button>
                    </div>
                </div>

                <!-- Login Form -->
                <form id="login-form" class="space-y-4">
                    <h2 class="text-2xl font-bold text-center mb-6">Connexion</h2>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                        <input type="password" name="password" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <button type="submit" class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">
                        Se connecter
                    </button>
                </form>

                <!-- Register Form -->
                <form id="register-form" class="space-y-4 hidden">
                    <h2 class="text-2xl font-bold text-center mb-6">Inscription</h2>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                        <input type="text" name="name" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                        <input type="password" name="password" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                        <select name="role" required 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="client">Client</option>
                            <option value="coach">Coach</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
                        S'inscrire
                    </button>
                </form>

                <div id="auth-message" class="mt-4 text-center"></div>
            </div>
        `
    }

    renderMainApp() {
        const navItems = this.getNavItems()
        
        return `
            <div class="min-h-screen bg-gray-50">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center h-16">
                            <div class="flex items-center">
                                <i class="fas fa-dumbbell text-blue-500 text-2xl mr-3"></i>
                                <h1 class="text-xl font-bold text-gray-900">CoachFit</h1>
                            </div>
                            
                            <div class="flex items-center space-x-4">
                                <span class="text-sm text-gray-700">
                                    <i class="fas fa-user-circle mr-1"></i>
                                    ${this.user.name} (${this.user.role})
                                </span>
                                <button id="logout-btn" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-sign-out-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="flex">
                        <!-- Sidebar Navigation -->
                        <nav class="w-64 bg-white rounded-lg shadow-sm p-4 mr-8">
                            <ul class="space-y-2">
                                ${navItems.map(item => `
                                    <li>
                                        <button data-module="${item.module}" 
                                                class="nav-item w-full text-left px-3 py-2 rounded-md transition-colors
                                                       ${this.currentModule === item.module ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}">
                                            <i class="${item.icon} mr-2"></i>
                                            ${item.label}
                                        </button>
                                    </li>
                                `).join('')}
                            </ul>
                        </nav>

                        <!-- Main Content -->
                        <main class="flex-1">
                            <div id="module-content" class="bg-white rounded-lg shadow-sm p-6">
                                <!-- Dynamic content will be loaded here -->
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        `
    }

    getNavItems() {
        const commonItems = [
            { module: 'dashboard', label: 'Tableau de bord', icon: 'fas fa-tachometer-alt' },
        ]

        if (this.user.role === 'coach') {
            return [
                ...commonItems,
                { module: 'clients', label: 'Mes Clients', icon: 'fas fa-users' },
                { module: 'programs', label: 'Programmes', icon: 'fas fa-clipboard-list' },
                { module: 'workouts', label: 'Séances', icon: 'fas fa-dumbbell' },
                { module: 'appointments', label: 'Rendez-vous', icon: 'fas fa-calendar' },
                { module: 'messages', label: 'Messages', icon: 'fas fa-envelope' },
                { module: 'profile', label: 'Mon Profil', icon: 'fas fa-user-cog' }
            ]
        } else if (this.user.role === 'client') {
            return [
                ...commonItems,
                { module: 'my-programs', label: 'Mes Programmes', icon: 'fas fa-clipboard-list' },
                { module: 'my-workouts', label: 'Mes Séances', icon: 'fas fa-dumbbell' },
                { module: 'nutrition', label: 'Nutrition', icon: 'fas fa-apple-alt' },
                { module: 'appointments', label: 'Rendez-vous', icon: 'fas fa-calendar' },
                { module: 'messages', label: 'Messages', icon: 'fas fa-envelope' },
                { module: 'coaches', label: 'Coaches', icon: 'fas fa-user-tie' },
                { module: 'profile', label: 'Mon Profil', icon: 'fas fa-user-cog' }
            ]
        } else { // admin
            return [
                ...commonItems,
                { module: 'users', label: 'Utilisateurs', icon: 'fas fa-users-cog' },
                { module: 'all-programs', label: 'Tous les Programmes', icon: 'fas fa-clipboard-list' },
                { module: 'all-appointments', label: 'Tous les RDV', icon: 'fas fa-calendar' },
                { module: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' }
            ]
        }
    }

    attachEventListeners() {
        // Auth form listeners
        const loginTab = document.getElementById('login-tab')
        const registerTab = document.getElementById('register-tab')
        const loginForm = document.getElementById('login-form')
        const registerForm = document.getElementById('register-form')
        
        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('border-blue-500', 'text-blue-500')
                registerTab.classList.remove('border-blue-500', 'text-blue-500')
                loginForm.classList.remove('hidden')
                registerForm.classList.add('hidden')
            })
            
            registerTab.addEventListener('click', () => {
                registerTab.classList.add('border-blue-500', 'text-blue-500')
                loginTab.classList.remove('border-blue-500', 'text-blue-500')
                registerForm.classList.remove('hidden')
                loginForm.classList.add('hidden')
            })
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const response = await this.login(formData.get('email'), formData.get('password'))
                
                const messageDiv = document.getElementById('auth-message')
                if (response.success) {
                    messageDiv.innerHTML = '<div class="text-green-600">Connexion réussie!</div>'
                } else {
                    messageDiv.innerHTML = `<div class="text-red-600">${response.message || 'Erreur de connexion'}</div>`
                }
            })
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const userData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    role: formData.get('role')
                }
                
                const response = await this.register(userData)
                
                const messageDiv = document.getElementById('auth-message')
                if (response.success) {
                    messageDiv.innerHTML = '<div class="text-green-600">Inscription réussie!</div>'
                } else {
                    messageDiv.innerHTML = `<div class="text-red-600">${response.message || 'Erreur d\'inscription'}</div>`
                }
            })
        }

        // Main app listeners
        const logoutBtn = document.getElementById('logout-btn')
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout())
        }

        // Navigation listeners
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const module = e.target.closest('button').dataset.module
                this.loadModule(module)
            })
        })
    }

    async loadModule(module) {
        this.currentModule = module
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.module === module) {
                item.classList.add('bg-blue-100', 'text-blue-700')
                item.classList.remove('text-gray-700', 'hover:bg-gray-100')
            } else {
                item.classList.remove('bg-blue-100', 'text-blue-700')
                item.classList.add('text-gray-700', 'hover:bg-gray-100')
            }
        })

        // Load module content
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i></div>'

        try {
            switch (module) {
                case 'dashboard':
                    await this.loadDashboard()
                    break
                case 'clients':
                    await this.loadClientsModule()
                    break
                case 'programs':
                case 'my-programs':
                    await this.loadProgramsModule()
                    break
                case 'workouts':
                case 'my-workouts':
                    await this.loadWorkoutsModule()
                    break
                case 'nutrition':
                    await this.loadNutritionModule()
                    break
                case 'appointments':
                    await this.loadAppointmentsModule()
                    break
                case 'messages':
                    await this.loadMessagesModule()
                    break
                case 'coaches':
                    await this.loadCoachesModule()
                    break
                case 'profile':
                    await this.loadProfileModule()
                    break
                default:
                    content.innerHTML = '<div class="text-center py-8">Module en développement...</div>'
            }
        } catch (error) {
            console.error('Error loading module:', error)
            content.innerHTML = '<div class="text-center py-8 text-red-500">Erreur lors du chargement du module</div>'
        }
    }

    async loadDashboard() {
        const content = document.getElementById('module-content')
        
        // Get dashboard stats
        const statsResponse = await this.apiCall('/api/stats')
        const stats = statsResponse.success ? statsResponse.data : {}

        content.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Tableau de bord</h2>
                <p class="text-gray-600">Bienvenue, ${this.user.name}!</p>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                ${Object.entries(stats).map(([key, value]) => `
                    <div class="bg-gradient-to-r ${this.getStatGradient(key)} rounded-lg p-6 text-white">
                        <div class="flex items-center">
                            <i class="${this.getStatIcon(key)} text-2xl mr-4"></i>
                            <div>
                                <div class="text-2xl font-bold">${value}</div>
                                <div class="text-sm opacity-80">${this.getStatLabel(key)}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${this.getQuickActions().map(action => `
                    <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" 
                         data-action="${action.action}">
                        <div class="flex items-center mb-4">
                            <i class="${action.icon} text-2xl text-blue-500 mr-3"></i>
                            <h3 class="font-semibold text-gray-900">${action.title}</h3>
                        </div>
                        <p class="text-gray-600 text-sm mb-4">${action.description}</p>
                        <button class="text-blue-500 hover:text-blue-700 font-medium">
                            ${action.buttonText} →
                        </button>
                    </div>
                `).join('')}
            </div>
        `

        // Attach quick action listeners
        document.querySelectorAll('[data-action]').forEach(element => {
            element.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action
                this.loadModule(action)
            })
        })
    }

    getStatGradient(key) {
        const gradients = {
            clients: 'from-blue-500 to-blue-600',
            programs: 'from-green-500 to-green-600',
            workouts: 'from-purple-500 to-purple-600',
            completedWorkouts: 'from-purple-500 to-purple-600',
            appointments: 'from-orange-500 to-orange-600',
            calories: 'from-red-500 to-red-600',
            goals: 'from-yellow-500 to-yellow-600'
        }
        return gradients[key] || 'from-gray-500 to-gray-600'
    }

    getStatIcon(key) {
        const icons = {
            clients: 'fas fa-users',
            programs: 'fas fa-clipboard-list',
            workouts: 'fas fa-dumbbell',
            completedWorkouts: 'fas fa-check-circle',
            appointments: 'fas fa-calendar',
            calories: 'fas fa-fire',
            goals: 'fas fa-trophy'
        }
        return icons[key] || 'fas fa-chart-bar'
    }

    getStatLabel(key) {
        const labels = {
            clients: 'Clients actifs',
            programs: 'Programmes actifs',
            workouts: 'Séances terminées',
            completedWorkouts: 'Séances terminées',
            appointments: 'RDV à venir',
            calories: 'Calories aujourd\'hui',
            goals: 'Objectifs atteints'
        }
        return labels[key] || key
    }

    getQuickActions() {
        if (this.user.role === 'coach') {
            return [
                {
                    action: 'programs',
                    icon: 'fas fa-plus-circle',
                    title: 'Créer un Programme',
                    description: 'Créez un nouveau programme d\'entraînement personnalisé',
                    buttonText: 'Créer'
                },
                {
                    action: 'appointments',
                    icon: 'fas fa-calendar-plus',
                    title: 'Planifier un RDV',
                    description: 'Programmez un rendez-vous avec un client',
                    buttonText: 'Planifier'
                },
                {
                    action: 'messages',
                    icon: 'fas fa-envelope',
                    title: 'Messagerie',
                    description: 'Communiquez avec vos clients',
                    buttonText: 'Voir messages'
                }
            ]
        } else {
            return [
                {
                    action: 'my-workouts',
                    icon: 'fas fa-play-circle',
                    title: 'Commencer une Séance',
                    description: 'Démarrez votre prochaine séance d\'entraînement',
                    buttonText: 'Commencer'
                },
                {
                    action: 'nutrition',
                    icon: 'fas fa-apple-alt',
                    title: 'Suivi Nutrition',
                    description: 'Enregistrez vos repas et suivez vos macros',
                    buttonText: 'Ajouter repas'
                },
                {
                    action: 'coaches',
                    icon: 'fas fa-user-tie',
                    title: 'Trouver un Coach',
                    description: 'Trouvez le coach parfait pour vos objectifs',
                    buttonText: 'Voir coaches'
                }
            ]
        }
    }

    async loadCoachesModule() {
        const content = document.getElementById('module-content')
        const response = await this.apiCall('/api/users/coaches')
        
        if (!response.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des coaches</div>'
            return
        }

        const coaches = response.data

        content.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Coaches Disponibles</h2>
                <p class="text-gray-600">Trouvez le coach parfait pour vos objectifs</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${coaches.map(coach => `
                    <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                ${coach.name.charAt(0)}
                            </div>
                            <div class="ml-3">
                                <h3 class="font-semibold text-gray-900">${coach.name}</h3>
                                <p class="text-sm text-gray-600">${coach.email}</p>
                            </div>
                        </div>
                        
                        ${coach.bio ? `<p class="text-gray-600 text-sm mb-4">${coach.bio}</p>` : ''}
                        
                        <div class="flex justify-between items-center">
                            <div class="text-sm text-gray-500">
                                ${coach.phone ? `<i class="fas fa-phone mr-1"></i> ${coach.phone}` : ''}
                            </div>
                            <button class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm"
                                    onclick="app.contactCoach(${coach.id})">
                                Contacter
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `
    }

    async contactCoach(coachId) {
        // TODO: Open message modal or redirect to messages with pre-filled coach
        this.loadModule('messages')
        // Could add logic to pre-select the coach for messaging
    }

    // Placeholder methods for other modules
    async loadClientsModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Clients en développement...</div>'
    }

    async loadProgramsModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Programmes en développement...</div>'
    }

    async loadWorkoutsModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Séances en développement...</div>'
    }

    async loadNutritionModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Nutrition en développement...</div>'
    }

    async loadAppointmentsModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Rendez-vous en développement...</div>'
    }

    async loadMessagesModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Messages en développement...</div>'
    }

    async loadProfileModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Profil en développement...</div>'
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CoachFitApp()
})