# CoachFit - Plateforme de Coaching Fitness

## 🎯 Vue d'Ensemble du Projet

**CoachFit** est une plateforme moderne de coaching fitness qui connecte les coaches sportifs avec leurs clients. L'application offre un système complet de gestion des programmes d'entraînement, de suivi nutritionnel, de messagerie et de planification de rendez-vous.

### 🌟 Objectifs Principaux
- Faciliter la communication entre coaches et clients
- Permettre le suivi personnalisé des programmes d'entraînement
- Offrir des outils de suivi nutritionnel avancés
- Gérer les rendez-vous et la planification des séances
- Fournir des analyses et statistiques de progression

## 🚀 URLs d'Accès

### Production
- **Interface V1** (Alpine.js): https://3000-is1736j50otb5uk3qedbb-6532622b.e2b.dev
- **Interface V2** (Vanilla JS): https://3000-is1736j50otb5uk3qedbb-6532622b.e2b.dev/v2
- **API Base**: https://3000-is1736j50otb5uk3qedbb-6532622b.e2b.dev/api
- **GitHub**: [Sera configuré lors du déploiement]

### API Endpoints Principaux
- `POST /api/auth/login` - Authentification
- `POST /api/auth/register` - Inscription  
- `GET /api/users/coaches` - Liste des coaches
- `GET /api/programs` - Programmes d'entraînement
- `GET /api/workouts` - Séances d'entraînement
- `GET /api/nutrition` - Suivi nutritionnel
- `GET /api/appointments` - Rendez-vous
- `GET /api/messages` - Messagerie

## ⚡ Fonctionnalités Complétées

### ✅ Authentification & Sécurité
- **Système JWT sécurisé** avec tokens d'accès
- **Rôles utilisateur**: Client, Coach, Admin
- **Hachage des mots de passe** avec bcryptjs
- **Middleware d'authentification** pour toutes les routes protégées
- **Autorisation basée sur les rôles** (clients → leurs données, coaches → leurs clients)

### ✅ Gestion des Utilisateurs
- **API Users complète** (`/api/users`)
- **Création, modification, suppression** des profils utilisateurs
- **Liste des coaches disponibles** pour les clients
- **Gestion des profils détaillés** (informations personnelles, bio, spécialisations)
- **Système de statut** (actif/inactif)

### ✅ Programmes d'Entraînement
- **API Programs complète** (`/api/programs`)
- **Création de programmes personnalisés** par les coaches
- **Assignation de programmes** aux clients
- **Gestion des types d'entraînement** (strength, cardio, flexibility, mixed)
- **Suivi de la progression** et des statuts (draft, active, completed, paused)

### ✅ Séances d'Entraînement
- **API Workouts complète** (`/api/workouts`) 
- **Gestion des exercices** dans les séances
- **Suivi des répétitions, séries, poids** 
- **Calcul automatique du volume d'entraînement**
- **Historique complet des séances**
- **Statut de complétion** par exercice

### ✅ Suivi Nutritionnel
- **API Nutrition complète** (`/api/nutrition`)
- **Enregistrement des repas** avec macronutriments détaillés
- **Calcul automatique des calories et macros**
- **Objectifs nutritionnels personnalisés**
- **Suivi quotidien et hebdomadaire**
- **Analyses nutritionnelles avancées**

### ✅ Système de Rendez-vous
- **API Appointments complète** (`/api/appointments`)
- **Planification intelligente** avec détection des conflits d'horaires
- **Types de rendez-vous** (consultation, training, nutrition, assessment)
- **Statuts avancés** (scheduled, confirmed, completed, cancelled)
- **Créneaux disponibles** pour chaque coach
- **Notifications automatiques**

### ✅ Messagerie Intégrée  
- **API Messages complète** (`/api/messages`)
- **Communication sécurisée** coach-client
- **Historique des conversations**
- **Notifications de nouveaux messages**
- **Système de lecture/non-lu**
- **Restrictions de sécurité** (clients ↔ leurs coaches uniquement)

### ✅ Interface Utilisateur Moderne
- **Interface V2 avancée** avec navigation modulaire
- **Design responsive** mobile-first avec TailwindCSS
- **Authentification intégrée** (login/register)
- **Dashboard personnalisé** selon le rôle utilisateur
- **Navigation contextuelle** (clients vs coaches vs admin)
- **Module de gestion des coaches** pour les clients
- **Icônes FontAwesome** et animations CSS personnalisées

## 🏗️ Architecture Technique

### Stack Technologique
- **Backend**: Hono Framework + TypeScript
- **Base de données**: Cloudflare D1 (SQLite distribué)  
- **Authentification**: JWT + bcryptjs
- **Frontend**: Vanilla JavaScript + TailwindCSS + FontAwesome
- **Déploiement**: Cloudflare Pages/Workers
- **Outils**: Wrangler CLI, PM2, Vite

### Structure des Données

