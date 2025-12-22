# TelcoManager

Une solution complète pour gérer les stocks, les interventions techniques et les planning des techniciens, incluant une interface web unifiée et une base de données robuste.

## 🎯 Fonctionnalités

### Web Application (Single Container)
- **Tableau de bord** : Vue d'ensemble avec statistiques en temps réel.
- **Gestion des clients** : Création, modification, fiches détaillées avec historique.
- **Gestion des techniciens** : Comptes utilisateurs avec rôles (admin/technicien).
- **Planification des interventions** : Création et assignation aux techniciens.
- **Gestion du stock** : Stock courant et stock HS (hors service).
- **Module inventaire** : Scan de codes-barres pour inventaire rapide.
- **Authentification** : Sécurisée via JWT.

### Application Mobile (Prochainement)
- Authentification technicien.
- Planning mensuel.
- Gestion des interventions.

## 🏗️ Architecture

L'application a été simplifiée pour tourner dans un seul conteneur Docker pour le frontend et le backend, orchestré avec une base de données PostgreSQL.

```
telcomanager/
├── backend/              # API Node.js + Express + Prisma (Sert aussi le Frontend)
├── webapp/               # Frontend React
├── postgres/             # Scripts PostgreSQL
├── docker-compose.yml    # Orchestration Docker
├── Dockerfile.combined   # Dockerfile unifié (App + API)
└── publish-docker.sh     # Script de publication Docker Hub
```

## 🚀 Démarrage Rapide

### Prérequis
- Docker et Docker Compose

### Déploiement avec Docker (Recommandé)

1. **Cloner le projet**
2. **Démarrer les services**

   ```bash
   docker compose up -d
   ```

   Cela démarrera :
   - **TelcoManager App** (Frontend + API) sur le port **8081**
   - **PostgreSQL** sur le port **5435**

   > **Note** : La base de données est automatiquement initialisée et remplie avec des données brutes au premier démarrage.

3. **Accéder à l'application**
   Ouvrez votre navigateur sur : [http://localhost:8081](http://localhost:8081)

### Identifiants par défaut

- **Username** : `admin`
- **Password** : `admin123`

### Variables d'Environnement

| Variable | Description |
|----------|-------------|
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Configuration PostgreSQL |
| `JWT_SECRET` | Clé secrète pour les tokens JWT |
| `UNYC_BASE_URL` | URL de l'API UNYC Atlas (ex: https://atlas-public-api...) |
| `UNYC_IAM_URL` | URL de l'IAM UNYC (ex: https://accounts.unyc.io...) |
| `UNYC_CLIENT_ID` | Client ID UNYC (ex: public-api) |
| `UNYC_USERNAME` | Identifiant de connexion UNYC |
| `UNYC_PASSWORD` | Mot de passe de connexion UNYC |
| `SEED_ON_START` | `true` pour forcer la réinitialisation de la DB (Admin password reset) |

## 📦 Images Docker

Les images sont hébergées sur Docker Hub :

- **Application** : `phonetic76/telcomanager-app:latest`

Pour mettre à jour votre instance avec la dernière version :

```bash
docker compose pull
docker compose up -d
```

## 🔧 Développement Local

Si vous souhaitez développer sans Docker :

1. **Backend**
   ```bash
   cd backend
   npm install
   # Configurer .env avec votre DB locale
   npx prisma migrate dev
   npm run dev
   ```

2. **Frontend**
   ```bash
   cd webapp
   npm install
   npm run dev
   ```

## 📚 Structure de la Base de Données

- **clients** : Informations des clients.
- **techniciens** : Comptes utilisateurs.
- **interventions** : Interventions planifiées/réalisées.
- **stock** : Matériel global.
- **equipments** : Matériel installé.

## 📝 Licence

Ce projet est développé à des fins internes.
