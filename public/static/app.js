// CoachFit - Frontend Application
class CoachFitApp {
    constructor() {
        this.user = null
        this.token = localStorage.getItem('coachfit_token')
        this.currentModule = 'dashboard'
        this.notifications = []
        this.unreadCount = 0
        this.notificationInterval = null
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
            this.startNotificationPolling()
        }
        
        return response
    }

    logout() {
        this.stopNotificationPolling()
        this.token = null
        this.user = null
        this.notifications = []
        this.unreadCount = 0
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
                                <!-- Notifications Bell -->
                                <div class="relative">
                                    <button id="notifications-btn" class="relative text-gray-600 hover:text-gray-800 p-2">
                                        <i class="fas fa-bell text-lg"></i>
                                        <span id="notifications-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
                                    </button>
                                    
                                    <!-- Notifications Dropdown -->
                                    <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                                        <div class="p-4 border-b">
                                            <div class="flex items-center justify-between">
                                                <h3 class="text-lg font-semibold text-gray-900">Notifications</h3>
                                                <button id="mark-all-read" class="text-sm text-blue-600 hover:text-blue-800">
                                                    Marquer tout lu
                                                </button>
                                            </div>
                                        </div>
                                        <div id="notifications-list" class="max-h-64 overflow-y-auto">
                                            <!-- Notifications will be loaded here -->
                                        </div>
                                        <div class="p-3 border-t text-center">
                                            <button class="text-sm text-blue-600 hover:text-blue-800">
                                                Voir toutes les notifications
                                            </button>
                                        </div>
                                    </div>
                                </div>

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

        // Notifications listeners
        this.attachNotificationListeners()
        
        // Start real-time notifications if user is logged in
        if (this.user) {
            this.startNotificationPolling()
        }
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
                case 'analytics':
                    await this.loadAnalyticsModule()
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

    // Programs module helper methods
    getProgramStatusClass(status) {
        const classes = {
            'draft': 'bg-gray-100 text-gray-800',
            'active': 'bg-green-100 text-green-800',
            'completed': 'bg-blue-100 text-blue-800',
            'paused': 'bg-yellow-100 text-yellow-800'
        }
        return classes[status] || 'bg-gray-100 text-gray-800'
    }

    getProgramStatusLabel(status) {
        const labels = {
            'draft': 'Brouillon',
            'active': 'Actif',
            'completed': 'Terminé',
            'paused': 'En pause'
        }
        return labels[status] || 'Brouillon'
    }

    async loadClientsForSelect() {
        try {
            const response = await this.apiCall('/api/users/clients')
            if (response.success) {
                const select = document.getElementById('client-select')
                if (select) {
                    response.data.forEach(client => {
                        const option = document.createElement('option')
                        option.value = client.id
                        option.textContent = client.name
                        select.appendChild(option)
                    })
                }
            }
        } catch (error) {
            console.error('Error loading clients:', error)
        }
    }

    showCreateProgramModal() {
        document.getElementById('create-program-modal').classList.remove('hidden')
        document.body.style.overflow = 'hidden'
    }

    hideCreateProgramModal() {
        document.getElementById('create-program-modal').classList.add('hidden')
        document.body.style.overflow = 'auto'
        document.getElementById('create-program-form').reset()
    }

    attachProgramsEventListeners() {
        const form = document.getElementById('create-program-form')
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.createProgram(e.target)
            })
        }
    }

    async createProgram(form) {
        const formData = new FormData(form)
        const programData = {
            name: formData.get('name'),
            description: formData.get('description'),
            type: formData.get('type'),
            difficulty: formData.get('difficulty'),
            duration_weeks: parseInt(formData.get('duration_weeks')) || null,
            sessions_per_week: parseInt(formData.get('sessions_per_week')) || null,
            client_id: formData.get('client_id') || null
        }

        try {
            const response = await this.apiCall('/api/programs', 'POST', programData)
            
            if (response.success) {
                this.hideCreateProgramModal()
                this.loadModule('programs') // Reload programs
                this.showNotification('Programme créé avec succès!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de la création', 'error')
            }
        } catch (error) {
            console.error('Error creating program:', error)
            this.showNotification('Erreur lors de la création du programme', 'error')
        }
    }

    async viewProgram(programId) {
        try {
            const response = await this.apiCall(`/api/programs/${programId}`)
            if (response.success) {
                this.showProgramDetails(response.data)
            }
        } catch (error) {
            console.error('Error loading program details:', error)
        }
    }

    async editProgram(programId) {
        // TODO: Implement edit program modal
        this.showNotification('Fonction de modification en développement', 'info')
    }

    async startWorkout(programId) {
        // TODO: Redirect to workouts with this program
        this.loadModule('my-workouts')
        this.showNotification('Redirection vers les séances...', 'info')
    }

    async viewClientProfile(clientId) {
        // TODO: Show client profile modal
        this.showNotification('Fonction de profil client en développement', 'info')
    }

    async createProgramForClient(clientId) {
        this.showCreateProgramModal()
        // Pre-select the client
        setTimeout(() => {
            const select = document.getElementById('client-select')
            if (select) {
                select.value = clientId
            }
        }, 100)
    }

    showProgramDetails(program) {
        // TODO: Implement detailed program view
        alert(`Programme: ${program.name}\nType: ${program.type}\nStatut: ${program.status}`)
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div')
        notification.className = `fixed top-4 right-4 p-4 rounded-md z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`
        notification.textContent = message

        document.body.appendChild(notification)

        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    // Workouts module helper methods
    getWorkoutStatusClass(status) {
        const classes = {
            'scheduled': 'bg-blue-100 text-blue-800',
            'in_progress': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        }
        return classes[status] || 'bg-gray-100 text-gray-800'
    }

    getWorkoutStatusLabel(status) {
        const labels = {
            'scheduled': 'Prévue',
            'in_progress': 'En cours',
            'completed': 'Terminée',
            'cancelled': 'Annulée'
        }
        return labels[status] || 'Brouillon'
    }

    filterWorkouts(status) {
        // Update tab visual state
        document.querySelectorAll('.workout-filter-tab').forEach(tab => {
            tab.classList.remove('border-blue-500', 'text-blue-600')
            tab.classList.add('border-transparent', 'text-gray-500')
        })
        
        const activeTab = document.querySelector(`[data-filter="${status}"]`)
        if (activeTab) {
            activeTab.classList.remove('border-transparent', 'text-gray-500')
            activeTab.classList.add('border-blue-500', 'text-blue-600')
        }

        // Filter workouts
        document.querySelectorAll('.workout-item').forEach(item => {
            if (status === 'all' || item.dataset.status === status) {
                item.style.display = 'block'
            } else {
                item.style.display = 'none'
            }
        })
    }

    showCreateWorkoutModal() {
        document.getElementById('create-workout-modal').classList.remove('hidden')
        document.body.style.overflow = 'hidden'
    }

    hideCreateWorkoutModal() {
        document.getElementById('create-workout-modal').classList.add('hidden')
        document.body.style.overflow = 'auto'
        document.getElementById('create-workout-form').reset()
    }

    async loadProgramsForWorkoutSelect() {
        try {
            const response = await this.apiCall('/api/programs')
            if (response.success) {
                const select = document.getElementById('workout-program-select')
                if (select) {
                    response.data.forEach(program => {
                        const option = document.createElement('option')
                        option.value = program.id
                        option.textContent = program.name
                        select.appendChild(option)
                    })
                }
            }
        } catch (error) {
            console.error('Error loading programs for workout:', error)
        }
    }

    async loadClientsForWorkoutSelect() {
        try {
            const response = await this.apiCall('/api/users/clients')
            if (response.success) {
                const select = document.getElementById('workout-client-select')
                if (select) {
                    response.data.forEach(client => {
                        const option = document.createElement('option')
                        option.value = client.id
                        option.textContent = client.name
                        select.appendChild(option)
                    })
                }
            }
        } catch (error) {
            console.error('Error loading clients for workout:', error)
        }
    }

    attachWorkoutsEventListeners() {
        const form = document.getElementById('create-workout-form')
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.createWorkout(e.target)
            })
        }
    }

    async createWorkout(form) {
        const formData = new FormData(form)
        const workoutData = {
            name: formData.get('name'),
            duration_minutes: parseInt(formData.get('duration_minutes')) || null,
            program_id: formData.get('program_id') || null,
            client_id: formData.get('client_id') || null,
            scheduled_date: formData.get('scheduled_date') || null,
            notes: formData.get('notes') || null
        }

        try {
            const response = await this.apiCall('/api/workouts', 'POST', workoutData)
            
            if (response.success) {
                this.hideCreateWorkoutModal()
                this.loadModule('workouts') // Reload workouts
                this.showNotification('Séance créée avec succès!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de la création', 'error')
            }
        } catch (error) {
            console.error('Error creating workout:', error)
            this.showNotification('Erreur lors de la création de la séance', 'error')
        }
    }

    async viewWorkoutDetails(workoutId) {
        try {
            const response = await this.apiCall(`/api/workouts/${workoutId}`)
            if (response.success) {
                this.showWorkoutDetailsModal(response.data)
            }
        } catch (error) {
            console.error('Error loading workout details:', error)
        }
    }

    showWorkoutDetailsModal(workout) {
        // Create modal for workout details
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">${workout.name}</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); document.body.style.overflow = 'auto'" 
                            class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <strong>Statut:</strong> ${this.getWorkoutStatusLabel(workout.status)}
                        </div>
                        <div>
                            <strong>Durée:</strong> ${workout.duration_minutes || 'N/A'} min
                        </div>
                        <div>
                            <strong>Date:</strong> ${workout.scheduled_date ? new Date(workout.scheduled_date).toLocaleDateString('fr-FR') : 'Non planifiée'}
                        </div>
                        <div>
                            <strong>Volume total:</strong> ${workout.total_volume || 0} kg
                        </div>
                    </div>
                    
                    ${workout.notes ? `
                        <div>
                            <strong>Notes:</strong>
                            <p class="mt-1 text-gray-600">${workout.notes}</p>
                        </div>
                    ` : ''}
                    
                    ${workout.exercises && workout.exercises.length > 0 ? `
                        <div>
                            <strong>Exercices:</strong>
                            <div class="mt-2 space-y-2">
                                ${workout.exercises.map(ex => `
                                    <div class="border rounded p-3">
                                        <div class="font-medium">${ex.exercise_name}</div>
                                        <div class="text-sm text-gray-600">
                                            ${ex.sets} séries × ${ex.reps} reps
                                            ${ex.weight ? ` @ ${ex.weight} kg` : ''}
                                            ${ex.rest_seconds ? ` (repos: ${ex.rest_seconds}s)` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<div class="text-gray-600">Aucun exercice défini</div>'}
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
        document.body.style.overflow = 'hidden'
    }

    async startWorkoutSession(workoutId) {
        try {
            const response = await this.apiCall(`/api/workouts/${workoutId}`, 'PUT', {
                status: 'in_progress',
                started_at: new Date().toISOString()
            })
            
            if (response.success) {
                this.showNotification('Séance démarrée!', 'success')
                this.loadModule('workouts') // Refresh
            }
        } catch (error) {
            console.error('Error starting workout:', error)
            this.showNotification('Erreur lors du démarrage', 'error')
        }
    }

    async continueWorkoutSession(workoutId) {
        // TODO: Open workout session interface
        this.showNotification('Interface de séance en développement', 'info')
    }

    async editWorkout(workoutId) {
        // TODO: Open edit workout modal
        this.showNotification('Fonction de modification en développement', 'info')
    }

    // Nutrition module helper methods
    calculateNutritionStats(meals) {
        return meals.reduce((stats, meal) => ({
            calories: stats.calories + (parseFloat(meal.calories) || 0),
            protein: stats.protein + (parseFloat(meal.protein) || 0),
            carbs: stats.carbs + (parseFloat(meal.carbs) || 0),
            fat: stats.fat + (parseFloat(meal.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
    }

    calculateRingProgress(current, target) {
        const percentage = Math.min((current / target) * 100, 100)
        const circumference = 2 * Math.PI * 36 // radius = 36
        return (percentage / 100) * circumference
    }

    getMealTypeLabel(type) {
        const labels = {
            'breakfast': 'Petit-déj',
            'lunch': 'Déjeuner',
            'dinner': 'Dîner',
            'snack': 'Collation'
        }
        return labels[type] || type
    }

    showAddMealModal() {
        document.getElementById('add-meal-modal').classList.remove('hidden')
        document.body.style.overflow = 'hidden'
        
        // Set current time and suggest meal type
        const now = new Date()
        const hour = now.getHours()
        let mealType = 'snack'
        
        if (hour >= 6 && hour < 11) mealType = 'breakfast'
        else if (hour >= 11 && hour < 15) mealType = 'lunch'
        else if (hour >= 17 && hour < 22) mealType = 'dinner'
        
        const mealTypeSelect = document.querySelector('#add-meal-form select[name="meal_type"]')
        if (mealTypeSelect) {
            mealTypeSelect.value = mealType
        }
    }

    hideAddMealModal() {
        document.getElementById('add-meal-modal').classList.add('hidden')
        document.body.style.overflow = 'auto'
        document.getElementById('add-meal-form').reset()
    }

    attachNutritionEventListeners() {
        const form = document.getElementById('add-meal-form')
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.addMeal(e.target)
            })
        }
    }

    async addMeal(form) {
        const formData = new FormData(form)
        const mealData = {
            meal_name: formData.get('meal_name'),
            meal_type: formData.get('meal_type'),
            calories: parseFloat(formData.get('calories')),
            protein: parseFloat(formData.get('protein')),
            carbs: parseFloat(formData.get('carbs')),
            fat: parseFloat(formData.get('fat')),
            logged_at: new Date().toISOString()
        }

        try {
            const response = await this.apiCall('/api/nutrition/meals', 'POST', mealData)
            
            if (response.success) {
                this.hideAddMealModal()
                this.loadModule('nutrition') // Reload nutrition
                this.showNotification('Repas ajouté avec succès!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de l\'ajout', 'error')
            }
        } catch (error) {
            console.error('Error adding meal:', error)
            this.showNotification('Erreur lors de l\'ajout du repas', 'error')
        }
    }

    async editMeal(mealId) {
        // TODO: Open edit meal modal
        this.showNotification('Fonction de modification en développement', 'info')
    }

    async deleteMeal(mealId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce repas ?')) {
            try {
                const response = await this.apiCall(`/api/nutrition/meals/${mealId}`, 'DELETE')
                
                if (response.success) {
                    this.loadModule('nutrition') // Reload nutrition
                    this.showNotification('Repas supprimé avec succès!', 'success')
                } else {
                    this.showNotification(response.message || 'Erreur lors de la suppression', 'error')
                }
            } catch (error) {
                console.error('Error deleting meal:', error)
                this.showNotification('Erreur lors de la suppression', 'error')
            }
        }
    }

    async showNutritionGoalsModal() {
        // TODO: Open nutrition goals modal
        this.showNotification('Fonction d\'objectifs nutritionnels en développement', 'info')
    }

    async showNutritionHistory() {
        // TODO: Open nutrition history modal with charts
        this.showNotification('Fonction d\'historique nutritionnel en développement', 'info')
    }

    // Messages module helper methods
    currentConversationId = null
    currentConversationName = null

    async loadMessageRecipients() {
        try {
            const endpoint = this.user.role === 'coach' ? '/api/users/clients' : '/api/users/coaches'
            const response = await this.apiCall(endpoint)
            
            if (response.success) {
                const select = document.getElementById('new-message-recipient')
                if (select) {
                    select.innerHTML = '<option value="">Sélectionner...</option>'
                    response.data.forEach(user => {
                        const option = document.createElement('option')
                        option.value = user.id
                        option.textContent = user.name
                        select.appendChild(option)
                    })
                }
            }
        } catch (error) {
            console.error('Error loading message recipients:', error)
        }
    }

    showNewMessageModal() {
        document.getElementById('new-message-modal').classList.remove('hidden')
        document.body.style.overflow = 'hidden'
    }

    hideNewMessageModal() {
        document.getElementById('new-message-modal').classList.add('hidden')
        document.body.style.overflow = 'auto'
        document.getElementById('new-message-form').reset()
    }

    attachMessagesEventListeners() {
        // Send message form
        const sendForm = document.getElementById('send-message-form')
        if (sendForm) {
            sendForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.sendQuickMessage()
            })
        }

        // New message form
        const newMessageForm = document.getElementById('new-message-form')
        if (newMessageForm) {
            newMessageForm.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.sendNewMessage(e.target)
            })
        }
    }

    async selectConversation(userId, userName) {
        this.currentConversationId = userId
        this.currentConversationName = userName

        // Update UI
        document.getElementById('messages-header').classList.remove('hidden')
        document.getElementById('message-input-area').classList.remove('hidden')
        document.getElementById('chat-participant-name').textContent = userName
        document.getElementById('chat-participant-initial').textContent = userName.charAt(0)
        document.getElementById('recipient-id').value = userId

        // Update conversation selection visual state
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500')
        })
        
        const selectedConv = document.querySelector(`[data-conversation-id="${userId}"]`)
        if (selectedConv) {
            selectedConv.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500')
        }

        // Load conversation messages
        await this.loadConversationMessages(userId)

        // Mark messages as read
        this.markConversationAsRead(userId)
    }

    async loadConversationMessages(userId) {
        try {
            const response = await this.apiCall(`/api/messages?conversation_with=${userId}&limit=100`)
            
            if (response.success) {
                const messagesContent = document.getElementById('messages-content')
                const messages = response.data || []

                if (messages.length === 0) {
                    messagesContent.innerHTML = `
                        <div class="h-full flex items-center justify-center text-gray-500">
                            <div class="text-center">
                                <i class="fas fa-comment text-3xl mb-4"></i>
                                <p>Aucun message dans cette conversation</p>
                                <p class="text-sm mt-2">Commencez à discuter ci-dessous!</p>
                            </div>
                        </div>
                    `
                } else {
                    messagesContent.innerHTML = `
                        <div class="space-y-4">
                            ${messages.reverse().map(message => `
                                <div class="flex ${message.sender_id === this.user.id ? 'justify-end' : 'justify-start'}">
                                    <div class="chat-bubble ${message.sender_id === this.user.id ? 'sent' : 'received'} max-w-xs lg:max-w-md">
                                        <div class="text-sm">${message.content}</div>
                                        <div class="text-xs opacity-75 mt-1">
                                            ${new Date(message.created_at).toLocaleTimeString('fr-FR', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `
                    
                    // Scroll to bottom
                    messagesContent.scrollTop = messagesContent.scrollHeight
                }
            }
        } catch (error) {
            console.error('Error loading conversation messages:', error)
        }
    }

    async sendQuickMessage() {
        const messageInput = document.getElementById('message-input')
        const recipientId = document.getElementById('recipient-id').value
        const content = messageInput.value.trim()

        if (!content || !recipientId) return

        try {
            const response = await this.apiCall('/api/messages', 'POST', {
                recipient_id: parseInt(recipientId),
                content: content
            })

            if (response.success) {
                messageInput.value = ''
                // Reload conversation messages
                await this.loadConversationMessages(this.currentConversationId)
                this.showNotification('Message envoyé!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de l\'envoi', 'error')
            }
        } catch (error) {
            console.error('Error sending message:', error)
            this.showNotification('Erreur lors de l\'envoi du message', 'error')
        }
    }

    async sendNewMessage(form) {
        const formData = new FormData(form)
        const messageData = {
            recipient_id: parseInt(formData.get('recipient_id')),
            content: formData.get('content')
        }

        try {
            const response = await this.apiCall('/api/messages', 'POST', messageData)
            
            if (response.success) {
                this.hideNewMessageModal()
                this.loadModule('messages') // Reload messages
                this.showNotification('Message envoyé avec succès!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de l\'envoi', 'error')
            }
        } catch (error) {
            console.error('Error sending new message:', error)
            this.showNotification('Erreur lors de l\'envoi du message', 'error')
        }
    }

    async markConversationAsRead(userId) {
        try {
            await this.apiCall(`/api/messages/conversation/${userId}/read`, 'PUT')
        } catch (error) {
            console.error('Error marking conversation as read:', error)
        }
    }

    // Appointments module helper methods
    currentCalendarDate = new Date()
    appointmentsByDate = {}

    getAppointmentTypeLabel(type) {
        const labels = {
            'consultation': 'Consultation',
            'training': 'Entraînement',
            'nutrition': 'Nutrition',
            'assessment': 'Évaluation'
        }
        return labels[type] || type
    }

    getAppointmentStatusClass(status) {
        const classes = {
            'scheduled': 'bg-blue-100 text-blue-800',
            'confirmed': 'bg-green-100 text-green-800',
            'completed': 'bg-gray-100 text-gray-800',
            'cancelled': 'bg-red-100 text-red-800',
            'no_show': 'bg-yellow-100 text-yellow-800'
        }
        return classes[status] || 'bg-gray-100 text-gray-800'
    }

    getAppointmentStatusLabel(status) {
        const labels = {
            'scheduled': 'Programmé',
            'confirmed': 'Confirmé',
            'completed': 'Terminé',
            'cancelled': 'Annulé',
            'no_show': 'Absence'
        }
        return labels[status] || status
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid')
        const monthYearSpan = document.getElementById('current-month-year')
        
        if (!calendarGrid || !monthYearSpan) return

        const year = this.currentCalendarDate.getFullYear()
        const month = this.currentCalendarDate.getMonth()
        
        monthYearSpan.textContent = this.currentCalendarDate.toLocaleDateString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        })

        // Clear calendar
        calendarGrid.innerHTML = ''

        // Add day headers
        const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div')
            dayElement.className = 'text-center font-medium text-gray-700 py-2'
            dayElement.textContent = day
            calendarGrid.appendChild(dayElement)
        })

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div')
            emptyDay.className = 'calendar-day text-center py-2 text-gray-400'
            calendarGrid.appendChild(emptyDay)
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div')
            const currentDate = new Date(year, month, day)
            const dateString = currentDate.toISOString().split('T')[0]
            
            let dayClasses = 'calendar-day text-center py-2 cursor-pointer hover:bg-gray-100'
            
            // Check if it's today
            const today = new Date()
            if (currentDate.toDateString() === today.toDateString()) {
                dayClasses += ' today'
            }
            
            // Check if there are appointments
            if (this.appointmentsByDate[dateString]) {
                dayClasses += ' has-appointment'
                dayElement.title = `${this.appointmentsByDate[dateString].length} rendez-vous`
            }

            dayElement.className = dayClasses
            dayElement.textContent = day
            dayElement.addEventListener('click', () => {
                // TODO: Show appointments for this day
                this.showDayAppointments(dateString)
            })
            
            calendarGrid.appendChild(dayElement)
        }
    }

    previousMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1)
        this.renderCalendar()
    }

    nextMonth() {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1)
        this.renderCalendar()
    }

    showDayAppointments(dateString) {
        const appointments = this.appointmentsByDate[dateString] || []
        if (appointments.length === 0) {
            this.showNotification('Aucun rendez-vous ce jour-là', 'info')
            return
        }

        // TODO: Show appointments in a modal or scroll to appointments list
        this.showNotification(`${appointments.length} rendez-vous ce jour-là`, 'info')
    }

    filterAppointments(status) {
        // Update tab visual state
        document.querySelectorAll('.appointment-filter-tab').forEach(tab => {
            tab.classList.remove('bg-blue-500', 'text-white')
            tab.classList.add('text-gray-600', 'hover:bg-gray-100')
        })
        
        const activeTab = document.querySelector(`[data-filter="${status}"]`)
        if (activeTab) {
            activeTab.classList.remove('text-gray-600', 'hover:bg-gray-100')
            activeTab.classList.add('bg-blue-500', 'text-white')
        }

        // Filter appointments
        document.querySelectorAll('.appointment-item').forEach(item => {
            if (status === 'all' || item.dataset.status === status) {
                item.style.display = 'block'
            } else {
                item.style.display = 'none'
            }
        })
    }

    showCreateAppointmentModal() {
        document.getElementById('create-appointment-modal').classList.remove('hidden')
        document.body.style.overflow = 'hidden'
    }

    hideCreateAppointmentModal() {
        document.getElementById('create-appointment-modal').classList.add('hidden')
        document.body.style.overflow = 'auto'
        document.getElementById('create-appointment-form').reset()
    }

    async loadAppointmentParticipants() {
        try {
            if (this.user.role === 'client') {
                // Load coaches for clients
                const response = await this.apiCall('/api/users/coaches')
                if (response.success) {
                    const select = document.getElementById('appointment-coach-select')
                    if (select) {
                        response.data.forEach(coach => {
                            const option = document.createElement('option')
                            option.value = coach.id
                            option.textContent = coach.name
                            select.appendChild(option)
                        })
                    }
                }
            } else {
                // Load clients for coaches
                const response = await this.apiCall('/api/users/clients')
                if (response.success) {
                    const select = document.getElementById('appointment-client-select')
                    if (select) {
                        response.data.forEach(client => {
                            const option = document.createElement('option')
                            option.value = client.id
                            option.textContent = client.name
                            select.appendChild(option)
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Error loading appointment participants:', error)
        }
    }

    attachAppointmentsEventListeners() {
        const form = document.getElementById('create-appointment-form')
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault()
                await this.createAppointment(e.target)
            })
        }
    }

    async createAppointment(form) {
        const formData = new FormData(form)
        const scheduledDate = formData.get('scheduled_date')
        const scheduledTime = formData.get('scheduled_time')
        
        const appointmentData = {
            scheduled_at: `${scheduledDate}T${scheduledTime}:00`,
            duration_minutes: parseInt(formData.get('duration_minutes')),
            type: formData.get('type'),
            notes: formData.get('notes') || null
        }

        if (this.user.role === 'client') {
            appointmentData.coach_id = parseInt(formData.get('coach_id'))
        } else {
            const clientId = formData.get('client_id')
            if (clientId) {
                appointmentData.client_id = parseInt(clientId)
            }
        }

        try {
            const response = await this.apiCall('/api/appointments', 'POST', appointmentData)
            
            if (response.success) {
                this.hideCreateAppointmentModal()
                this.loadModule('appointments') // Reload appointments
                this.showNotification('Rendez-vous créé avec succès!', 'success')
            } else {
                this.showNotification(response.message || 'Erreur lors de la création', 'error')
            }
        } catch (error) {
            console.error('Error creating appointment:', error)
            this.showNotification('Erreur lors de la création du rendez-vous', 'error')
        }
    }

    async confirmAppointment(appointmentId) {
        try {
            const response = await this.apiCall(`/api/appointments/${appointmentId}`, 'PUT', {
                status: 'confirmed'
            })
            
            if (response.success) {
                this.loadModule('appointments') // Reload
                this.showNotification('Rendez-vous confirmé!', 'success')
            }
        } catch (error) {
            console.error('Error confirming appointment:', error)
            this.showNotification('Erreur lors de la confirmation', 'error')
        }
    }

    async completeAppointment(appointmentId) {
        try {
            const response = await this.apiCall(`/api/appointments/${appointmentId}`, 'PUT', {
                status: 'completed'
            })
            
            if (response.success) {
                this.loadModule('appointments') // Reload
                this.showNotification('Rendez-vous marqué comme terminé!', 'success')
            }
        } catch (error) {
            console.error('Error completing appointment:', error)
            this.showNotification('Erreur lors de la finalisation', 'error')
        }
    }

    async cancelAppointment(appointmentId) {
        if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
            try {
                const response = await this.apiCall(`/api/appointments/${appointmentId}`, 'PUT', {
                    status: 'cancelled'
                })
                
                if (response.success) {
                    this.loadModule('appointments') // Reload
                    this.showNotification('Rendez-vous annulé', 'success')
                }
            } catch (error) {
                console.error('Error cancelling appointment:', error)
                this.showNotification('Erreur lors de l\'annulation', 'error')
            }
        }
    }

    async viewAppointmentDetails(appointmentId) {
        try {
            const response = await this.apiCall(`/api/appointments/${appointmentId}`)
            if (response.success) {
                // TODO: Show appointment details modal
                alert(`Rendez-vous: ${response.data.type}\nDate: ${new Date(response.data.scheduled_at).toLocaleString('fr-FR')}`)
            }
        } catch (error) {
            console.error('Error loading appointment details:', error)
        }
    }

    // Complete modules implementation
    async loadClientsModule() {
        const content = document.getElementById('module-content')
        const response = await this.apiCall('/api/users/clients')
        
        if (!response.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des clients</div>'
            return
        }

        const clients = response.data

        content.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Mes Clients</h2>
                <p class="text-gray-600">Gérez vos clients et leur progression</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${clients.map(client => `
                    <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                ${client.name.charAt(0)}
                            </div>
                            <div class="ml-3">
                                <h3 class="font-semibold text-gray-900">${client.name}</h3>
                                <p class="text-sm text-gray-600">${client.email}</p>
                            </div>
                        </div>
                        
                        <div class="space-y-2 mb-4">
                            ${client.phone ? `<p class="text-sm text-gray-600"><i class="fas fa-phone mr-2"></i>${client.phone}</p>` : ''}
                            ${client.goals ? `<p class="text-sm text-gray-600"><i class="fas fa-target mr-2"></i>${client.goals}</p>` : ''}
                        </div>
                        
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-500">
                                Depuis ${new Date(client.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            <div class="flex space-x-2">
                                <button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                        onclick="app.viewClientProfile(${client.id})">
                                    Profil
                                </button>
                                <button class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                        onclick="app.createProgramForClient(${client.id})">
                                    Programme
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${clients.length === 0 ? `
                <div class="text-center py-12">
                    <i class="fas fa-users text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun client pour le moment</h3>
                    <p class="text-gray-600">Vos clients apparaîtront ici une fois qu'ils auront des programmes assignés.</p>
                </div>
            ` : ''}
        `
    }

    async loadProgramsModule() {
        const content = document.getElementById('module-content')
        const response = await this.apiCall('/api/programs')
        
        if (!response.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des programmes</div>'
            return
        }

        const programs = response.data

        content.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">
                        ${this.user.role === 'coach' ? 'Mes Programmes' : 'Mes Programmes d\'Entraînement'}
                    </h2>
                    <p class="text-gray-600">
                        ${this.user.role === 'coach' ? 'Créez et gérez vos programmes d\'entraînement' : 'Consultez vos programmes assignés par votre coach'}
                    </p>
                </div>
                ${this.user.role === 'coach' ? `
                    <button onclick="app.showCreateProgramModal()" 
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center">
                        <i class="fas fa-plus mr-2"></i>
                        Nouveau Programme
                    </button>
                ` : ''}
            </div>

            <!-- Programs Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                ${programs.map(program => `
                    <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="font-semibold text-gray-900 mb-1">${program.name}</h3>
                                <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${this.getProgramStatusClass(program.status)}">
                                    ${this.getProgramStatusLabel(program.status)}
                                </span>
                            </div>
                            <div class="flex items-center text-sm text-gray-500">
                                <i class="fas fa-calendar mr-1"></i>
                                ${program.duration_weeks || 'N/A'}w
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <p class="text-sm text-gray-600 line-clamp-3">
                                ${program.description || 'Aucune description disponible'}
                            </p>
                        </div>
                        
                        <div class="space-y-2 mb-4 text-sm text-gray-600">
                            <div class="flex justify-between">
                                <span>Type:</span>
                                <span class="font-medium capitalize">${program.type || 'Mixed'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Séances/semaine:</span>
                                <span class="font-medium">${program.sessions_per_week || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Niveau:</span>
                                <span class="font-medium capitalize">${program.difficulty || 'Intermédiaire'}</span>
                            </div>
                            ${this.user.role === 'coach' && program.client_name ? `
                                <div class="flex justify-between">
                                    <span>Client:</span>
                                    <span class="font-medium">${program.client_name}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="flex justify-between items-center">
                            <div class="text-sm text-gray-500">
                                Créé ${new Date(program.created_at).toLocaleDateString('fr-FR')}
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="app.viewProgram(${program.id})" 
                                        class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                                    Voir
                                </button>
                                ${this.user.role === 'coach' ? `
                                    <button onclick="app.editProgram(${program.id})" 
                                            class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                                        Modifier
                                    </button>
                                ` : ''}
                                ${this.user.role === 'client' ? `
                                    <button onclick="app.startWorkout(${program.id})" 
                                            class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                        Commencer
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${programs.length === 0 ? `
                <div class="text-center py-12">
                    <i class="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                        ${this.user.role === 'coach' ? 'Aucun programme créé' : 'Aucun programme assigné'}
                    </h3>
                    <p class="text-gray-600 mb-6">
                        ${this.user.role === 'coach' ? 'Commencez par créer votre premier programme d\'entraînement.' : 'Votre coach n\'a pas encore créé de programmes pour vous.'}
                    </p>
                    ${this.user.role === 'coach' ? `
                        <button onclick="app.showCreateProgramModal()" 
                                class="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">
                            Créer mon premier programme
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Create Program Modal -->
            <div id="create-program-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">Créer un nouveau programme</h3>
                            <button onclick="app.hideCreateProgramModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="create-program-form" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Nom du programme</label>
                                    <input type="text" name="name" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           placeholder="Programme Perte de Poids">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                    <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="mixed">Mixte</option>
                                        <option value="strength">Musculation</option>
                                        <option value="cardio">Cardio</option>
                                        <option value="flexibility">Flexibilité</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Durée (semaines)</label>
                                    <input type="number" name="duration_weeks" min="1" max="52" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           placeholder="12">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Séances/semaine</label>
                                    <input type="number" name="sessions_per_week" min="1" max="7" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           placeholder="3">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                                    <select name="difficulty" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="beginner">Débutant</option>
                                        <option value="intermediate" selected>Intermédiaire</option>
                                        <option value="advanced">Avancé</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Client (optionnel)</label>
                                <select name="client_id" id="client-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Programme général (aucun client spécifique)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea name="description" rows="4" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Décrivez les objectifs et le contenu de ce programme..."></textarea>
                            </div>
                            
                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button" onclick="app.hideCreateProgramModal()" 
                                        class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
                                    Annuler
                                </button>
                                <button type="submit" 
                                        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    Créer le programme
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

        // Load clients for the select dropdown
        if (this.user.role === 'coach') {
            this.loadClientsForSelect()
        }

        // Attach event listeners
        this.attachProgramsEventListeners()
    }

    async loadWorkoutsModule() {
        const content = document.getElementById('module-content')
        const response = await this.apiCall('/api/workouts')
        
        if (!response.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des séances</div>'
            return
        }

        const workouts = response.data

        content.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">
                        ${this.user.role === 'coach' ? 'Séances de Mes Clients' : 'Mes Séances d\'Entraînement'}
                    </h2>
                    <p class="text-gray-600">
                        ${this.user.role === 'coach' ? 'Suivez la progression de vos clients' : 'Votre historique d\'entraînement et prochaines séances'}
                    </p>
                </div>
                ${this.user.role === 'coach' ? `
                    <button onclick="app.showCreateWorkoutModal()" 
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center">
                        <i class="fas fa-plus mr-2"></i>
                        Nouvelle Séance
                    </button>
                ` : ''}
            </div>

            <!-- Filter Tabs -->
            <div class="mb-6">
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
                        <button onclick="app.filterWorkouts('all')" 
                                class="workout-filter-tab py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
                                data-filter="all">
                            Toutes
                        </button>
                        <button onclick="app.filterWorkouts('scheduled')" 
                                class="workout-filter-tab py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700"
                                data-filter="scheduled">
                            Prévues
                        </button>
                        <button onclick="app.filterWorkouts('completed')" 
                                class="workout-filter-tab py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700"
                                data-filter="completed">
                            Terminées
                        </button>
                        <button onclick="app.filterWorkouts('in_progress')" 
                                class="workout-filter-tab py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700"
                                data-filter="in_progress">
                            En cours
                        </button>
                    </nav>
                </div>
            </div>

            <!-- Workouts List -->
            <div class="space-y-4" id="workouts-list">
                ${workouts.map(workout => `
                    <div class="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow workout-item" 
                         data-status="${workout.status}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center mb-2">
                                    <h3 class="font-semibold text-gray-900 mr-3">${workout.name || 'Séance sans nom'}</h3>
                                    <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${this.getWorkoutStatusClass(workout.status)}">
                                        ${this.getWorkoutStatusLabel(workout.status)}
                                    </span>
                                    ${workout.program_name ? `
                                        <span class="ml-2 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                            ${workout.program_name}
                                        </span>
                                    ` : ''}
                                </div>
                                
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                                    <div class="flex items-center">
                                        <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                        ${workout.scheduled_date ? new Date(workout.scheduled_date).toLocaleDateString('fr-FR') : 'Non planifiée'}
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-clock mr-2 text-gray-400"></i>
                                        ${workout.duration_minutes ? workout.duration_minutes + ' min' : 'N/A'}
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-dumbbell mr-2 text-gray-400"></i>
                                        ${workout.exercise_count || 0} exercices
                                    </div>
                                    <div class="flex items-center">
                                        <i class="fas fa-weight-hanging mr-2 text-gray-400"></i>
                                        ${workout.total_volume || 0} kg
                                    </div>
                                </div>

                                ${this.user.role === 'coach' && workout.client_name ? `
                                    <div class="flex items-center mb-2">
                                        <i class="fas fa-user mr-2 text-gray-400"></i>
                                        <span class="text-sm text-gray-600">Client: <strong>${workout.client_name}</strong></span>
                                    </div>
                                ` : ''}

                                ${workout.notes ? `
                                    <p class="text-sm text-gray-600 mb-4">${workout.notes}</p>
                                ` : ''}
                            </div>
                            
                            <div class="flex flex-col items-end space-y-2">
                                ${workout.status === 'scheduled' && this.user.role === 'client' ? `
                                    <button onclick="app.startWorkoutSession(${workout.id})" 
                                            class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center text-sm">
                                        <i class="fas fa-play mr-2"></i>
                                        Commencer
                                    </button>
                                ` : ''}
                                
                                ${workout.status === 'in_progress' && this.user.role === 'client' ? `
                                    <button onclick="app.continueWorkoutSession(${workout.id})" 
                                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center text-sm">
                                        <i class="fas fa-play mr-2"></i>
                                        Continuer
                                    </button>
                                ` : ''}
                                
                                <button onclick="app.viewWorkoutDetails(${workout.id})" 
                                        class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center text-sm">
                                    <i class="fas fa-eye mr-2"></i>
                                    Voir
                                </button>
                                
                                ${this.user.role === 'coach' ? `
                                    <button onclick="app.editWorkout(${workout.id})" 
                                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center text-sm">
                                        <i class="fas fa-edit mr-2"></i>
                                        Modifier
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${workouts.length === 0 ? `
                <div class="text-center py-12">
                    <i class="fas fa-dumbbell text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                        ${this.user.role === 'coach' ? 'Aucune séance créée' : 'Aucune séance disponible'}
                    </h3>
                    <p class="text-gray-600 mb-6">
                        ${this.user.role === 'coach' ? 'Créez des séances d\'entraînement pour vos clients.' : 'Vos séances apparaîtront ici une fois créées par votre coach.'}
                    </p>
                    ${this.user.role === 'coach' ? `
                        <button onclick="app.showCreateWorkoutModal()" 
                                class="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">
                            Créer ma première séance
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Create Workout Modal -->
            ${this.user.role === 'coach' ? `
                <div id="create-workout-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
                            <div class="flex justify-between items-center mb-6">
                                <h3 class="text-lg font-semibold text-gray-900">Créer une nouvelle séance</h3>
                                <button onclick="app.hideCreateWorkoutModal()" class="text-gray-500 hover:text-gray-700">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <form id="create-workout-form" class="space-y-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Nom de la séance</label>
                                        <input type="text" name="name" required 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                               placeholder="Séance Haut du Corps">
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Durée estimée (min)</label>
                                        <input type="number" name="duration_minutes" min="1" max="300"
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                               placeholder="60">
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Programme</label>
                                        <select name="program_id" id="workout-program-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">Séance indépendante</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Client</label>
                                        <select name="client_id" id="workout-client-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">Sélectionner un client</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Date prévue</label>
                                    <input type="date" name="scheduled_date" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                    <textarea name="notes" rows="3" 
                                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              placeholder="Instructions spécifiques, échauffement recommandé..."></textarea>
                                </div>
                                
                                <div class="flex justify-end space-x-3 pt-4">
                                    <button type="button" onclick="app.hideCreateWorkoutModal()" 
                                            class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
                                        Annuler
                                    </button>
                                    <button type="submit" 
                                            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                        Créer la séance
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ` : ''}
        `

        // Load data for selects
        if (this.user.role === 'coach') {
            this.loadProgramsForWorkoutSelect()
            this.loadClientsForWorkoutSelect()
        }

        // Attach event listeners
        this.attachWorkoutsEventListeners()
    }

    async loadNutritionModule() {
        const content = document.getElementById('module-content')
        
        // Load nutrition data and goals
        const [mealsResponse, goalsResponse] = await Promise.all([
            this.apiCall('/api/nutrition/meals'),
            this.apiCall('/api/nutrition/goals')
        ])

        if (!mealsResponse.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des données nutritionnelles</div>'
            return
        }

        const meals = mealsResponse.data || []
        const goals = goalsResponse.success ? goalsResponse.data : null

        // Calculate today's stats
        const today = new Date().toISOString().split('T')[0]
        const todayMeals = meals.filter(meal => meal.logged_at && meal.logged_at.startsWith(today))
        const todayStats = this.calculateNutritionStats(todayMeals)

        content.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Suivi Nutritionnel</h2>
                <p class="text-gray-600">Suivez votre alimentation et atteignez vos objectifs</p>
            </div>

            <!-- Today's Progress -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Aujourd'hui - ${new Date().toLocaleDateString('fr-FR')}</h3>
                    <button onclick="app.showAddMealModal()" 
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center text-sm">
                        <i class="fas fa-plus mr-2"></i>
                        Ajouter un repas
                    </button>
                </div>

                <!-- Macro Rings -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div class="text-center">
                        <div class="macro-ring mx-auto mb-2" style="width: 80px; height: 80px;">
                            <svg class="transform -rotate-90" width="80" height="80">
                                <circle cx="40" cy="40" r="36" class="ring-background"></circle>
                                <circle cx="40" cy="40" r="36" class="ring-progress" 
                                        style="stroke: #3b82f6; stroke-dasharray: ${this.calculateRingProgress(todayStats.calories, goals?.daily_calories || 2000)} 226.2;">
                                </circle>
                            </svg>
                            <div class="ring-text">
                                <div class="font-bold text-sm">${Math.round(todayStats.calories)}</div>
                                <div class="text-xs text-gray-600">kcal</div>
                            </div>
                        </div>
                        <div class="text-xs text-gray-600">Objectif: ${goals?.daily_calories || 2000}</div>
                    </div>

                    <div class="text-center">
                        <div class="macro-ring mx-auto mb-2" style="width: 80px; height: 80px;">
                            <svg class="transform -rotate-90" width="80" height="80">
                                <circle cx="40" cy="40" r="36" class="ring-background"></circle>
                                <circle cx="40" cy="40" r="36" class="ring-progress" 
                                        style="stroke: #10b981; stroke-dasharray: ${this.calculateRingProgress(todayStats.protein, goals?.protein_target || 150)} 226.2;">
                                </circle>
                            </svg>
                            <div class="ring-text">
                                <div class="font-bold text-sm">${Math.round(todayStats.protein)}</div>
                                <div class="text-xs text-gray-600">g</div>
                            </div>
                        </div>
                        <div class="text-xs text-gray-600">Protéines: ${goals?.protein_target || 150}g</div>
                    </div>

                    <div class="text-center">
                        <div class="macro-ring mx-auto mb-2" style="width: 80px; height: 80px;">
                            <svg class="transform -rotate-90" width="80" height="80">
                                <circle cx="40" cy="40" r="36" class="ring-background"></circle>
                                <circle cx="40" cy="40" r="36" class="ring-progress" 
                                        style="stroke: #f59e0b; stroke-dasharray: ${this.calculateRingProgress(todayStats.carbs, goals?.carbs_target || 250)} 226.2;">
                                </circle>
                            </svg>
                            <div class="ring-text">
                                <div class="font-bold text-sm">${Math.round(todayStats.carbs)}</div>
                                <div class="text-xs text-gray-600">g</div>
                            </div>
                        </div>
                        <div class="text-xs text-gray-600">Glucides: ${goals?.carbs_target || 250}g</div>
                    </div>

                    <div class="text-center">
                        <div class="macro-ring mx-auto mb-2" style="width: 80px; height: 80px;">
                            <svg class="transform -rotate-90" width="80" height="80">
                                <circle cx="40" cy="40" r="36" class="ring-background"></circle>
                                <circle cx="40" cy="40" r="36" class="ring-progress" 
                                        style="stroke: #ef4444; stroke-dasharray: ${this.calculateRingProgress(todayStats.fat, goals?.fat_target || 80)} 226.2;">
                                </circle>
                            </svg>
                            <div class="ring-text">
                                <div class="font-bold text-sm">${Math.round(todayStats.fat)}</div>
                                <div class="text-xs text-gray-600">g</div>
                            </div>
                        </div>
                        <div class="text-xs text-gray-600">Lipides: ${goals?.fat_target || 80}g</div>
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <div class="font-semibold">${todayMeals.length}</div>
                        <div class="text-gray-600">Repas</div>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <div class="font-semibold">${Math.round((todayStats.protein / todayStats.calories) * 100) || 0}%</div>
                        <div class="text-gray-600">Protéines</div>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <div class="font-semibold">${Math.round((todayStats.carbs / todayStats.calories) * 100) || 0}%</div>
                        <div class="text-gray-600">Glucides</div>
                    </div>
                    <div class="text-center p-3 bg-gray-50 rounded">
                        <div class="font-semibold">${Math.round((todayStats.fat / todayStats.calories) * 100) || 0}%</div>
                        <div class="text-gray-600">Lipides</div>
                    </div>
                </div>
            </div>

            <!-- Recent Meals -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Repas Récents</h3>
                    <div class="flex space-x-2">
                        <button onclick="app.showNutritionGoalsModal()" 
                                class="text-gray-600 hover:text-gray-800 px-3 py-1 rounded border">
                            <i class="fas fa-target mr-1"></i>
                            Objectifs
                        </button>
                        <button onclick="app.showNutritionHistory()" 
                                class="text-gray-600 hover:text-gray-800 px-3 py-1 rounded border">
                            <i class="fas fa-chart-line mr-1"></i>
                            Historique
                        </button>
                    </div>
                </div>

                <div class="space-y-3">
                    ${meals.slice(0, 10).map(meal => `
                        <div class="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                            <div class="flex-1">
                                <div class="flex items-center">
                                    <h4 class="font-medium text-gray-900 mr-2">${meal.meal_name}</h4>
                                    <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                        ${this.getMealTypeLabel(meal.meal_type)}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-600 mt-1">
                                    ${Math.round(meal.calories)} kcal • 
                                    ${Math.round(meal.protein)}g protéines • 
                                    ${Math.round(meal.carbs)}g glucides • 
                                    ${Math.round(meal.fat)}g lipides
                                </div>
                                <div class="text-xs text-gray-500 mt-1">
                                    ${new Date(meal.logged_at).toLocaleString('fr-FR')}
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="app.editMeal(${meal.id})" 
                                        class="text-gray-500 hover:text-blue-600">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="app.deleteMeal(${meal.id})" 
                                        class="text-gray-500 hover:text-red-600">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${meals.length === 0 ? `
                    <div class="text-center py-8">
                        <i class="fas fa-apple-alt text-4xl text-gray-400 mb-4"></i>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Aucun repas enregistré</h4>
                        <p class="text-gray-600 mb-4">Commencez à suivre votre alimentation dès maintenant!</p>
                        <button onclick="app.showAddMealModal()" 
                                class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                            Ajouter mon premier repas
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Add Meal Modal -->
            <div id="add-meal-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg p-6 w-full max-w-md">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">Ajouter un repas</h3>
                            <button onclick="app.hideAddMealModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="add-meal-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nom du repas</label>
                                <input type="text" name="meal_name" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                       placeholder="Salade de poulet">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Type de repas</label>
                                <select name="meal_type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="breakfast">Petit-déjeuner</option>
                                    <option value="lunch">Déjeuner</option>
                                    <option value="dinner">Dîner</option>
                                    <option value="snack">Collation</option>
                                </select>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                                    <input type="number" name="calories" step="0.1" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Protéines (g)</label>
                                    <input type="number" name="protein" step="0.1" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Glucides (g)</label>
                                    <input type="number" name="carbs" step="0.1" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Lipides (g)</label>
                                    <input type="number" name="fat" step="0.1" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button" onclick="app.hideAddMealModal()" 
                                        class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
                                    Annuler
                                </button>
                                <button type="submit" 
                                        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    Ajouter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

        this.attachNutritionEventListeners()
    }

    async loadAppointmentsModule() {
        const content = document.getElementById('module-content')
        const response = await this.apiCall('/api/appointments')
        
        if (!response.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des rendez-vous</div>'
            return
        }

        const appointments = response.data || []

        // Group appointments by date for calendar view
        const appointmentsByDate = {}
        appointments.forEach(apt => {
            if (apt.scheduled_at) {
                const date = apt.scheduled_at.split('T')[0]
                if (!appointmentsByDate[date]) {
                    appointmentsByDate[date] = []
                }
                appointmentsByDate[date].push(apt)
            }
        })

        content.innerHTML = `
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">
                        ${this.user.role === 'coach' ? 'Mes Rendez-vous' : 'Mes Rendez-vous'}
                    </h2>
                    <p class="text-gray-600">
                        ${this.user.role === 'coach' ? 'Gérez vos créneaux et consultations' : 'Vos rendez-vous avec votre coach'}
                    </p>
                </div>
                <button onclick="app.showCreateAppointmentModal()" 
                        class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center">
                    <i class="fas fa-plus mr-2"></i>
                    ${this.user.role === 'coach' ? 'Créer un créneau' : 'Demander un RDV'}
                </button>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Calendrier du mois</h3>
                    <div class="flex items-center space-x-2">
                        <button onclick="app.previousMonth()" class="p-2 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span id="current-month-year" class="font-medium"></span>
                        <button onclick="app.nextMonth()" class="p-2 text-gray-500 hover:text-gray-700">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <div id="calendar-grid" class="grid grid-cols-7 gap-1 mb-4">
                    <!-- Calendar will be generated here -->
                </div>
            </div>

            <!-- Appointments List -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Rendez-vous</h3>
                    <div class="flex space-x-2">
                        <button onclick="app.filterAppointments('all')" 
                                class="appointment-filter-tab px-3 py-1 text-sm rounded-md bg-blue-500 text-white"
                                data-filter="all">
                            Tous
                        </button>
                        <button onclick="app.filterAppointments('scheduled')" 
                                class="appointment-filter-tab px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                                data-filter="scheduled">
                            Prévus
                        </button>
                        <button onclick="app.filterAppointments('confirmed')" 
                                class="appointment-filter-tab px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                                data-filter="confirmed">
                            Confirmés
                        </button>
                        <button onclick="app.filterAppointments('completed')" 
                                class="appointment-filter-tab px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                                data-filter="completed">
                            Terminés
                        </button>
                    </div>
                </div>

                <div class="space-y-4" id="appointments-list">
                    ${appointments.map(apt => `
                        <div class="appointment-item border rounded-lg p-4 hover:shadow-md transition-shadow" 
                             data-status="${apt.status}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center mb-2">
                                        <h4 class="font-medium text-gray-900 mr-3">
                                            ${apt.type === 'consultation' ? '💬' : 
                                              apt.type === 'training' ? '🏋️' :
                                              apt.type === 'nutrition' ? '🥗' : '📋'} 
                                            ${this.getAppointmentTypeLabel(apt.type)}
                                        </h4>
                                        <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${this.getAppointmentStatusClass(apt.status)}">
                                            ${this.getAppointmentStatusLabel(apt.status)}
                                        </span>
                                    </div>
                                    
                                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3 text-sm text-gray-600">
                                        <div class="flex items-center">
                                            <i class="fas fa-calendar mr-2 text-gray-400"></i>
                                            ${new Date(apt.scheduled_at).toLocaleDateString('fr-FR')}
                                        </div>
                                        <div class="flex items-center">
                                            <i class="fas fa-clock mr-2 text-gray-400"></i>
                                            ${new Date(apt.scheduled_at).toLocaleTimeString('fr-FR', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })} (${apt.duration_minutes}min)
                                        </div>
                                        <div class="flex items-center">
                                            <i class="fas fa-user mr-2 text-gray-400"></i>
                                            ${this.user.role === 'coach' ? apt.client_name : apt.coach_name}
                                        </div>
                                    </div>

                                    ${apt.notes ? `
                                        <p class="text-sm text-gray-600 mb-3">${apt.notes}</p>
                                    ` : ''}
                                </div>
                                
                                <div class="flex flex-col items-end space-y-2">
                                    ${apt.status === 'scheduled' && this.user.role === 'client' ? `
                                        <button onclick="app.confirmAppointment(${apt.id})" 
                                                class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                            Confirmer
                                        </button>
                                    ` : ''}
                                    
                                    ${apt.status === 'confirmed' && new Date(apt.scheduled_at) <= new Date() ? `
                                        <button onclick="app.completeAppointment(${apt.id})" 
                                                class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                                            Marquer terminé
                                        </button>
                                    ` : ''}
                                    
                                    <button onclick="app.viewAppointmentDetails(${apt.id})" 
                                            class="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                                        Détails
                                    </button>
                                    
                                    ${apt.status === 'scheduled' || apt.status === 'confirmed' ? `
                                        <button onclick="app.cancelAppointment(${apt.id})" 
                                                class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                                            Annuler
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${appointments.length === 0 ? `
                    <div class="text-center py-12">
                        <i class="fas fa-calendar text-4xl text-gray-400 mb-4"></i>
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Aucun rendez-vous</h4>
                        <p class="text-gray-600 mb-6">
                            ${this.user.role === 'coach' ? 'Créez des créneaux pour vos clients' : 'Demandez un rendez-vous à votre coach'}
                        </p>
                        <button onclick="app.showCreateAppointmentModal()" 
                                class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                            ${this.user.role === 'coach' ? 'Créer un créneau' : 'Demander un RDV'}
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Create Appointment Modal -->
            <div id="create-appointment-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg p-6 w-full max-w-md">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">
                                ${this.user.role === 'coach' ? 'Créer un créneau' : 'Demander un rendez-vous'}
                            </h3>
                            <button onclick="app.hideCreateAppointmentModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="create-appointment-form" class="space-y-4">
                            ${this.user.role === 'client' ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Coach</label>
                                    <select name="coach_id" id="appointment-coach-select" required 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Sélectionner un coach</option>
                                    </select>
                                </div>
                            ` : `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Client</label>
                                    <select name="client_id" id="appointment-client-select" 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Optionnel - Créneau libre</option>
                                    </select>
                                </div>
                            `}
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Type de rendez-vous</label>
                                <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="consultation">Consultation</option>
                                    <option value="training">Séance d'entraînement</option>
                                    <option value="nutrition">Conseil nutritionnel</option>
                                    <option value="assessment">Évaluation</option>
                                </select>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                    <input type="date" name="scheduled_date" required 
                                           min="${new Date().toISOString().split('T')[0]}"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                                    <input type="time" name="scheduled_time" required 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Durée (minutes)</label>
                                <select name="duration_minutes" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="30">30 minutes</option>
                                    <option value="60" selected>1 heure</option>
                                    <option value="90">1h30</option>
                                    <option value="120">2 heures</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea name="notes" rows="3" 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Objectifs, besoins spécifiques..."></textarea>
                            </div>
                            
                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button" onclick="app.hideCreateAppointmentModal()" 
                                        class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
                                    Annuler
                                </button>
                                <button type="submit" 
                                        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    ${this.user.role === 'coach' ? 'Créer' : 'Demander'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

        // Initialize calendar
        this.currentCalendarDate = new Date()
        this.appointmentsByDate = appointmentsByDate
        this.renderCalendar()

        // Load data for selects
        this.loadAppointmentParticipants()
        this.attachAppointmentsEventListeners()
    }

    async loadMessagesModule() {
        const content = document.getElementById('module-content')
        
        // Load conversations and messages
        const [conversationsResponse, messagesResponse] = await Promise.all([
            this.apiCall('/api/messages/conversations'),
            this.apiCall('/api/messages?limit=50')
        ])

        if (!conversationsResponse.success || !messagesResponse.success) {
            content.innerHTML = '<div class="text-red-500">Erreur lors du chargement des messages</div>'
            return
        }

        const conversations = conversationsResponse.data || []
        const messages = messagesResponse.data || []

        content.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
                <p class="text-gray-600">Communiquez avec ${this.user.role === 'coach' ? 'vos clients' : 'vos coaches'}</p>
            </div>

            <div class="bg-white rounded-lg shadow-sm overflow-hidden" style="height: 70vh;">
                <div class="flex h-full">
                    <!-- Conversations Sidebar -->
                    <div class="w-1/3 border-r border-gray-200 flex flex-col">
                        <div class="p-4 border-b border-gray-200">
                            <div class="flex justify-between items-center">
                                <h3 class="font-semibold text-gray-900">Conversations</h3>
                                <button onclick="app.showNewMessageModal()" 
                                        class="text-blue-500 hover:text-blue-700">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto" id="conversations-list">
                            ${conversations.map(conv => `
                                <div class="conversation-item p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
                                     data-conversation-id="${conv.conversation_with_id || conv.user1_id + '-' + conv.user2_id}"
                                     onclick="app.selectConversation(${conv.conversation_with_id || conv.user1_id}, '${conv.conversation_with_name || conv.user1_name}')">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                ${(conv.conversation_with_name || conv.user1_name || '?').charAt(0)}
                                            </div>
                                            <div class="ml-3 flex-1">
                                                <div class="font-medium text-gray-900">
                                                    ${conv.conversation_with_name || conv.user1_name || 'Utilisateur'}
                                                </div>
                                                <div class="text-sm text-gray-600 truncate">
                                                    ${conv.last_message_content || conv.conversation_with_role || 'Aucun message'}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            ${conv.unread_count > 0 ? `
                                                <div class="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                    ${conv.unread_count}
                                                </div>
                                            ` : ''}
                                            <div class="text-xs text-gray-500 mt-1">
                                                ${conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString('fr-FR') : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                            
                            ${conversations.length === 0 ? `
                                <div class="p-8 text-center text-gray-500">
                                    <i class="fas fa-comments text-3xl mb-4"></i>
                                    <p>Aucune conversation</p>
                                    <button onclick="app.showNewMessageModal()" 
                                            class="mt-2 text-blue-500 hover:text-blue-700 text-sm">
                                        Commencer une conversation
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div class="flex-1 flex flex-col">
                        <div id="messages-header" class="p-4 border-b border-gray-200 hidden">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    <span id="chat-participant-initial">?</span>
                                </div>
                                <div class="ml-3">
                                    <div class="font-medium text-gray-900" id="chat-participant-name">Sélectionner une conversation</div>
                                    <div class="text-sm text-gray-600" id="chat-participant-role"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="messages-content" class="flex-1 overflow-y-auto p-4">
                            <div class="h-full flex items-center justify-center text-gray-500">
                                <div class="text-center">
                                    <i class="fas fa-comments text-4xl mb-4"></i>
                                    <p>Sélectionnez une conversation pour commencer</p>
                                </div>
                            </div>
                        </div>
                        
                        <div id="message-input-area" class="p-4 border-t border-gray-200 hidden">
                            <form id="send-message-form" class="flex">
                                <input type="text" id="message-input" placeholder="Tapez votre message..." 
                                       class="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <input type="hidden" id="recipient-id">
                                <button type="submit" 
                                        class="px-6 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- New Message Modal -->
            <div id="new-message-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg p-6 w-full max-w-md">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-900">Nouveau message</h3>
                            <button onclick="app.hideNewMessageModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <form id="new-message-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    ${this.user.role === 'coach' ? 'Client' : 'Coach'}
                                </label>
                                <select name="recipient_id" id="new-message-recipient" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sélectionner...</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea name="content" rows="4" required 
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="Tapez votre message..."></textarea>
                            </div>
                            
                            <div class="flex justify-end space-x-3">
                                <button type="button" onclick="app.hideNewMessageModal()" 
                                        class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
                                    Annuler
                                </button>
                                <button type="submit" 
                                        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    Envoyer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `

        // Load recipients for new message
        this.loadMessageRecipients()
        
        // Attach event listeners
        this.attachMessagesEventListeners()
        
        // Auto-select first conversation if available
        if (conversations.length > 0) {
            const firstConv = conversations[0]
            this.selectConversation(
                firstConv.conversation_with_id || firstConv.user1_id, 
                firstConv.conversation_with_name || firstConv.user1_name
            )
        }
    }

    async loadAnalyticsModule() {
        const content = document.getElementById('module-content')
        
        try {
            // Get analytics data
            const analyticsData = await this.getAnalyticsData()
            
            content.innerHTML = `
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">
                        <i class="fas fa-chart-line text-blue-500 mr-2"></i>
                        Analytics & Statistiques
                    </h2>
                    <p class="text-gray-600">Vue d'ensemble des performances et de l'engagement</p>
                </div>

                <!-- Time Period Filter -->
                <div class="mb-6">
                    <div class="flex space-x-2">
                        <button class="analytics-period-btn px-4 py-2 bg-blue-500 text-white rounded-md" data-period="7">7 jours</button>
                        <button class="analytics-period-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300" data-period="30">30 jours</button>
                        <button class="analytics-period-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300" data-period="90">90 jours</button>
                        <button class="analytics-period-btn px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300" data-period="365">1 an</button>
                    </div>
                </div>

                <!-- Key Metrics Overview -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                        <div class="flex items-center">
                            <i class="fas fa-users text-2xl mr-4"></i>
                            <div>
                                <div class="text-2xl font-bold">${analyticsData.totalUsers}</div>
                                <div class="text-sm opacity-80">Total Utilisateurs</div>
                                <div class="text-xs opacity-70 mt-1">
                                    ${analyticsData.newUsersThisPeriod > 0 ? '+' : ''}${analyticsData.newUsersThisPeriod} ce mois
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                        <div class="flex items-center">
                            <i class="fas fa-clipboard-list text-2xl mr-4"></i>
                            <div>
                                <div class="text-2xl font-bold">${analyticsData.activePrograms}</div>
                                <div class="text-sm opacity-80">Programmes Actifs</div>
                                <div class="text-xs opacity-70 mt-1">
                                    ${analyticsData.completionRate}% taux de completion
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                        <div class="flex items-center">
                            <i class="fas fa-dumbbell text-2xl mr-4"></i>
                            <div>
                                <div class="text-2xl font-bold">${analyticsData.totalWorkouts}</div>
                                <div class="text-sm opacity-80">Séances Complétées</div>
                                <div class="text-xs opacity-70 mt-1">
                                    ${analyticsData.workoutsThisWeek} cette semaine
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                        <div class="flex items-center">
                            <i class="fas fa-calendar-check text-2xl mr-4"></i>
                            <div>
                                <div class="text-2xl font-bold">${analyticsData.appointmentsThisMonth}</div>
                                <div class="text-sm opacity-80">RDV ce mois</div>
                                <div class="text-xs opacity-70 mt-1">
                                    ${analyticsData.appointmentAttendanceRate}% présence
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <!-- User Growth Chart -->
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            <i class="fas fa-chart-area text-blue-500 mr-2"></i>
                            Croissance des Utilisateurs
                        </h3>
                        <canvas id="userGrowthChart" width="400" height="200"></canvas>
                    </div>

                    <!-- Workout Activity Chart -->
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            <i class="fas fa-chart-bar text-green-500 mr-2"></i>
                            Activité d'Entraînement
                        </h3>
                        <canvas id="workoutActivityChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Progress Tracking -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <!-- Program Completion Chart -->
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            <i class="fas fa-chart-pie text-purple-500 mr-2"></i>
                            Complétion des Programmes
                        </h3>
                        <div class="flex justify-center">
                            <canvas id="programCompletionChart" width="300" height="300"></canvas>
                        </div>
                    </div>

                    <!-- Coach Performance -->
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            <i class="fas fa-medal text-yellow-500 mr-2"></i>
                            Performance des Coaches
                        </h3>
                        <div class="space-y-4">
                            ${analyticsData.coachPerformance.map(coach => `
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(coach.name)}&size=40&background=0d7377&color=fff" 
                                             alt="${coach.name}" class="w-10 h-10 rounded-full mr-3">
                                        <div>
                                            <div class="font-medium text-gray-900">${coach.name}</div>
                                            <div class="text-sm text-gray-500">${coach.clients} clients</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-semibold text-gray-900">${coach.rating}/5</div>
                                        <div class="text-sm text-gray-500">${coach.completedSessions} séances</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Engagement Metrics -->
                <div class="bg-white border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-pulse text-red-500 mr-2"></i>
                        Métriques d'Engagement
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Daily Active Users -->
                        <div class="text-center">
                            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                                <svg class="w-24 h-24 transform -rotate-90">
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#e5e7eb" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#3b82f6" stroke-width="2"
                                            stroke-dasharray="${2 * Math.PI * 10}"
                                            stroke-dashoffset="${2 * Math.PI * 10 * (1 - analyticsData.dailyActiveUsersRate)}"/>
                                </svg>
                                <div class="absolute text-sm font-semibold">
                                    ${Math.round(analyticsData.dailyActiveUsersRate * 100)}%
                                </div>
                            </div>
                            <div class="font-medium text-gray-900">Utilisateurs Actifs Quotidiens</div>
                            <div class="text-sm text-gray-500">${analyticsData.dailyActiveUsers} utilisateurs</div>
                        </div>

                        <!-- Message Response Rate -->
                        <div class="text-center">
                            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                                <svg class="w-24 h-24 transform -rotate-90">
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#e5e7eb" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#10b981" stroke-width="2"
                                            stroke-dasharray="${2 * Math.PI * 10}"
                                            stroke-dashoffset="${2 * Math.PI * 10 * (1 - analyticsData.messageResponseRate)}"/>
                                </svg>
                                <div class="absolute text-sm font-semibold">
                                    ${Math.round(analyticsData.messageResponseRate * 100)}%
                                </div>
                            </div>
                            <div class="font-medium text-gray-900">Taux de Réponse Messages</div>
                            <div class="text-sm text-gray-500">Avg: ${analyticsData.avgResponseTime}h</div>
                        </div>

                        <!-- Retention Rate -->
                        <div class="text-center">
                            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                                <svg class="w-24 h-24 transform -rotate-90">
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#e5e7eb" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="10" transform="translate(36,36)" 
                                            fill="transparent" stroke="#8b5cf6" stroke-width="2"
                                            stroke-dasharray="${2 * Math.PI * 10}"
                                            stroke-dashoffset="${2 * Math.PI * 10 * (1 - analyticsData.retentionRate)}"/>
                                </svg>
                                <div class="absolute text-sm font-semibold">
                                    ${Math.round(analyticsData.retentionRate * 100)}%
                                </div>
                            </div>
                            <div class="font-medium text-gray-900">Taux de Rétention</div>
                            <div class="text-sm text-gray-500">30 jours</div>
                        </div>
                    </div>
                </div>
            `

            // Initialize charts after content is loaded
            setTimeout(() => {
                this.initializeAnalyticsCharts(analyticsData)
                this.attachAnalyticsEventListeners()
            }, 100)

        } catch (error) {
            console.error('Error loading analytics:', error)
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                    <div class="text-red-600">Erreur lors du chargement des analytics</div>
                </div>
            `
        }
    }

    async getAnalyticsData() {
        // In a real application, this would fetch from multiple endpoints
        // For demo purposes, we'll generate realistic data
        
        try {
            // Get actual data where possible
            const usersResponse = await this.apiCall('/api/users')
            const programsResponse = await this.apiCall('/api/programs')  
            const workoutsResponse = await this.apiCall('/api/workouts')
            const appointmentsResponse = await this.apiCall('/api/appointments')

            const totalUsers = usersResponse.success ? usersResponse.data.length : 0
            const totalPrograms = programsResponse.success ? programsResponse.data.length : 0
            const totalWorkouts = workoutsResponse.success ? workoutsResponse.data.length : 0
            const totalAppointments = appointmentsResponse.success ? appointmentsResponse.data.length : 0

            // Calculate metrics from real data
            const activePrograms = programsResponse.success ? 
                programsResponse.data.filter(p => p.status === 'active').length : 0
            
            const completedWorkouts = workoutsResponse.success ?
                workoutsResponse.data.filter(w => w.status === 'completed').length : 0

            const thisMonthAppointments = appointmentsResponse.success ?
                appointmentsResponse.data.filter(a => {
                    const appointmentDate = new Date(a.appointment_date)
                    const now = new Date()
                    return appointmentDate.getMonth() === now.getMonth() && 
                           appointmentDate.getFullYear() === now.getFullYear()
                }).length : 0

            // Generate realistic mock data for advanced analytics
            return {
                totalUsers,
                newUsersThisPeriod: Math.floor(totalUsers * 0.15),
                activePrograms,
                completionRate: totalPrograms > 0 ? Math.round((activePrograms / totalPrograms) * 100) : 75,
                totalWorkouts: completedWorkouts,
                workoutsThisWeek: Math.floor(completedWorkouts * 0.1),
                appointmentsThisMonth: thisMonthAppointments,
                appointmentAttendanceRate: 87,
                dailyActiveUsers: Math.floor(totalUsers * 0.35),
                dailyActiveUsersRate: 0.35,
                messageResponseRate: 0.92,
                avgResponseTime: 2.4,
                retentionRate: 0.78,
                
                // Mock chart data
                userGrowthData: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jul'],
                    data: [12, 19, 25, 31, 42, 38, totalUsers]
                },
                
                workoutActivityData: {
                    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                    data: [15, 22, 18, 25, 20, 12, 8]
                },
                
                programCompletionData: {
                    labels: ['Complété', 'En cours', 'Abandonné'],
                    data: [65, 25, 10],
                    colors: ['#10b981', '#f59e0b', '#ef4444']
                },
                
                coachPerformance: [
                    { name: 'Sophie Martin', clients: 15, rating: 4.8, completedSessions: 89 },
                    { name: 'Thomas Dupont', clients: 12, rating: 4.6, completedSessions: 72 },
                    { name: 'Marie Laurent', clients: 18, rating: 4.9, completedSessions: 95 },
                    { name: 'Pierre Dubois', clients: 10, rating: 4.4, completedSessions: 54 }
                ]
            }
        } catch (error) {
            console.error('Error fetching analytics data:', error)
            // Return default data in case of error
            return {
                totalUsers: 0,
                newUsersThisPeriod: 0,
                activePrograms: 0,
                completionRate: 0,
                totalWorkouts: 0,
                workoutsThisWeek: 0,
                appointmentsThisMonth: 0,
                appointmentAttendanceRate: 0,
                dailyActiveUsers: 0,
                dailyActiveUsersRate: 0,
                messageResponseRate: 0,
                avgResponseTime: 0,
                retentionRate: 0,
                userGrowthData: { labels: [], data: [] },
                workoutActivityData: { labels: [], data: [] },
                programCompletionData: { labels: [], data: [], colors: [] },
                coachPerformance: []
            }
        }
    }

    initializeAnalyticsCharts(data) {
        // User Growth Line Chart
        const userGrowthCtx = document.getElementById('userGrowthChart')
        if (userGrowthCtx) {
            // Since we're not using Chart.js library, we'll create simple CSS-based charts
            this.createLineChart(userGrowthCtx, data.userGrowthData)
        }

        // Workout Activity Bar Chart
        const workoutActivityCtx = document.getElementById('workoutActivityChart')
        if (workoutActivityCtx) {
            this.createBarChart(workoutActivityCtx, data.workoutActivityData)
        }

        // Program Completion Pie Chart
        const programCompletionCtx = document.getElementById('programCompletionChart')
        if (programCompletionCtx) {
            this.createPieChart(programCompletionCtx, data.programCompletionData)
        }
    }

    createLineChart(canvas, data) {
        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height
        const padding = 40

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Draw axes
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        
        // Y axis
        ctx.beginPath()
        ctx.moveTo(padding, padding)
        ctx.lineTo(padding, height - padding)
        ctx.stroke()

        // X axis  
        ctx.beginPath()
        ctx.moveTo(padding, height - padding)
        ctx.lineTo(width - padding, height - padding)
        ctx.stroke()

        if (data.data.length > 0) {
            // Draw line
            const maxValue = Math.max(...data.data)
            const stepX = (width - 2 * padding) / (data.data.length - 1)
            const stepY = (height - 2 * padding) / maxValue

            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2
            ctx.beginPath()

            data.data.forEach((value, index) => {
                const x = padding + index * stepX
                const y = height - padding - value * stepY

                if (index === 0) {
                    ctx.moveTo(x, y)
                } else {
                    ctx.lineTo(x, y)
                }
            })
            ctx.stroke()

            // Draw points
            ctx.fillStyle = '#3b82f6'
            data.data.forEach((value, index) => {
                const x = padding + index * stepX
                const y = height - padding - value * stepY
                ctx.beginPath()
                ctx.arc(x, y, 4, 0, 2 * Math.PI)
                ctx.fill()
            })

            // Draw labels
            ctx.fillStyle = '#6b7280'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'center'
            data.labels.forEach((label, index) => {
                const x = padding + index * stepX
                ctx.fillText(label, x, height - padding + 15)
            })
        }
    }

    createBarChart(canvas, data) {
        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height
        const padding = 40

        ctx.clearRect(0, 0, width, height)

        if (data.data.length > 0) {
            const maxValue = Math.max(...data.data)
            const barWidth = (width - 2 * padding) / data.data.length * 0.6
            const barSpacing = (width - 2 * padding) / data.data.length

            data.data.forEach((value, index) => {
                const barHeight = (value / maxValue) * (height - 2 * padding)
                const x = padding + index * barSpacing + (barSpacing - barWidth) / 2
                const y = height - padding - barHeight

                // Draw bar
                ctx.fillStyle = '#10b981'
                ctx.fillRect(x, y, barWidth, barHeight)

                // Draw value on top
                ctx.fillStyle = '#374151'
                ctx.font = '12px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(value.toString(), x + barWidth / 2, y - 5)

                // Draw label
                ctx.fillStyle = '#6b7280'
                ctx.fillText(data.labels[index], x + barWidth / 2, height - padding + 15)
            })
        }
    }

    createPieChart(canvas, data) {
        const ctx = canvas.getContext('2d')
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(centerX, centerY) - 20

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (data.data.length > 0) {
            const total = data.data.reduce((sum, value) => sum + value, 0)
            let currentAngle = -Math.PI / 2

            data.data.forEach((value, index) => {
                const sliceAngle = (value / total) * 2 * Math.PI
                
                // Draw slice
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
                ctx.closePath()
                ctx.fillStyle = data.colors[index]
                ctx.fill()
                
                // Draw label
                const labelAngle = currentAngle + sliceAngle / 2
                const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
                const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)
                
                ctx.fillStyle = 'white'
                ctx.font = '12px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(`${value}%`, labelX, labelY)

                currentAngle += sliceAngle
            })

            // Draw legend
            data.labels.forEach((label, index) => {
                const legendY = canvas.height - 60 + index * 20
                
                ctx.fillStyle = data.colors[index]
                ctx.fillRect(20, legendY - 8, 12, 12)
                
                ctx.fillStyle = '#374151'
                ctx.font = '12px sans-serif'
                ctx.textAlign = 'left'
                ctx.fillText(`${label}: ${data.data[index]}%`, 40, legendY)
            })
        }
    }

    attachAnalyticsEventListeners() {
        // Period filter buttons
        document.querySelectorAll('.analytics-period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active button
                document.querySelectorAll('.analytics-period-btn').forEach(b => {
                    b.classList.remove('bg-blue-500', 'text-white')
                    b.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300')
                })
                
                e.target.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300')
                e.target.classList.add('bg-blue-500', 'text-white')
                
                // Reload analytics with new period
                const period = e.target.dataset.period
                this.loadAnalyticsModule(period)
            })
        })
    }

    // ================== NOTIFICATIONS SYSTEM ==================

    attachNotificationListeners() {
        // Notifications button toggle
        const notificationsBtn = document.getElementById('notifications-btn')
        const notificationsDropdown = document.getElementById('notifications-dropdown')
        
        if (notificationsBtn && notificationsDropdown) {
            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                notificationsDropdown.classList.toggle('hidden')
                if (!notificationsDropdown.classList.contains('hidden')) {
                    this.loadNotifications()
                }
            })

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
                    notificationsDropdown.classList.add('hidden')
                }
            })
        }

        // Mark all as read button
        const markAllReadBtn = document.getElementById('mark-all-read')
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async () => {
                await this.markAllNotificationsRead()
            })
        }
    }

    startNotificationPolling() {
        // Clear existing interval
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval)
        }

        // Load initial notifications
        this.loadNotifications()

        // Poll for new notifications every 30 seconds
        this.notificationInterval = setInterval(() => {
            this.loadNotifications(true) // true = background load
        }, 30000)
    }

    stopNotificationPolling() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval)
            this.notificationInterval = null
        }
    }

    async loadNotifications(background = false) {
        try {
            const response = await this.apiCall('/api/notifications')
            
            if (response.success) {
                const newNotifications = response.data || []
                const previousUnreadCount = this.unreadCount
                
                this.notifications = newNotifications
                this.unreadCount = newNotifications.filter(n => !n.is_read).length
                
                // Update badge
                this.updateNotificationBadge()
                
                // Show browser notification for new messages (only if not background load)
                if (!background && this.unreadCount > previousUnreadCount) {
                    this.showBrowserNotification(
                        'CoachFit', 
                        `Vous avez ${this.unreadCount - previousUnreadCount} nouvelle(s) notification(s)`
                    )
                }
                
                // Update dropdown content if it's visible
                const dropdown = document.getElementById('notifications-dropdown')
                if (dropdown && !dropdown.classList.contains('hidden')) {
                    this.renderNotificationsList()
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error)
            // Create mock notifications for demo purposes
            this.createMockNotifications()
        }
    }

    createMockNotifications() {
        // Create realistic mock notifications based on user role
        const mockNotifications = []
        const now = new Date()

        if (this.user.role === 'coach') {
            mockNotifications.push(
                {
                    id: 1,
                    type: 'message',
                    title: 'Nouveau message de Marie Dupont',
                    message: 'Question sur le programme d\'entraînement',
                    is_read: false,
                    created_at: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
                    icon: 'fas fa-envelope',
                    color: 'text-blue-500'
                },
                {
                    id: 2,
                    type: 'appointment',
                    title: 'Rendez-vous confirmé',
                    message: 'RDV avec Pierre Martin demain à 14h00',
                    is_read: false,
                    created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                    icon: 'fas fa-calendar-check',
                    color: 'text-green-500'
                },
                {
                    id: 3,
                    type: 'workout',
                    title: 'Séance complétée',
                    message: 'Julie Laurent a terminé sa séance "Upper Body"',
                    is_read: true,
                    created_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                    icon: 'fas fa-dumbbell',
                    color: 'text-purple-500'
                }
            )
        } else if (this.user.role === 'client') {
            mockNotifications.push(
                {
                    id: 1,
                    type: 'program',
                    title: 'Nouveau programme assigné',
                    message: 'Votre coach vous a assigné "Programme Force & Cardio"',
                    is_read: false,
                    created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
                    icon: 'fas fa-clipboard-list',
                    color: 'text-green-500'
                },
                {
                    id: 2,
                    type: 'message',
                    title: 'Réponse de votre coach',
                    message: 'Sophie Martin a répondu à votre message',
                    is_read: false,
                    created_at: new Date(now - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                    icon: 'fas fa-envelope',
                    color: 'text-blue-500'
                },
                {
                    id: 3,
                    type: 'appointment',
                    title: 'Rappel de rendez-vous',
                    message: 'N\'oubliez pas votre RDV demain à 10h00',
                    is_read: true,
                    created_at: new Date(now - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
                    icon: 'fas fa-clock',
                    color: 'text-orange-500'
                }
            )
        } else { // admin
            mockNotifications.push(
                {
                    id: 1,
                    type: 'user',
                    title: 'Nouveau coach inscrit',
                    message: 'Alexandre Dubois s\'est inscrit comme coach',
                    is_read: false,
                    created_at: new Date(now - 60 * 60 * 1000).toISOString(), // 1 hour ago
                    icon: 'fas fa-user-plus',
                    color: 'text-green-500'
                },
                {
                    id: 2,
                    type: 'system',
                    title: 'Rapport mensuel disponible',
                    message: 'Le rapport d\'activité de septembre est prêt',
                    is_read: false,
                    created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                    icon: 'fas fa-chart-line',
                    color: 'text-purple-500'
                }
            )
        }

        this.notifications = mockNotifications
        this.unreadCount = mockNotifications.filter(n => !n.is_read).length
        this.updateNotificationBadge()
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notifications-badge')
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString()
                badge.classList.remove('hidden')
            } else {
                badge.classList.add('hidden')
            }
        }
    }

    renderNotificationsList() {
        const notificationsList = document.getElementById('notifications-list')
        if (!notificationsList) return

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="p-4 text-center text-gray-500">
                    <i class="fas fa-bell-slash text-2xl mb-2"></i>
                    <div>Aucune notification</div>
                </div>
            `
            return
        }

        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item p-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}" 
                 data-id="${notification.id}">
                <div class="flex items-start">
                    <i class="${notification.icon} ${notification.color} mt-1 mr-3"></i>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                ${notification.title}
                            </p>
                            ${!notification.is_read ? '<div class="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>' : ''}
                        </div>
                        <p class="text-sm text-gray-600 truncate">${notification.message}</p>
                        <p class="text-xs text-gray-400 mt-1">${this.formatNotificationTime(notification.created_at)}</p>
                    </div>
                </div>
            </div>
        `).join('')

        // Attach click listeners to notification items
        notificationsList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = parseInt(item.dataset.id)
                this.handleNotificationClick(notificationId)
            })
        })
    }

    formatNotificationTime(timestamp) {
        const now = new Date()
        const time = new Date(timestamp)
        const diffInMinutes = Math.floor((now - time) / (1000 * 60))

        if (diffInMinutes < 1) return 'À l\'instant'
        if (diffInMinutes < 60) return `${diffInMinutes}min`
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
        if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}j`
        
        return time.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit' 
        })
    }

    async handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId)
        if (!notification) return

        // Mark notification as read
        if (!notification.is_read) {
            await this.markNotificationRead(notificationId)
        }

        // Hide dropdown
        document.getElementById('notifications-dropdown').classList.add('hidden')

        // Navigate to relevant module based on notification type
        switch (notification.type) {
            case 'message':
                this.loadModule('messages')
                break
            case 'appointment':
                this.loadModule('appointments')
                break
            case 'program':
                this.loadModule(this.user.role === 'coach' ? 'programs' : 'my-programs')
                break
            case 'workout':
                this.loadModule(this.user.role === 'coach' ? 'workouts' : 'my-workouts')
                break
            case 'user':
                if (this.user.role === 'admin') {
                    this.loadModule('users')
                }
                break
            case 'system':
                if (this.user.role === 'admin') {
                    this.loadModule('analytics')
                }
                break
        }
    }

    async markNotificationRead(notificationId) {
        try {
            const response = await this.apiCall(`/api/notifications/${notificationId}/read`, 'PUT')
            if (response.success) {
                // Update local notification status
                const notification = this.notifications.find(n => n.id === notificationId)
                if (notification) {
                    notification.is_read = true
                    this.unreadCount = this.notifications.filter(n => !n.is_read).length
                    this.updateNotificationBadge()
                    this.renderNotificationsList()
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error)
            // For demo purposes, update locally
            const notification = this.notifications.find(n => n.id === notificationId)
            if (notification) {
                notification.is_read = true
                this.unreadCount = this.notifications.filter(n => !n.is_read).length
                this.updateNotificationBadge()
                this.renderNotificationsList()
            }
        }
    }

    async markAllNotificationsRead() {
        try {
            const response = await this.apiCall('/api/notifications/read-all', 'PUT')
            if (response.success) {
                // Update all notifications to read
                this.notifications.forEach(n => n.is_read = true)
                this.unreadCount = 0
                this.updateNotificationBadge()
                this.renderNotificationsList()
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error)
            // For demo purposes, update locally
            this.notifications.forEach(n => n.is_read = true)
            this.unreadCount = 0
            this.updateNotificationBadge()
            this.renderNotificationsList()
        }
    }

    showBrowserNotification(title, message) {
        // Check if browser notifications are supported and permitted
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '/static/icon-192x192.png', // Add your app icon
                    badge: '/static/badge-72x72.png'  // Add your app badge
                })
            } else if (Notification.permission !== 'denied') {
                // Request permission
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: '/static/icon-192x192.png',
                            badge: '/static/badge-72x72.png'
                        })
                    }
                })
            }
        }
    }

    showInAppNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div')
        toast.className = `fixed top-4 right-4 z-50 max-w-sm bg-white border rounded-lg shadow-lg p-4 transform translate-x-full transition-transform duration-300`
        
        const colors = {
            info: 'border-blue-500 text-blue-700',
            success: 'border-green-500 text-green-700',
            warning: 'border-yellow-500 text-yellow-700',
            error: 'border-red-500 text-red-700'
        }

        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        }

        toast.innerHTML = `
            <div class="flex items-center">
                <i class="${icons[type]} ${colors[type]} mr-3"></i>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${message}</p>
                </div>
                <button class="ml-4 text-gray-400 hover:text-gray-600 close-toast">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `

        document.body.appendChild(toast)

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full')
        }, 100)

        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full')
            setTimeout(() => toast.remove(), 300)
        }, 5000)

        // Close button
        toast.querySelector('.close-toast').addEventListener('click', () => {
            toast.classList.add('translate-x-full')
            setTimeout(() => toast.remove(), 300)
        })
    }

    // ================== END NOTIFICATIONS SYSTEM ==================

    async loadProfileModule() {
        const content = document.getElementById('module-content')
        content.innerHTML = '<div class="text-center py-8">Module Profil en développement...</div>'
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CoachFitApp()
})