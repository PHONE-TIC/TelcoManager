# Système de Gestion de Stock et d'Interventions

Une solution complète pour gérer les stocks, les interventions techniques et les planning des techniciens, avec des applications desktop (Windows/Ubuntu) et mobile (Android).

## 🎯 Fonctionnalités

### Application Desktop
- **Dashboard** : Vue d'ensemble avec statistiques en temps réel
- **Gestion des clients** : Création, modification, fiches détaillées avec historique
- **Gestion des techniciens** : Comptes utilisateurs avec rôles (admin/technicien)
- **Planification des interventions** : Création et assignation aux techniciens
- **Gestion du stock** : Stock courant et stock HS (hors service)
- **Module inventaire** : Scan de codes-barres pour inventaire rapide

### API Backend
- API REST complète avec authentification JWT
- Base de données PostgreSQL
- Gestion automatique des stocks lors des interventions
- Historique complet des opérations

### Application Mobile (À venir - Phase 3)
- Authentification technicien
- Planning mensuel
- Gestion des interventions
- Ajout/retrait de matériel client

## 🏗️ Architecture

```
stock-intervention-system/
├── backend/              # API Node.js + Express + Prisma
├── desktop/              # Application Electron + React
├── mobile/               # Application React Native (à venir)
├── docs/                 # Documentation
├── postgres/             # Scripts PostgreSQL
└── docker-compose.yml    # Orchestration Docker
```

## 🚀 Démarrage Rapide

### Prérequis
- Docker et Docker Compose
- Node.js 20+ (pour le développement local)
- npm ou yarn

### Déploiement avec Docker (Recommandé)

1. **Cloner le projet** (ou créer les fichiers dans votre répertoire)

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Modifier le fichier .env avec vos paramètres
```

3. **Démarrer les services Docker**
```bash
docker-compose up -d
```

Cela démarrera :
- PostgreSQL sur le port 5432
- API Backend sur le port 3001

4. **Initialiser la base de données**
```bash
cd backend
npm install
npx prisma migrate deploy
npm run seed  # Créer les données de test
```

5. **Installer et lancer l'application desktop**
```bash
cd desktop
npm install
npm run dev
```

### Identifiants par défaut
- **Username** : `admin`
- **Password** : `admin123`

## 📋 Installation Manuelle (Sans Docker)

### Backend

```bash
cd backend
npm install

# Configurer PostgreSQL localement et mettre à jour .env
# DATABASE_URL="postgresql://user:password@localhost:5432/stock_intervention_db"

# Créer les migrations
npx prisma migrate dev

# Générer le client Prisma
npx prisma generate

# Seed la base de données
npm run seed

# Démarrer le serveur
npm run dev
```

Le backend sera accessible sur `http://localhost:3001`

### Desktop

```bash
cd desktop
npm install

# Développement
npm run dev

# Build pour production
npm run build:linux  # Pour .deb
npm run build:win    # Pour .exe
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet:

```env
# Database
DATABASE_URL="postgresql://stock_user:stock_password@localhost:5432/stock_intervention_db"
POSTGRES_USER=stock_user
POSTGRES_PASSWORD=stock_password
POSTGRES_DB=stock_intervention_db

# API
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-very-secret-key-change-this
JWT_EXPIRES_IN=24h

# Admin par défaut
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

## 📦 Build et Distribution

### Application Desktop

#### Pour Linux (.deb)
```bash
cd desktop
npm run build:linux
# Le fichier .deb sera dans desktop/dist/
```

#### Pour Windows (.exe)
```bash
cd desktop
npm run build:win
# Le fichier .exe sera dans desktop/dist/
```

## 🧪 Tests

### Backend
```bash
cd backend
npm run test
```

### Desktop
```bash
cd desktop
npm run test
```

## 📚 Documentation

- [Guide de déploiement](docs/DEPLOYMENT.md)
- [Documentation API](docs/API.md)
- [Guide utilisateur](docs/USER_GUIDE.md)

## 🗄️ Structure de la Base de Données

- **clients** : Informations des clients
- **techniciens** : Comptes utilisateurs (admin/technicien)
- **interventions** : Interventions planifiées et réalisées
- **stock** : Matériel en stock (courant + HS)
- **client_equipments** : Matériel installé chez les clients
- **intervention_equipments** : Matériel utilisé lors des interventions

## 🔐 Sécurité

- Authentification JWT
- Hash des mots de passe avec bcrypt
- Contrôle d'accès basé sur les rôles (admin/technicien)
- Validation des données côté serveur

## 🛠️ Technologies Utilisées

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT pour l'authentification
- Docker

### Desktop
- Electron
- React + TypeScript
- Vite
- Axios
- React Router

### Mobile (À venir)
- React Native
- React Navigation
- AsyncStorage

## 📞 Support

Pour toute question ou problème :
1. Vérifier la documentation dans le dossier `docs/`
2. Consulter les logs : `docker-compose logs -f`
3. Vérifier la santé des services : `docker-compose ps`

## 🔄 Mises à jour

Pour mettre à jour le système :

```bash
# Arrêter les services
docker-compose down

# Récupérer les mises à jour
git pull  # ou mettre à jour les fichiers manuellement

# Reconstruire et redémarrer
docker-compose up -d --build

# Appliquer les migrations de base de données
cd backend
npx prisma migrate deploy
```

## 📝 Changelog

### Version 1.0.0 (Initial)
- ✅ API Backend complète
- ✅ Application Desktop (Windows + Linux)
- ✅ Gestion clients, techniciens, interventions
- ✅ Gestion stock (courant + HS)
- ✅ Module inventaire avec scan
- ✅ Déploiement Docker
- ⏳ Application Mobile Android (prochainement)

## 📄 Licence

Ce projet est développé à des fins internes.
