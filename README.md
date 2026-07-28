# 📊 TelcoManager

[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue?style=flat-square)](https://github.com/PHONE-TIC/TelcoManager)
[![Docker Build](https://img.shields.io/badge/Docker-Compatible-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/phonetic76/telcomanager-app)
[![CI](https://github.com/PHONE-TIC/TelcoManager/actions/workflows/ci.yml/badge.svg)](https://github.com/PHONE-TIC/TelcoManager/actions/workflows/ci.yml)
[![CD](https://github.com/PHONE-TIC/TelcoManager/actions/workflows/cd.yml/badge.svg)](https://github.com/PHONE-TIC/TelcoManager/actions/workflows/cd.yml)

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
- **Zero-Trust Architecture** : Modèle de permission strict (Default-Deny) bloquant par défaut tout accès non explicite. Le rôle et l'état d'activation sont relus en base à chaque requête : une désactivation de compte ou une rétrogradation prend effet immédiatement, sans attendre l'expiration du jeton déjà distribué.
- **Garde-fous de Production** : Blocage immédiat de l'application si l'environnement de production utilise des secrets faibles ou par défaut.
- **Politique de Contenu Stricte (CSP)** : Le build de production ne contenant aucun script inline, la politique interdit `unsafe-inline` et `unsafe-eval` sur les scripts. Les autorisations conservées répondent à des besoins réels (`data:` et `blob:` pour les codes-barres, QR codes et signatures ; workers `blob:` pour les scanners).
- **Jetons hors des URL** : Le jeton de session ne circule que par l'en-tête `Authorization`. Les flux temps réel, qui ne peuvent pas en émettre, s'authentifient par un ticket dédié valable 30 secondes et sans pouvoir d'écriture — les deux types de jetons ne sont pas interchangeables.
- **Limitation de Débit** : Plafond strict sur l'authentification (15 tentatives / 15 min) doublé d'un plafond général sur l'ensemble de l'API.
- **Reverse Proxy Caddy** : Certificats TLS/SSL gérés automatiquement par Let's Encrypt & ZeroSSL, supportant le challenge `DNS-01` via DuckDNS pour les environnements non exposés publiquement.
- **Pipeline CI/CD Robuste** : Workflows GitHub Actions exécutant lint, typage, builds de production et trois suites de tests — unitaires backend, unitaires frontend, et intégration backend sur un PostgreSQL éphémère. Le déploiement d'images n'est déclenché que par la branche `main`.

---

## 🏗️ Architecture Technique

L'application repose sur une architecture moderne de conteneurs unifiés :

```text
telcomanager/
├── backend/              # API REST & SSE (Node.js, Express, Prisma ORM)
│   └── src/
│       ├── app.ts        # Construction de l'application Express (montable en test)
│       ├── index.ts      # Démarrage, gardes de production et arrêt gracieux
│       ├── controllers/  # Points d'entrée HTTP, découpés par domaine
│       ├── services/     # Logique métier et intégrations externes
│       ├── middleware/   # Authentification, autorisations, upload
│       └── integration/  # Tests d'intégration sur base réelle
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

### Lancer l'environnement en local (Développement / Recette)
1. **Générer et compiler les images localement** :
   ```bash
   docker compose build
   ```
2. **Démarrer les services en arrière-plan** :
   ```bash
   docker compose up -d
   ```

### Lancer en Production (serveur hôte avec stockage sous `/opt`)
Pour appliquer la configuration de production (surcharge des volumes persistants de PostgreSQL sous `/opt` et Caddyfile absolu) :
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Services exposés
- **Application Web** : [https://localhost:8081](https://localhost:8081) *(Accès HTTPS chiffré via Caddy)*
- **PostgreSQL** : Non exposé à l'extérieur par défaut pour des raisons de sécurité (uniquement accessible au sein de l'environnement conteneurisé).

### Identifiants par défaut au premier démarrage
- **Identifiant** : `admin`
- **Mot de passe** : `admin123` *(Sauf si modifié via `DEFAULT_ADMIN_PASSWORD`)*

---

## 🛠️ Développement Local

Cette section couvre le lancement **hors conteneur**, avec rechargement à chaud des deux côtés. Prérequis : Node.js 20 ou supérieur, et un PostgreSQL accessible.

### 1. Base de données de développement
Si aucune instance PostgreSQL n'est disponible localement, la plus simple est d'en lancer une dans un conteneur dédié (un port distinct de 5432 évite tout conflit avec une installation existante) :
```bash
docker run -d --name telco_dev_db -e POSTGRES_USER=stock_user -e POSTGRES_PASSWORD=stock_password -e POSTGRES_DB=stock_intervention_db -p 5433:5432 postgres:15-alpine
```
> [!NOTE]
> La commande est identique avec `podman run` pour les environnements sans Docker.

### 2. Configuration
Créez un fichier `backend/.env` (non versionné) à partir de [.env.example](.env.example). Pour la base ci-dessus :
```ini
DATABASE_URL="postgresql://stock_user:stock_password@localhost:5433/stock_intervention_db?schema=public"
NODE_ENV=development
JWT_SECRET=une-valeur-de-developpement
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```
L'API écoute sur le port `3001` (`/health` pour vérifier).

### 4. Frontend (Webapp)
```bash
cd webapp
npm install
npm run dev
```
L'interface est servie sur le port `3000` et relaie `/api` et `/uploads` vers le backend — aucune configuration CORS supplémentaire n'est requise.

Identifiants issus du seed : `admin` / `admin123`.

### 5. Exécution des tests

**Tests unitaires** — aucune base requise, les accès Prisma et les appels réseau sont simulés :
```bash
cd backend && npm test    # services métier : stock, numéros de série, verrous, inventaire, comptes
cd webapp  && npm test    # file d'attente hors-ligne, brouillon de clôture, utilitaires, PDF
```

**Tests d'intégration backend** — montent l'application Express complète contre une véritable base PostgreSQL, et couvrent ce que les tests unitaires ne peuvent pas voir : routage, validation, middlewares d'autorisation et contraintes réelles de la base.
```bash
cd backend && npm run test:integration
```

Ces tests visent par défaut la base `telcomanager_test`, à créer une fois :
```bash
docker exec telco_dev_db psql -U stock_user -d postgres -c "CREATE DATABASE telcomanager_test;"
```

> [!WARNING]
> La base ciblée est **vidée entre chaque cas de test**. Un garde-fou refuse toute `DATABASE_URL` dont le nom de base ne contient pas « test », afin d'écarter tout risque d'effacer une base de développement ou de production.

> [!TIP]
> `npm test` démarre en mode surveillance. Ajoutez `-- --run` pour une exécution unique, comme le fait la CI.

---

## 🌿 Modèle de Branches

| Branche | Rôle | Effet sur les pipelines |
| --- | --- | --- |
| `develop` | Intégration et recette des évolutions. | CI complète (lint, typage, build, tests). **Aucune image publiée.** |
| `main` | Production. | CI complète, puis CD : construction et publication des images Docker. |

Toute évolution est intégrée et validée sur `develop`, puis fusionnée dans `main` lorsqu'elle est prête à être déployée. Le workflow CD étant conditionné à la branche `main`, aucun travail en cours sur `develop` ne peut atteindre la production par inadvertance.

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
| `ALLOWED_ORIGINS` | Liste d'origines CORS autorisées séparées par des virgules (ex: `https://app.mon-domaine.fr`). | **Requis en production (Bloquant)** |

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
L'index d'unicité partielle porte sur `upper(trim(numero_serie))` dans la table `stock` (les chaînes vides sont exclues) : il est donc insensible à la casse **et** aux espaces parasites. Si des doublons existent dans vos données historiques, la migration échoue proprement avec le code d'erreur `DB_PREFLIGHT_FAIL`, en énumérant les numéros en conflit.

> [!IMPORTANT]
> **REQUÊTE D'IDENTIFICATION DES DOUBLONS**
> Connectez-vous à PostgreSQL et exécutez la requête suivante pour lister les conflits de numéros de série :
> ```sql
> SELECT upper(trim(numero_serie)) AS serial, count(*), string_agg(nom_materiel, ', ') AS materiels
> FROM stock
> WHERE trim(numero_serie) <> ''
> GROUP BY upper(trim(numero_serie))
> HAVING count(*) > 1;
> ```

> [!NOTE]
> Le préflight ne fusionne et ne supprime jamais de lignes automatiquement : l'arbitrage entre deux doublons est une décision métier qui revient à l'exploitant.

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
<summary><b>⚡ Version 5.4 (Juillet 2026) - Optimisation de la charge utile, des requêtes et du poids client</b></summary>

Chaque gain annoncé ci-dessous a été mesuré avant et après correction, sur des volumes réalistes.

- **Charge utile des listes divisée par 25** : les vues de liste renvoyaient toutes les colonnes des interventions, dont `signature` et `signatureTechnicien` — des images manuscrites encodées en base64, jamais affichées ailleurs que sur la fiche détaillée. Elles représentaient **94 % de la charge utile**. Une page passe de 60,5 kB à 2,6 kB sur le jeu mesuré ; le tableau de bord, qui charge jusqu'à 1000 interventions, était le plus exposé. Décisif pour les techniciens en mobilité.
- **Notifications filtrées en base** : le centre de notifications d'un technicien chargeait les 200 dernières notifications tous destinataires confondus, puis les filtrait en mémoire. Au-delà de ce volume, un technicien cessait de voir les siennes dès que celles de ses collègues saturaient la fenêtre — un défaut fonctionnel autant qu'une inefficacité. Le filtrage s'effectue désormais dans la requête.
- **Deux index de lecture ciblés** : mesurés sur 30 000 notifications réparties entre 50 techniciens — notifications d'un technicien 7,4 ms → 0,9 ms, alertes de supervision 10,3 ms → 0,06 ms. Ces index sont partiels et portés par une migration, le schéma Prisma ne sachant exprimer ni les conditions partielles ni les index sur expression JSON.
- **Requêtes N+1 supprimées** : le flux SSE des verrous interrogeait la base une fois par verrou actif, à chaque ouverture de flux donc à chaque connexion d'utilisateur ; les noms sont désormais résolus en une requête. La finalisation d'inventaire écrivait une mise à jour par article, séquentiellement dans une transaction — les articles sont regroupés par quantité constatée, ce qui ramène des centaines de requêtes à quelques-unes.
- **Moment.js remplacé par Day.js** : bibliothèque en maintenance depuis plusieurs années, elle pesait 19,2 kB gzip contre 5,7 kB pour la configuration Day.js équivalente. Plusieurs modules importaient d'ailleurs `moment` brut sans la locale française ; tout passe désormais par une configuration unique.

> [!NOTE]
> Deux index initialement envisagés — sur le statut d'intervention et sur le type de notification — ont été **retirés après mesure** : PostgreSQL ne les utilisait pas, l'index de date existant suffisant. Un index inutile coûte à chaque écriture.
</details>

<details>
<summary><b>🛡️ Version 5.3 (Juillet 2026) - Tests d'intégration, durcissement et découpage des gros modules</b></summary>

- **Tests d'intégration sur base réelle (49 cas)** : toute la suite existante simulait les accès Prisma ; rien ne vérifiait le contrat HTTP réel. L'application Express complète est désormais montée contre un PostgreSQL dédié, vidé entre chaque cas. Sont verrouillés : le cloisonnement des interventions par technicien, l'anti-escalade de privilèges, la révocation immédiate d'une session (désactivation, suppression, rétrogradation de rôle) et la validation des entrées. Un garde-fou refuse toute base dont le nom ne contient pas « test ». Nouveau job CI avec service PostgreSQL éphémère.
- **Erreur 500 corrigée** : créer une intervention avec un `clientId` inexistant renvoyait une erreur serveur, la violation de clé étrangère PostgreSQL remontant telle quelle. Les références sont vérifiées avant écriture et le refus est désormais explicite. Ce défaut, invisible aux tests simulés, a été révélé par les tests d'intégration.
- **Politique de contenu stricte** : `helmet` était monté avec `contentSecurityPolicy: false`, laissant l'application sans protection contre l'injection de scripts. La CSP appliquée interdit `unsafe-inline` et `unsafe-eval`, et a été validée dans un navigateur sur l'ensemble des écrans du frontend de production.
- **Jeton de session sorti des URL** : le JWT était accepté en paramètre d'URL — contournement nécessaire pour `EventSource` — et se retrouvait dans les journaux d'accès du proxy et l'historique du navigateur, pour 24 heures de validité. Les flux SSE s'authentifient désormais par un ticket éphémère de 30 secondes, non interchangeable avec le jeton de session.
- **Plafond général de l'API** : seul `/api/auth/login` était limité ; l'ensemble de `/api` dispose maintenant d'un plafond bornant l'usage automatisé abusif.
- **Services métier couverts (111 tests unitaires)** : 13 des 18 services backend n'avaient aucun test, dont `intervention-equipment` — précisément le service corrigé en 5.2, dont la correction n'était validée que manuellement. Sont désormais couverts l'expiration des verrous d'édition, le périmètre des sessions d'inventaire, et le hachage des mots de passe.
- **Contrôleur d'interventions découpé** : 923 lignes et cinq responsabilités réparties en quatre modules (cycle de vie, déroulé terrain, verrous, pièces jointes), sans changement fonctionnel.
- **Brouillon de clôture centralisé** : sa sérialisation était recopiée à sept endroits de la vue technicien ; ajouter un champ au formulaire imposait de modifier ces sept endroits, et en oublier un faisait perdre des données relevées en clientèle. La logique est réunie dans un module unique, testé et durci contre un stockage saturé ou corrompu.
</details>

<details>
<summary><b>🧹 Version 5.2 (Juillet 2026) - Intégrité des données de stock, tests frontend & résorption de la dette</b></summary>

- **Doublons de numéros de série corrigés (dette C3)** : le flux de retrait d'intervention insérait le numéro de série brut, sans la normalisation appliquée par le flux stock. Deux saisies du même matériel physique (`"  sn123  "` et `"SN123"`) créaient deux lignes de stock, dont l'une restait invisible aux recherches par numéro de série. Un helper `normalizeSerialNumber` centralisé est désormais appliqué à tous les flux d'écriture, et l'index unique porte sur `upper(trim(numero_serie))` — il n'est donc plus contournable par des espaces parasites, y compris en écriture SQL directe.
- **Passage en stock HS fiabilisé (dette C2)** : l'opération enchaînait lecture, décrémentation et création hors transaction ; une coupure en cours d'exécution décrémentait le stock courant sans créditer le HS, faisant disparaître du matériel. L'ensemble est encapsulé dans une transaction Prisma. Un article sérialisé bascule désormais sa ligne d'origine en HS — ce qui conserve son numéro de série et ses attributs (marque, modèle, fournisseur), auparavant perdus — et le déplacement partiel d'un article sérialisé est refusé. Ce flux journalise enfin un `stockMovement`, jusqu'ici absent.
- **Suite de tests frontend créée (0 → 65 tests)** : l'outillage (Vitest, Testing Library, jsdom) était installé mais aucun test n'existait et la CI ne les exécutait pas. Les cas couvrent la file d'attente hors-ligne — dont la garantie qu'un échec de synchronisation conserve la clôture au lieu de la perdre —, les règles d'édition par rôle, les écarts d'inventaire, le formatage des dates en heure locale et la génération des PDF. La CI lance désormais les tests des deux côtés.
- **Tests backend renforcés (31 → 50 tests)** : couverture de non-régression sur la normalisation des numéros de série et sur l'ensemble des branches du passage en stock HS.
- **Service Worker unifié (dette C1)** : trois mécanismes d'enregistrement concurrents coexistaient et se faisaient concurrence selon le mode de build, rendant les notifications push instables. Seul le hook `useRegisterSW` de `vite-plugin-pwa` est conservé.
- **Code mort supprimé (dette C5)** : les méthodes d'API d'inventaire `startInventorySession`, `addToInventorySession` et `finishInventorySession` étaient inutilisées et pointaient vers des routes backend inexistantes.
- **Seed exécutable hors conteneur** : `npm run seed` échouait faute de chargement de `dotenv`. Le doublon `seed.ts` est supprimé au profit du seul `seed.js`, celui qu'exécute réellement `start.sh`.
- **Dépendances assainies** : backend de 18 vulnérabilités à **0** (`ts-node-dev`, non maintenu, remplacé par `tsx`) ; webapp de 28 à 18, dont **aucune critique**, et de 9 à 2 sur le seul périmètre de production (`jspdf` porté en 4.2.1, `vite-plugin-pwa` reclassé en dépendance de développement). Les deux vulnérabilités résiduelles concernent le mode RSC de `react-router`, non utilisé par cette application.
</details>

<details>
<summary><b>🩹 Version 5.1 (Juin 2026) - Correction de l'affichage des clients lors de la création d'interventions</b></summary>

- **Résolution de la pagination des clients** : Augmentation de la limite de récupération à 1000 clients et 1000 techniciens dans le formulaire de planification des interventions (`Interventions.tsx`), corrigeant le dysfonctionnement où les clients au-delà du 20ème (limite par défaut du backend) ne s'affichaient pas.
</details>

<details>
<summary><b>🚀 Version 5.0 (Mai 2026) - Durcissement, Sécurisation & Portabilité</b></summary>

- **Portabilité & Déploiement Docker** : Remplacement des répertoires absolus `/opt` par un volume Docker nommé `db_data` et un montage de configuration relatif `./Caddyfile` pour assurer une reproductibilité instantanée en local sur `localhost`. Neutralisation par défaut du défi DNS DuckDNS, et création d'un fichier de surcharge de production `docker-compose.prod.yml` dédié à l'hébergement réel.
- **Audit d'Activité Strict (`performedById`)** : Rectification complète de la traçabilité des mouvements de stock dans les véhicules de techniciens. L'identifiant de l'utilisateur connecté effectuant l'action (`performedById`) est désormais rigoureusement capturé par les contrôleurs et propagé aux services métier. Les actions administratives de transfert ou de modification sur le stock d'un tiers sont ainsi créditées à l'exécuteur réel et non au propriétaire du véhicule.
- **Validation Stricte d'Import CSV** : Durcissement du parseur en rejetant individuellement les lignes de quantité invalides, négatives, décimales ou manquantes, et les seuils d'alerte erronés avec rapports d'erreur précis par ligne. Normalisation automatique des numéros de série en majuscules.
- **Sécurisation de la Route `/auth/me`** : Association du middleware de session anti-zombie `authenticate` sur la route `/me`, garantissant le blocage HTTP 403 immédiat de toute session appartenant à un utilisateur dont le compte a été marqué désactivé.
- **Durcissement des CORS de Production** : Interdiction d'exposer l'application avec un CORS wildcard `*` en production ; le serveur s'arrête avec un code d'erreur fatal au boot si la variable d'environnement `ALLOWED_ORIGINS` est absente ou vide. Fallback d'origines explicites (`localhost`) en mode développement.
- **Durcissement des Typecastings & Gardes Express** : Injection de validateurs `.toInt()` / `.toBoolean()` sur toutes les routes d'interventions et de stocks, remplacement des replis `||` erronés et intégration de gardes d'assertion de quantité strictes dans les services métier.
- **Suite de Tests Unitaires validée (31 tests verts)** : Ajout de nouveaux cas de tests unitaires et d'intégration validant le comportement de la route `/me` pour les inactifs, les politiques de CORS et la résistance aux CSV malformés, portant la couverture à 31 tests.
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
