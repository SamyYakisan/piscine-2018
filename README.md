# CoachFit - Plateforme de Coaching Fitness

## 🎯 Vue d'Ensemble du Projet
- **Nom** : CoachFit
- **Objectif** : Plateforme mobile-first de coaching fitness avec modules Client/Coach
- **Caractéristiques** : Interface moderne, responsive design, système de rôles dynamique

## 🌐 URLs
- **Production Sandbox** : https://3000-is1736j50otb5uk3qedbb-6532622b.e2b.dev
- **API Endpoints** : `/api/stats`, `/api/users`, `/api/programs`, `/api/workouts`, `/api/meals`, `/api/appointments`
- **GitHub** : À configurer

## 🏗️ Architecture de Données
- **Modèles de Données** :
  - Utilisateurs (Client/Coach)
  - Programmes d'entraînement
  - Séances et exercices
  - Nutrition et repas
  - Rendez-vous et planning
  - Messages et communications
- **Services de Stockage** : Mock data (en développement, à migrer vers Cloudflare D1)
- **Flux de Données** : API REST → Frontend AlpineJS → Interface responsive

## 📱 Modules Implémentés

### ✅ Modules Client
1. **Dashboard** - Vue d'ensemble avec métriques et graphiques
2. **Entraînement** - Programmes et séances personnalisées
3. **Nutrition** - Suivi alimentaire et objectifs nutritionnels
4. **Progrès** - Analytics et évolution des performances
5. **Messages** - Communication avec le coach
6. **Rendez-vous** - Gestion des RDV et disponibilités

### ✅ Modules Coach
1. **Dashboard** - Tableau de bord avec statistiques clients
2. **Programmes** - Création et gestion des programmes
3. **Nutrition** - Plans nutritionnels et suivi
4. **Analytics** - Analyses de performance des clients
5. **Messages** - Communication avec les clients
6. **Calendrier** - Gestion des créneaux et RDV

## 🎨 Guide Utilisateur
1. **Sélection de Rôle** : Utilisez le sélecteur en haut à droite (👤 Client / 💪 Coach)
2. **Navigation Mobile** : Menu burger sur mobile, onglets sur desktop
3. **Tableau de Bord** : Vue d'ensemble avec métriques en temps réel
4. **Modules Interactifs** : Chaque module offre des fonctionnalités spécifiques au rôle
5. **Design Responsive** : Interface adaptée mobile-first avec effets glass

## 🚀 Fonctionnalités Actuelles
- ✅ Interface mobile-first responsive
- ✅ Système de rôles Client/Coach
- ✅ Navigation dynamique et intuitive
- ✅ Dashboard avec métriques temps réel
- ✅ Modules d'entraînement complets
- ✅ Suivi nutritionnel avancé
- ✅ Système de messagerie
- ✅ Gestion des rendez-vous
- ✅ Analytics et graphiques de progression
- ✅ Design moderne avec effets glass et gradients

## 📋 Fonctionnalités Non Implémentées
- ⏳ Authentification utilisateur réelle
- ⏳ Base de données persistante (D1)
- ⏳ Upload et gestion de fichiers
- ⏳ Notifications push
- ⏳ Intégration paiements
- ⏳ Assistant IA
- ⏳ Synchronisation fitness trackers
- ⏳ Mode hors ligne

## 📈 Prochaines Étapes Recommandées
1. **Intégrer Cloudflare D1** pour la persistance des données
2. **Système d'authentification** avec JWT et sessions
3. **API endpoints avancées** pour toutes les fonctionnalités CRUD
4. **Assistant IA** pour recommandations personnalisées
5. **Notifications en temps réel** avec WebSockets/Server-Sent Events
6. **Tests automatisés** pour la robustesse
7. **Déploiement production** sur Cloudflare Pages

## 🛠️ Déploiement
- **Plateforme** : Cloudflare Pages/Workers
- **Statut** : ✅ Active en développement
- **Stack Technique** : Hono + TypeScript + AlpineJS + TailwindCSS + Chart.js
- **Dernière Mise à Jour** : 6 Janvier 2025

## 🔧 Développement Local
```bash
# Installation
npm install

# Développement
npm run build && pm2 start ecosystem.config.cjs

# Test
npm run test

# Build
npm run build
```

## 🎨 Design System
- **Couleurs** : Primary (#4f46e5), Secondary (#06b6d4), Accent (#10b981)
- **Framework CSS** : TailwindCSS avec configuration personnalisée
- **Effets Visuels** : Glass morphism, gradients, animations fluides
- **Icons** : FontAwesome 6.4.0
- **Responsive** : Mobile-first avec breakpoints adaptatifs