#### Tables Principales
1. **users** - Informations utilisateur de base (email, password, role, phone, etc.)
2. **user_profiles** - Données profil étendues (height, weight, fitness_level, goals)
3. **programs** - Programmes d'entraînement créés par les coaches  
4. **workouts** - Séances d'entraînement individuelles
5. **exercises** - Bibliothèque d'exercices disponibles
6. **workout_exercises** - Relation séances-exercices avec détails
7. **meals** - Enregistrements de repas avec macronutriments
8. **nutrition_goals** - Objectifs nutritionnels personnalisés
9. **appointments** - Rendez-vous planifiés coaches-clients
10. **messages** - Système de messagerie intégrée
11. **notifications** - Notifications système

#### Relations Clés
- **Coach → Clients**: Via programs et appointments  
- **Programmes → Séances**: Relation hiérarchique
- **Séances → Exercices**: Relation many-to-many avec détails
- **Messages**: Relation bidirectionnelle sender/recipient
- **Rendez-vous**: Validation des créneaux avec détection conflits

## 🔧 Développement & Déploiement

### Environnement Local
```bash
# Installation des dépendances
npm install

# Migration base de données locale
npm run db:migrate:local

# Ajout des données de test  
npm run db:seed

# Compilation
npm run build

# Démarrage avec PM2
pm2 start ecosystem.config.cjs

# Test de l'API
curl http://localhost:3000/api/users/coaches
```

### Base de Données
- **Mode Local**: SQLite local automatique avec `--local`
- **Mode Production**: Cloudflare D1 distribué globalement
- **Migrations**: Gérées via Wrangler CLI
- **Seed Data**: Utilisateurs et données de test inclus

### Configuration PM2
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'coachfit',
    script: 'npx',
    args: 'wrangler pages dev dist --d1=coachfit-production --local --ip 0.0.0.0 --port 3000',
    env: { NODE_ENV: 'development', PORT: 3000 },
    instances: 1,
    exec_mode: 'fork'
  }]
}
```

## 📊 Statut du Développement

### Phase 1: Backend APIs ✅ TERMINÉE
- [x] Système d'authentification JWT sécurisé
- [x] API Users avec gestion des rôles
- [x] API Programs avec CRUD complet  
- [x] API Workouts avec gestion des exercices
- [x] API Nutrition avec calculs automatiques
- [x] API Appointments avec détection des conflits
- [x] API Messages avec communication sécurisée

### Phase 2: Frontend Interfaces ✅ TERMINÉE  
- [x] Interface d'authentification (login/register)
- [x] Dashboard personnalisé par rôle
- [x] Navigation modulaire avancée
- [x] Module de gestion des coaches
- [x] Intégration complète des APIs
- [x] Design responsive et moderne

### Phase 3: Fonctionnalités Avancées 🚧 EN COURS
- [ ] Modules frontend complets pour chaque API
- [ ] Calendrier interactif pour les rendez-vous
- [ ] Interface de messagerie temps réel
- [ ] Graphiques et analytics de progression
- [ ] Gestion avancée des programmes et exercices
- [ ] Interface de suivi nutritionnel avec graphiques

## 🎯 Prochaines Étapes Recommandées

1. **Compléter les modules frontend** - Développer les interfaces pour programmes, séances, nutrition
2. **Système de notifications** - Notifications en temps réel pour messages et rendez-vous  
3. **Analytics avancés** - Graphiques de progression, statistiques détaillées
4. **Mobile App** - Application mobile native avec les mêmes APIs
5. **Intégrations tierces** - MyFitnessPal, wearables, calendriers externes
6. **Paiements** - Intégration Stripe pour les services de coaching
7. **AI Assistant** - Recommandations automatiques basées sur l'IA

## 🔐 Utilisateurs de Test

### Comptes Disponibles
```javascript
// Coach Test (créé dynamiquement)
Email: test.coach@example.com
Password: password123
Role: coach

// Données seed (mots de passe à réinitialiser)
Admin: admin@coachfit.com  
Coach: coach.thomas@coachfit.com, coach.sophie@coachfit.com
Client: marie.client@example.com, julie.client@example.com
```

## 📝 Guide d'Utilisation

### Pour les Clients
1. **Inscription** → Créer un compte client
2. **Découverte** → Consulter la liste des coaches disponibles  
3. **Contact** → Envoyer un message à un coach
4. **Programmes** → Consulter les programmes assignés
5. **Séances** → Suivre ses entraînements
6. **Nutrition** → Enregistrer ses repas et suivre ses macros
7. **Rendez-vous** → Planifier des sessions avec son coach

### Pour les Coaches  
1. **Dashboard** → Vue d'ensemble de ses clients et statistiques
2. **Clients** → Gérer sa base de clients
3. **Programmes** → Créer et assigner des programmes personnalisés
4. **Séances** → Suivre la progression de ses clients  
5. **Rendez-vous** → Gérer son planning et confirmer les créneaux
6. **Messages** → Communiquer avec ses clients
7. **Profil** → Mettre à jour ses informations et tarifs

---

**CoachFit v1.0** - Développé avec ❤️ pour la communauté fitness

*Dernière mise à jour: 6 septembre 2025*