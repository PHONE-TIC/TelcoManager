# Guide de Déploiement - TelcoManager

Ce guide vous explique comment déployer l'application complète (Base de données + Backend + Frontend/PWA) sur votre serveur ou machine locale en utilisant Docker.

## Prérequis

- **Docker** et **Docker Compose** doivent être installés sur la machine.
  - [Installer Docker Desktop (Windows/Mac)](https://www.docker.com/products/docker-desktop/)
  - [Installer Docker Engine (Linux)](https://docs.docker.com/engine/install/)

## Installation Rapide

1. **Ouvrez un terminal** dans le dossier racine du projet.

2. **Lancez le déploiement** avec la commande suivante :
   ```bash
   docker-compose up -d --build
   ```
   *Note : Avec les versions récentes de Docker, la commande peut être `docker compose up -d --build` (sans tiret).*

   *Cette commande va :*
   - Construire les images pour le Backend et le Frontend.
   - Télécharger l'image PostgreSQL.
   - Créer le réseau et les volumes.
   - Démarrer tous les services en arrière-plan.

3. **Accédez à l'application** :
   - **Application Web** : [http://localhost](http://localhost) (Port 80)
   - **API Backend** : [http://localhost:3002](http://localhost:3002)

## 🔐 Identifiants par défaut

Lors du premier démarrage, un compte administrateur est créé automatiquement :

- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

*Note : D'autres comptes de démonstration (jdupont, mmartin, pdurand) sont également créés avec le mot de passe `tech123`.*


## Commandes Utiles

- **Arrêter l'application** :
  ```bash
  docker-compose down
  ```

- **Voir les logs (en direct)** :
  ```bash
  docker-compose logs -f
  ```

- **Redémarrer un service (ex: backend)** :
  ```bash
  docker-compose restart backend
  ```

## Configuration (Optionnel)

Les paramètres par défaut sont définis dans `docker-compose.yml`. Vous pouvez modifier les variables d'environnement si nécessaire (ex: mot de passe base de données).

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `postgres` |
| `DB_NAME` | Nom de la base de données | `stock_intervention` |
| `JWT_SECRET` | Secret pour les tokens JWT | `supersecretkey` |

## Dépannage

Si l'application ne démarre pas correctement :
1. Vérifiez que le port **80** n'est pas utilisé.
   *Note :* 
   - Le port de l'API a été changé à **3002** pour éviter les conflits.
   - Le port de la base de données a été changé à **5433**.
2. Consultez les logs avec `docker-compose logs backend`.
   - Si vous voyez une erreur `502 Bad Gateway`, c'est souvent que le backend n'a pas fini de démarrer. Attendez quelques secondes et rafraichissez.
   - Si le backend a crashé (problème de DB), relancez-le avec `docker-compose restart backend`.
