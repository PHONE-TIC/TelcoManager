# Guide de test - TelcoManager Web

Ce guide couvre la validation de la version web de TelcoManager.

## Prérequis

- Docker et Docker Compose installés
- ou Node.js + PostgreSQL pour un lancement manuel

## Option recommandée : test via Docker

```bash
cd /home/nath-admin/.openclaw/workspace/TelcoManager
docker compose up -d --build
```

Accès local :

- application : `http://localhost:8081`
- base PostgreSQL : `localhost:5435`

## Identifiants par défaut

- `admin`
- `admin123`

## Vérifications rapides

### 1. Santé générale

- l’application charge sans erreur
- la connexion `admin / admin123` fonctionne
- le tableau de bord s’affiche

### 2. Clients

- ouvrir la page clients
- créer un client
- modifier le client
- vérifier qu’il apparaît dans la liste et dans la recherche

### 3. Techniciens

- ouvrir la page techniciens
- créer un technicien
- modifier son rôle ou ses informations
- vérifier sa présence dans la liste

### 4. Interventions

- créer une intervention
- affecter un client et un technicien
- vérifier l’affichage dans la liste
- ouvrir la fiche détail
- vérifier les statuts et actions disponibles selon le rôle

### 5. Stock

- ajouter un matériel
- vérifier son affichage dans le stock courant
- tester un déplacement vers stock HS si pertinent
- vérifier les mouvements associés

### 6. Inventaire

- démarrer une session d’inventaire
- scanner ou saisir un code-barres / numéro de série
- vérifier le comptage et les écarts
- finaliser la session

### 7. Recherche globale

- rechercher un client
- rechercher une intervention
- rechercher un article de stock

### 8. Responsive web

- vérifier l’interface en largeur desktop
- vérifier l’interface en largeur tablette/mobile dans le navigateur
- confirmer que les vues principales restent utilisables

## Vérifications techniques

### Backend

```bash
cd backend
npm run build
```

### Frontend

```bash
cd webapp
npm run build
```

### Docker

```bash
docker compose up -d --build
```

## Résultat attendu

Si tout est bon :

- backend build OK
- frontend build OK
- Docker build OK
- application accessible sur `http://localhost:8081`
- principaux workflows fonctionnels dans la webapp

## Références

- Déploiement : `docs/DEPLOYMENT.md`
- README principal : `README.md`
