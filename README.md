# TelcoManager

TelcoManager est une application web de gestion pour le suivi des stocks, des interventions techniques, des techniciens et des inventaires, avec une base PostgreSQL et un déploiement Docker simplifié.

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

## Architecture

L’application tourne localement avec :

- un backend Node.js / Express / Prisma,
- un frontend React / Vite,
- une base PostgreSQL,
- un déploiement Docker unifié.

```text
telcomanager/
├── backend/              # API Node.js + Express + Prisma
├── webapp/               # Frontend React
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
- lazy-loading de `GlobalSearch`, des dépendances PDF à l’export, de l’UI PWA et du `ReloadPrompt`
- amélioration du chargement initial du frontend
- harmonisation responsive et transitions
- extraction progressive de helpers, types, sections et utilitaires depuis les grosses pages frontend (`Dashboard`, `Interventions`, pages détail, imports, PDF)
- optimisation finale du bundle avec allègement du dashboard, remplacement du graphe lourd par un composant natif léger et chargement différé du calendrier d’interventions
- simplification backend par extraction de services métier, services de requête et helpers communs
- dernier durcissement léger des services backend restants (`auth`, `stock-write`, `stock-movement-query`)
- ajout d’une première base de tests automatisés ciblés sur les helpers extraits du frontend
- centralisation de pagination, validation et accès Prisma
- nettoyage de fichiers obsolètes et rationalisation de la documentation
- suppression complète de l’application mobile et de l’application desktop pour recentrer le projet sur la webapp
- mise à jour du README, des guides de déploiement, de test et du guide utilisateur pour refléter une architecture web-only
- réduction progressive puis correction complète des erreurs lint frontend, avec passage final à 0 erreur et seulement quelques warnings hooks résiduels de confort si non traités dans certains états intermédiaires
- validation continue via tests frontend, lint frontend, builds backend/webapp, rebuilds Docker, push GitHub et publication DockerHub
- harmonisation visuelle globale de l’application en prenant l’écran `Interventions` comme référence de mise en page
- factorisation des styles d’écrans et d’écrans détail via des feuilles CSS communes pour éviter la duplication
- fusion des zones header + résumé/statistiques sur les écrans principaux pour gagner de la place et améliorer la lisibilité
- compactage global des compteurs et KPI pour tenir sur une seule ligne autant que possible
- amélioration de la lisibilité des actions d’interface, notamment le bouton de déconnexion en rouge et un sélecteur clair/sombre plus visible
- simplification de la vue `Interventions` pour les techniciens, limitée aux interventions du jour avec compteur dédié dans le titre

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

- Le projet est désormais centré sur la webapp pour tous les usages.
- Les changements récents ont été testés localement via Docker avant publication.
