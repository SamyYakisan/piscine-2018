# 🚀 Guide de Déploiement CoachFit

## Vue d'Ensemble

CoachFit est une application web moderne conçue pour être déployée sur **Cloudflare Pages** avec des Workers pour l'API backend et une base de données D1 SQLite distribuée.

## 🛠️ Prérequis

### Outils Requis
- **Node.js** 18+ et npm
- **Git** pour le versioning
- **Compte Cloudflare** avec Pages activé
- **API Key Cloudflare** pour wrangler CLI

### Comptes Nécessaires
- [GitHub](https://github.com) - Repository source (✅ configuré)
- [Cloudflare](https://cloudflare.com) - Hébergement et services

## 🏗️ Architecture de Déploiement

```
┌─── Frontend (Static) ───┐    ┌─── Backend (Workers) ───┐    ┌─── Database (D1) ───┐
│ • HTML/CSS/JS           │    │ • Hono Framework        │    │ • SQLite distribué   │
│ • Progressive Web App   │    │ • API Routes            │    │ • Tables utilisateurs│
│ • Service Worker        │────┤ • JWT Authentication    │────┤ • Programmes fitness │
│ • Offline Support       │    │ • CRUD Operations       │    │ • Messages & RDV     │
└─────────────────────────┘    └─────────────────────────┘    └──────────────────────┘
```

## 📋 Étapes de Déploiement

### 1. Configuration Locale

```bash
# Clone du repository (déjà fait)
git clone https://github.com/SamyYakisan/piscine-2018.git coachfit
cd coachfit

# Installation des dépendances
npm install

# Configuration base de données locale
npm run db:migrate:local
npm run db:seed

# Test local
npm run build:prod
npm run dev:sandbox
```

### 2. Configuration Cloudflare

#### A. Obtenir l'API Key Cloudflare
1. Aller sur [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Créer un token avec permissions **Cloudflare Pages:Edit**
3. Copier le token généré

#### B. Configuration Wrangler
```bash
# Authentification
npx wrangler login
# OU avec token direct
export CLOUDFLARE_API_TOKEN="your-api-token-here"

# Vérification
npx wrangler whoami
```

### 3. Base de Données D1

#### Création Database Production
```bash
# Créer la base de données D1
npx wrangler d1 create coachfit-production

# Copier l'ID généré dans wrangler.toml
```

#### Configuration wrangler.toml
```toml
name = "coachfit-fitness-platform"
main = "dist/_worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "coachfit-production"
database_id = "your-database-id-here"  # Remplacer par l'ID réel
```

#### Migration Production
```bash
# Appliquer les migrations
npm run db:migrate:prod

# Optionnel: Données de test
npx wrangler d1 execute coachfit-production --file=./seed.sql
```

### 4. Déploiement Cloudflare Pages

#### Méthode 1: CLI Direct
```bash
# Build production
npm run build:prod

# Déploiement
npm run deploy

# Vérification
curl https://coachfit-fitness-platform.pages.dev/v2
```

#### Méthode 2: GitHub Integration
1. Aller sur [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. "Create a project" → "Connect to Git" 
3. Sélectionner repository `SamyYakisan/piscine-2018`
4. Configuration build:
   - **Build command**: `npm run build:prod`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (ou `/coachfit` si sous-dossier)

### 5. Configuration Variables d'Environnement

#### Secrets Cloudflare
```bash
# JWT Secret pour production
npx wrangler pages secret put JWT_SECRET --project-name coachfit-fitness-platform

# Autres variables si nécessaires
npx wrangler pages secret put API_BASE_URL --project-name coachfit-fitness-platform
```

#### Variables d'Environnement
```bash
# Via dashboard ou CLI
npx wrangler pages deployment create --project-name coachfit-fitness-platform \
  --environment production \
  --var NODE_ENV=production
```

## 🔧 Configuration Avancée

### Custom Domain
```bash
# Ajouter un domaine personnalisé
npx wrangler pages domain add coachfit.com --project-name coachfit-fitness-platform

# SSL automatique via Cloudflare
```

### Headers de Sécurité
Les headers sont automatiquement configurés via le fichier `public/_headers`:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Permissions Policy

### Cache Strategy
Configuration automatique via `public/_headers`:
- **Static assets**: 1 an de cache
- **API responses**: No cache
- **HTML pages**: 1 heure avec revalidation
- **Service Worker**: Toujours revalidé

## 🧪 Tests de Déploiement

### Tests Automatisés
```bash
# Health check
curl https://coachfit-fitness-platform.pages.dev/v2

# API test
curl -H "Content-Type: application/json" \
     -X POST \
     -d '{"email":"test@example.com","password":"test123","name":"Test","role":"client"}' \
     https://coachfit-fitness-platform.pages.dev/api/auth/register

# Database connectivity
curl -H "Authorization: Bearer <token>" \
     https://coachfit-fitness-platform.pages.dev/api/users/coaches
```

### Tests Fonctionnels
- [ ] Authentification (login/register)
- [ ] CRUD Programmes d'entraînement
- [ ] CRUD Séances d'entraînement  
- [ ] Suivi nutritionnel avec macros
- [ ] Système de messagerie
- [ ] Calendrier de rendez-vous
- [ ] Module analytics avec graphiques
- [ ] Notifications temps réel
- [ ] PWA installation mobile

## 🔍 Monitoring & Maintenance

### Logs Cloudflare
```bash
# Voir les logs en temps réel
npx wrangler pages deployment tail --project-name coachfit-fitness-platform

# Analytics traffic
npx wrangler pages deployment list --project-name coachfit-fitness-platform
```

### Base de Données
```bash
# Backup database
npx wrangler d1 export coachfit-production --output backup.sql

# Console SQL
npx wrangler d1 execute coachfit-production --command "SELECT COUNT(*) FROM users"
```

### Mises à Jour
```bash
# Workflow de mise à jour
git add .
git commit -m "Update: nouvelle fonctionnalité"
git push origin main

# Auto-deploy via GitHub integration
# OU manuel: npm run deploy
```

## 🚨 Dépannage

### Erreurs Communes

**Build Failed**
```bash
# Vérifier les dépendances
npm ci
rm -rf node_modules package-lock.json
npm install
```

**Database Connection Failed**
```bash
# Vérifier la configuration D1
npx wrangler d1 list
npx wrangler d1 info coachfit-production
```

**API 500 Errors**
```bash
# Vérifier les logs
npx wrangler pages deployment tail --project-name coachfit-fitness-platform
```

**PWA Not Installing**
- Vérifier HTTPS (automatique sur Cloudflare)
- Valider le manifest.json
- Tester le Service Worker

### Support
- **Documentation**: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- **Community**: [Cloudflare Discord](https://discord.cloudflare.com)
- **Repository**: [GitHub Issues](https://github.com/SamyYakisan/piscine-2018/issues)

---

**Status**: 🟡 Prêt pour déploiement (API Key Cloudflare requise)  
**Version**: Production v1.0  
**Dernière MAJ**: 6 septembre 2025