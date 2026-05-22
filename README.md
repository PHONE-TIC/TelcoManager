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
- Centre de notifications intégré avec badge, panneau global et fermeture contextuelle
- Alertes visuelles de déconnexion des liens IP avec toasts et notifications persistées côté interface
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

### Mai 2026

Ensemble d'améliorations majeures apportées à la robustesse, à l'expérience hors-ligne, à l'interface utilisateur et à la responsivité mobile :

- **Verrouillage Collaboratif en Temps Réel (SSE)** : Implémentation d'un système de verrous collaboratifs en temps réel via des flux SSE (Server-Sent Events) pour éviter les conflits d'édition d'interventions, avec des indicateurs visuels dynamiques sur le Dashboard.
- **Mode Rafale pour le Scanner (Batch Scanning)** : Ajout d'une option de scan en rafale pour le scanner de codes-barres avec retours sonore (Web Audio API) et tactile (Vibration) pour fluidifier les opérations d'inventaire et de stock.
- **Mode Hors-ligne & Synchronisation Automatique** : Création d'une file d'attente robuste (`offlineSync.ts`) capable de différer les actions utilisateur (y compris la validation et la clôture d'interventions avec photos sérialisées en base64) en cas de déconnexion réseau, puis de les resynchroniser silencieusement et séquentiellement dès le retour du réseau.
- **Raffinements Visuels Glassmorphic & Skeleton Loaders** : Intégration d'un composant de chargement squelette haut de gamme (`SkeletonLoader.tsx`) avec animation scintillante (shimmer) pour un chargement fluide, et application d'un flou d'arrière-plan (Glassmorphism) sur la Topbar, les modales et les overlays.
- **Auto-Réenregistrement des notifications Push** : Mécanisme d'auto-réenregistrement silencieux et de synchronisation des abonnements aux notifications Push web entre le frontend et le backend au démarrage de l'application.
- **Refonte Premium de la page de Connexion** :
  - Tolérance aux espaces accidentels lors de la saisie (trim automatique sur les champs frontend et backend, utile lors de collages depuis des gestionnaires de mots de passe).
  - Suppression du bouton de changement de thème sur l'écran de connexion pour détecter et suivre automatiquement les préférences de l'OS (`prefers-color-scheme`).
  - Interface modernisée et premium avec effets de verre dépoli (Glassmorphism), animations d'ambiance et retour haptique visuel (shake animation) sur les erreurs d'authentification.
- **Harmonisation Sidebar/Topbar** : Ajustement minutieux de la Topbar (couleurs de fond harmonisées avec la Sidebar et suppression de la bordure inférieure) pour restaurer le coin arrondi parfait entre les deux volets.
- **Optimisations de la Responsivité Mobile (Interventions)** :
  * Restructuration du JSX pour rendre le formulaire de création d'interventions entièrement visible et réactif sur mobile.
  * Activation d'une vue planning mobile optimisée sous forme de timeline agenda (`MobilePlanning`) lorsque le mode calendrier est sélectionné sur mobile, masquant proprement le grand calendrier de bureau peu adapté aux petits écrans.
  * Résolution des conflits de masquage responsif dans l'onglet "Toutes" pour permettre un accès complet et fonctionnel aux administrateurs sur mobile.

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
- harmonisation de l’écran `Supervision de liens IP` avec les autres écrans de l’application
- intégration de la supervision des liens IP directement dans le tableau de bord avec KPI dédiés et panneau des liens KO
- ajout d’un centre de notifications in-app avec cloche dans le header partagé, badge non lu, marquage lu, suppression et lien direct vers la fiche concernée
- ajout d’un watcher global de supervision des liens IP pour déclencher les notifications même hors de la page dédiée
- ajout de toasts in-app pour les changements d’état des liens IP, affichés sous la topbar en haut à droite avec animations d’entrée/sortie, barre de progression visuelle et navigation directe vers la fiche du lien
- ajout d’une page détail par lien IP (`/supervision-liens-ip/:reference`)
- remplacement global des émojis d’interface par des icônes SVG homogènes via le composant partagé `AppIcon`
- repositionnement de la recherche globale et de la cloche dans une barre commune, avec comportement modal cohérent pour la recherche et les notifications

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
