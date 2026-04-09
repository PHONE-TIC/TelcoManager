# TelcoManager

TelcoManager est une application de gestion pour le suivi des stocks, des interventions techniques, des techniciens et des inventaires, avec une interface web unifiée et une base PostgreSQL.

## Fonctionnalités

### Application web

- Tableau de bord avec statistiques et raccourcis
- Gestion des clients avec fiches détaillées
- Gestion des techniciens avec rôles (`admin`, `gestionnaire`, `technicien`)
- Planification et suivi des interventions
- Gestion du stock courant et du stock HS
- Module d’inventaire avec scan, comptage, écarts et export PDF
- Recherche globale sur les principales entités
- Authentification JWT
- Support PWA

### Mobile

Le dépôt contient aussi une base pour l’application mobile technicien, encore en évolution.

## Architecture

L’application tourne localement avec :

- un backend Node.js / Express / Prisma,
- un frontend React / Vite,
- une base PostgreSQL,
- un déploiement Docker simplifié.

```text
telcomanager/
├── backend/              # API Node.js + Express + Prisma
├── webapp/               # Frontend React
├── mobile/               # Application mobile
├── desktop/              # Application desktop
├── postgres/             # Scripts PostgreSQL
├── docker-compose.yml    # Orchestration locale
├── Dockerfile.combined   # Build unifié app + API
└── publish-docker.sh     # Publication Docker Hub
```

## Démarrage rapide

### Prérequis

- Docker
- Docker Compose

### Lancer l’environnement local

```bash
docker compose up -d
```

Services exposés par défaut :

- application : `http://localhost:8081`
- PostgreSQL : `localhost:5435`

### Identifiants par défaut

- username : `admin`
- password : `admin123`

## Variables d’environnement principales

| Variable | Description |
| --- | --- |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Configuration PostgreSQL |
| `JWT_SECRET` | Secret JWT |
| `UNYC_BASE_URL` | URL API UNYC |
| `UNYC_IAM_URL` | URL IAM UNYC |
| `UNYC_CLIENT_ID` | Client ID UNYC |
| `UNYC_USERNAME` | Login UNYC |
| `UNYC_PASSWORD` | Mot de passe UNYC |
| `VAPID_PUBLIC_KEY` | Clé publique notifications push |
| `VAPID_PRIVATE_KEY` | Clé privée notifications push |
| `VAPID_SUBJECT` | Sujet/contact notifications push |
| `SEED_ON_START` | `true` pour réinitialiser le seed admin au démarrage |

## Images Docker

Image publiée :

- `phonetic76/telcomanager-app:latest`

Mise à jour d’une instance :

```bash
docker compose pull
docker compose up -d
```

## Développement local

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd webapp
npm install
npm run dev
```

## Mises à jour techniques récentes

### Avril 2026

Optimisations et simplifications importantes, sans modification fonctionnelle volontaire :

- lazy-loading des pages au niveau des routes
- lazy-loading de `GlobalSearch`, de l’UI PWA et du `ReloadPrompt`
- amélioration du chargement initial du frontend
- harmonisation responsive et transitions
- extraction progressive de helpers, types et utilitaires depuis les grosses pages frontend
- simplification backend par extraction de services métier, services de requête et helpers communs
- centralisation de pagination, validation et accès Prisma
- nettoyage de fichiers obsolètes et rationalisation de la documentation
- validation continue via builds backend/webapp et rebuilds Docker

### Décembre 2025

Travail initial de stabilisation et d’allègement :

- centralisation des types TypeScript
- amélioration de la vue technicien
- nettoyage de logs de debug et de code mort
- correction de problèmes de typage et de robustesse
- validation du build de production

## Structure de données

Principales entités :

- `clients`
- `techniciens`
- `interventions`
- `stock`
- `equipments`

## Notes

- Le projet a été optimisé progressivement par petites passes sûres, avec validation régulière.
- Les changements récents ont été testés localement via Docker avant publication.
