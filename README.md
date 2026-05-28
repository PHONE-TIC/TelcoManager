# 📊 TelcoManager

[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue?style=flat-square)](https://github.com/PHONE-TIC/TelcoManager)
[![Docker Build](https://img.shields.io/badge/Docker-Compatible-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/phonetic76/telcomanager-app)
[![CI status](https://img.shields.io/badge/CI-Passed-success?logo=github-actions&logoColor=white)](https://github.com/PHONE-TIC/TelcoManager/actions)
[![CD status](https://img.shields.io/badge/CD-Deployed-success?logo=github-actions&logoColor=white)](https://github.com/PHONE-TIC/TelcoManager/actions)

**TelcoManager** est une application web d'entreprise conçue pour le suivi en temps réel des stocks, des interventions techniques, des techniciens et des inventaires. L'application intègre une architecture conteneurisée robuste et sécurisée avec base PostgreSQL et serveur inverse HTTPS automatisé.

---

## 🚀 Fonctionnalités Clés

### 💻 Interface & Logique Métier
- **Tableau de Bord Premium** : Statistiques consolidées, indicateurs clés de performance (KPI) compactés et raccourcis d'accès rapide.
- **Gestion des Interventions** : Planification, suivi, signatures électroniques, et chargement de pièces jointes.
- **Gestion de Stock & Matériels** : Distinction claire entre stock courant (utilisable) et stock HS (défectueux). Transferts sécurisés.
- **Module d'Inventaire Avancé** : Mode scan en rafale (batch scanning), retours sonores (Web Audio API) et vibrations (haptique) pour fluidifier les saisies. Exportation automatique des écarts d'inventaire au format PDF.
- **Recherche Globale Intelligente** : Moteur de recherche unifié indexant les principales entités (clients, interventions, matériels).
- **Centre de Notifications & Alertes** : Système in-app dynamique avec cloche, badges de lecture, toasts animés et surveillance continue des liens IP (Watcher et alertes de déconnexion).
- **Mode Hors-ligne Unifié** : File d'attente robuste (`offlineSync.ts`) stockant localement les actions (y compris la validation et la clôture d'interventions avec photos sérialisées en base64) puis resynchronisation automatique au retour du réseau.
- **Authentification Sécurisée** : Connexion par jeton JWT avec tolérance aux espaces accidentels (trim automatique).

### 🛡️ Sécurité & DevOps
- **Zero-Trust Architecture** : Modèle de permission strict (Default-Deny) bloquant par défaut tout accès non explicite.
- **Garde-fous de Production** : Blocage immédiat de l'application si l'environnement de production utilise des secrets faibles ou par défaut.
- **Reverse Proxy Caddy** : Certificats TLS/SSL gérés automatiquement par Let's Encrypt & ZeroSSL, supportant le challenge `DNS-01` via DuckDNS pour les environnements non exposés publiquement.
- **Pipeline CI/CD Robuste** : Workflows GitHub Actions pour exécuter la suite de tests et compiler les builds de production de manière sécurisée.

---

## 🏗️ Architecture Technique

L'application repose sur une architecture moderne de conteneurs unifiés :

```text
telcomanager/
├── backend/              # API REST & SSE (Node.js, Express, Prisma ORM)
├── webapp/               # Frontend Single Page App (React, Vite, PWA)
├── postgres/             # Scripts d'initialisation et structures PostgreSQL
├── Caddyfile             # Configuration du proxy inverse Caddy (HTTP/2, HTTPS & compression)
├── Dockerfile.caddy      # Image Caddy personnalisée compilée avec le module DuckDNS
├── Dockerfile.combined   # Image de production combinée (Multi-stage build)
├── docker-compose.yml    # Fichier d'orchestration multi-services
└── publish-docker.sh     # Script utilitaire de publication sur Docker Hub
```

### 🔍 Focus sur l'Infrastructure

1. **Build de Production Combiné (`Dockerfile.combined`)** :
   - Compile en amont les ressources statiques du frontend React dans `/app/client`.
   - Lance le serveur d'API Express (Node.js) qui sert également les fichiers statiques de façon performante et hermétique.
   - Les dépendances de développement, outils de test et codes sources non transpilés sont exclus de l'image de production.
2. **Base de Données & ORM (PostgreSQL & Prisma)** :
   - PostgreSQL 15 héberge les données de manière persistante.
   - L'ORM **Prisma** gère le typage statique de bout en bout et applique automatiquement les migrations de schéma SQL à chaque démarrage du conteneur applicatif via le script d'entrée `start.sh`.
3. **Sécurisation Réseau Caddy & En-têtes HTTP** :
   - Compression à la volée via les algorithmes Zstd et Gzip.
   - Forçage strict du protocole chiffré via *HSTS* (Strict-Transport-Security).
   - En-têtes de durcissement activés par défaut : *X-Frame-Options* (anti-clickjacking), *X-Content-Type-Options* (anti-sniffing), et *X-XSS-Protection*.

---

## ⚡ Démarrage Rapide (Docker)

### Prérequis
- Docker
- Docker Compose

### Lancer l'environnement de production local
1. **Générer et compiler les images localement** :
   ```bash
   docker compose build
   ```
2. **Démarrer les services en arrière-plan** :
   ```bash
   docker compose up -d
   ```

### Services exposés
- **Application Web** : [https://localhost:8081](https://localhost:8081) *(Accès HTTPS chiffré via Caddy)*
- **PostgreSQL** : Non exposé à l'extérieur par défaut pour des raisons de sécurité (uniquement accessible au sein de l'environnement conteneurisé).

### Identifiants par défaut au premier démarrage
- **Identifiant** : `admin`
- **Mot de passe** : `admin123` *(Sauf si modifié via `DEFAULT_ADMIN_PASSWORD`)*

---

## 🛠️ Développement Local

### Installation & Lancement du Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Installation & Lancement du Frontend (Webapp)
```bash
cd webapp
npm install
npm run dev
```

### Exécution des Tests Unitaires & Intégration (Backend)
```bash
cd backend
npm test
```

---

## 📋 Variables d'Environnement

L'ensemble des configurations s'effectue via des variables d'environnement déclarées dans le fichier `.env` à la racine (voir modèle dans [.env.example](.env.example)) :

### 🔑 Configuration Générale & Sécurité
| Variable | Description | Valeur par défaut / Recommandation |
| --- | --- | --- |
| `JWT_SECRET` | Secret de signature des jetons de session JWT. | **Requis (Doit être fort en prod)** |
| `DEFAULT_ADMIN_PASSWORD` | Mot de passe du compte administrateur initial (`admin`). | **Requis (Doit être fort en prod)** |
| `SEED_ON_START` | Force la réinitialisation du mot de passe admin au boot si `true`. | `false` |
| `RUN_SCHEMA_RECOVERY` | Active le mode de restauration défensive du schéma (voir section Maintenance). | `false` |

### 📂 Base de Données (PostgreSQL)
| Variable | Description |
| --- | --- |
| `DB_USER` | Identifiant de connexion PostgreSQL. |
| `DB_PASSWORD` | Mot de passe de connexion PostgreSQL. |
| `DB_NAME` | Nom de la base de données. |

### 📧 Synchronisation Outlook (Microsoft Graph)
| Variable | Description |
| --- | --- |
| `OUTLOOK_TENANT_ID` | ID de l'annuaire (Tenant) Azure AD / Microsoft Entra. |
| `OUTLOOK_CLIENT_ID` | ID d'application (Client) enregistré dans Azure AD. |
| `OUTLOOK_CLIENT_SECRET` | Secret client généré pour l'application Azure AD. |
| `OUTLOOK_SHARED_CALENDAR_EMAIL` | Adresse e-mail du calendrier partagé Microsoft 365. |

### 🔔 Notifications Push (Web Push / VAPID)
| Variable | Description |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Clé publique de chiffrement Web Push. |
| `VAPID_PRIVATE_KEY` | Clé privée de chiffrement Web Push. |
| `VAPID_SUBJECT` | E-mail de contact ou URI enregistré auprès des serveurs Push. |

### 📡 Intégrations API Externes
| Variable | Description |
| --- | --- |
| `UNYC_BASE_URL` / `UNYC_IAM_URL` | Points d'accès de l'API UNYC et de son module d'authentification. |
| `UNYC_CLIENT_ID` / `UNYC_USERNAME` / `UNYC_PASSWORD` | Identifiants d'accès partenaires pour l'API UNYC. |
| `ATLAS_IP_LINKS_URL` | URL de synchronisation des fiches de liens IP du portail Atlas. |
| `ATLAS_USERNAME` / `ATLAS_PASSWORD` / `ATLAS_TOTP_URI` | Identifiants et clé TOTP brute (MFA) de l'agent Atlas. |

---

## 📅 Synchronisation Outlook (Microsoft Entra ID)

Pour connecter l'application à un calendrier d'équipe ou de technicien partagé Microsoft 365, configurez votre portail Microsoft Entra ID :

1. **Enregistrement de l'Application** :
   - Rendez-vous sur le [Portail Microsoft Entra ID](https://entra.microsoft.com/).
   - Enregistrez une nouvelle application (*Single Tenant*), en laissant l'URL de redirection vide.
2. **Attribution des Permissions** :
   - Ajoutez l'autorisation d'application **`Calendars.ReadWrite`** dans Microsoft Graph.
   - **CRITICAL** : Cliquez impérativement sur **Accorder un consentement d'administrateur** pour valider les accès.
3. **Création du Secret** :
   - Créez un nouveau secret client dans *Certificats & secrets*.
   - Copiez immédiatement sa valeur (elle sera masquée par la suite) et affectez-la à `OUTLOOK_CLIENT_SECRET`.
4. **Configuration du Calendrier** :
   - L'adresse email fournie dans `OUTLOOK_SHARED_CALENDAR_EMAIL` doit correspondre à une boîte ou un calendrier partagé valide sur le même Tenant.

---

## 🛡️ Maintenance & Résolution des Conflits de Base

### 1. Gestion des Doublons de Numéros de Série (Préflight de Migration)
La migration d'unicité partielle des numéros de série applique un index unique insensible à la casse sur la colonne `numero_serie` de la table `stock` (excluant les chaînes vides). Si des doublons existent dans vos données historiques, la migration échouera proprement avec le code d'erreur `DB_PREFLIGHT_FAIL`.

> [!IMPORTANT]
> **REQUÊTE D'IDENTIFICATION DES DOUBLONS**
> Connectez-vous à PostgreSQL et exécutez la requête suivante pour lister les conflits de numéros de série :
> ```sql
> SELECT lower(numero_serie) AS serial, count(*), string_agg(nom_materiel, ', ') AS materiels
> FROM stock
> WHERE numero_serie <> ''
> GROUP BY lower(numero_serie)
> HAVING count(*) > 1;
> ```

#### Stratégies de nettoyage manuel :
- **Normalisation** : Corrigez les numéros de série mal saisis ou erronés.
- **Fusion** : Regroupez les quantités sur une seule ligne et supprimez la ligne en doublon :
  ```sql
  -- Exemple : Fusionner la quantité de l'ID doublon B sur l'ID doublon A
  UPDATE stock SET quantite = quantite + (SELECT quantite FROM stock WHERE id = 'ID_DOUBLON_B') WHERE id = 'ID_DOUBLON_A';
  DELETE FROM stock WHERE id = 'ID_DOUBLON_B';
  ```

### 2. Importation de Stocks par CSV (Validation & Normalisation)
Le système d'importation en masse par CSV a été renforcé pour assurer la robustesse des écritures :
- **Majuscules & Nettoyage** : Les numéros de série importés subissent systématiquement un `.trim().toUpperCase()` pour correspondre à la saisie manuelle.
- **Détection des Doublons de Fichier** : Le parser analyse les données *à l'intérieur du fichier d'importation* avant toute transaction. Si un numéro de série est dupliqué au sein du CSV, la ligne en faute est rejetée avec un message explicite (ex: `Numéro de série doublon détecté dans le fichier d'import : SN-DUPLICATE-2`), sans bloquer le reste de l'importation.
- **Traitement des Collisions en Base** : Les violations d'unicité PostgreSQL (`P2002`) sont capturées pour renvoyer une erreur explicite d'utilisation du numéro de série.

### 3. Récupération Globale du Schéma (Compteurs à 0 / Colonnes manquantes)
Si vos compteurs de tableau de bord restent bloqués à `0` ou que le backend signale des colonnes manquantes (en raison d'un état hérité de votre base) :

> [!TIP]
> **PROCÉDURE DE RÉCUPÉRATION DU SCHÉMA**
> 1. Définissez temporairement `RUN_SCHEMA_RECOVERY=true` dans l'environnement du conteneur applicatif.
> 2. Redémarrez le conteneur. Au boot, le script sécurisé `fix-enums.js` sera invoqué pour recréer proprement les énumérations SQL natives, ajouter les colonnes manquantes (telles que `outlook_event_id`), et restaurer les états de stock par défaut.
> 3. Une fois l'opération accomplie avec succès, repassez la variable à `false` ou supprimez-la pour sécuriser l'environnement.

---

## 📈 Historique des Évolutions Techniques

<details>
<summary><b>🚀 Version 5.0 (Mai 2026) - Durcissement de l'Audit & Traçabilité</b></summary>

- **Audit d'Activité Strict (`performedById`)** : Rectification complète de la traçabilité des mouvements de stock dans les véhicules de techniciens. L'identifiant de l'utilisateur connecté effectuant l'action (`performedById`) est désormais rigoureusement capturé par les contrôleurs et propagé aux services métier. Les actions administratives de transfert ou de modification sur le stock d'un tiers sont ainsi créditées à l'exécuteur réel et non au propriétaire du véhicule.
- **Pré-validation & Durcissement CSV** : Normalisation automatique (`.trim().toUpperCase()`) des numéros de série importés. Pré-validation interne des doublons au sein du fichier CSV avec rapports d'erreur précis par ligne, permettant d'ignorer les erreurs isolées sans corrompre la transaction globale.
- **Validation Stricte Express** : Injection forcée de conversions de types `.toInt()` sur les validateurs de quantité de stock véhicule, évitant toute discordance de type à l'exécution de la logique métier.
- **Suite de Tests Unitaires Enrichie** : Ajout de tests unitaires ciblés sur les règles d'audit, la normalisation CSV et la gestion des doublons (la suite passe à 27 tests entièrement verts).
</details>

<details>
<summary><b>🔒 Version 4.0 (Mai 2026) - Audit de Sécurité Global V3 & Zéro Défaut ESLint</b></summary>

- **Migrations Relationnelles Versionnées** : Transition finale de `db push` vers un modèle de migrations PostgreSQL robustes, avec mise en place d'un baselining étanche pour les nouvelles bases de données.
- **Index d'Unicité Sécurisé** : Index unique insensible à la casse sur `numero_serie` (ignorant les chaînes vides) avec garde PL/pgSQL stricte détectant et bloquant les doublons existants avant l'application de la migration.
- **Prepared Statements & Résolution 502** : Regroupement des requêtes DDL dans des blocs transactionnels PL/pgSQL natifs (`DO $$ BEGIN ... END$$;`), contournant la limitation PostgreSQL sur les requêtes préparées Prisma multiples.
- **Express Sécurisé par Défaut** : Branchement de `helmet` pour la protection des en-têtes et d'un rate-limiter strict sur l'accès authentifié (`/api/auth/login`), limité à 15 tentatives par 15 minutes.
- **Authentification & JWT Hardened** : Crash volontaire au démarrage si le secret JWT reste défini sur la clé faible par défaut en production. Contrôle en temps réel (Middleware anti-zombie) de l'activation des comptes utilisateurs à chaque requête.
- **Téléchargement Sécurisé des Pièces Jointes** : Remplacement des URL statiques d'upload publiques par des flux binaires Blob authentifiés, avec création et révocation dynamique d'URL d'objets pour éliminer les fuites de mémoire.
- **Cloisonnement Strict Technicien** : Refonte de `requireInterventionAccess` appliquant un modèle de permission strict (Default-Deny). Blocage des techniciens sur le périmètre exclusif de leurs interventions assignées.
- **Zéro Erreur ESLint (0 erreur, 0 warning)** : Nettoyage complet des cycles de re-rendu dans React (contexts isolés, timers asynchrones pour les mises à jour d'états dans les effets, typage TypeScript strict sans recours à `any`).
- **Pipeline CD Verrouillé** : Intégration de verrous TypeScript, Lint et Tests dans GitHub Actions, forçant la validation stricte de la CI avant le déploiement.
</details>

<details>
<summary><b>📦 Version 3.0 (Avril 2026) - Performance, Synchronisation Outlook & Mobile First</b></summary>

- **Synchronisation Outlook Calendrier** : Création d'un connecteur daemon Microsoft Graph (Client Credentials) gérant l'authentification silencieuse, le cache de jetons, et la synchronisation résiliente bidirectionnelle.
- **Verrous Collaboratifs Temps Réel** : Implémentation de verrous d'éditions d'interventions basés sur des flux d'événements Server-Sent Events (SSE).
- **Scanner Ultra-Fluide** : Mode scan en rafale avec intégration de retours haptiques (vibrations) et sonores (Web Audio API) pour fluidifier les saisies d'inventaire.
- **Optimisation des Bundles Frontend** : Division du code (code-splitting), chargement différé (lazy-loading) des routes et composants lourds (Global Search, exports PDF, graphiques de statistiques).
- **Responsivité Mobile Avancée** : Intégration de la vue planning sous forme de timeline agenda (`MobilePlanning`) adaptée aux petits écrans et ajustements de l'ensemble des formulaires d'intervention.
</details>

<details>
<summary><b>🛠️ Version 2.0 (Décembre 2025) - Stabilisation & Consolidation Structurelle</b></summary>

- **Nettoyage Général** : Extraction des services de requêtes, centralisation des définitions TypeScript, suppression de l'ancien code mort et des messages de debug verbeux.
- **Prisma Transactions** : Sécurisation des écritures de mouvements de stock complexes au sein de blocs transactionnels natifs Prisma.
</details>

---

## 📝 Licence & Propriété

Ce dépôt est la propriété exclusive de **PHONE-TIC** et de ses affiliés. Toute redistribution ou utilisation non autorisée est strictement interdite.

*Développé avec ❤️ par l'équipe d'ingénierie de PHONE-TIC.*
