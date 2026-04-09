# Guide de Test - Système de Gestion de Stock et d'Interventions

Ce guide vous permettra de tester complètement le système.

## ✅ Prérequis Vérifiés

- ✅ Node.js installé
- ✅ PostgreSQL installé (`/usr/bin/psql`)
- ✅ Dépendances backend installées (174 packages)
- ✅ Dépendances desktop installées (421 packages)
- ✅ Prisma client généré

## 🗄️ Étape 1 : Configuration de la Base de Données

### Option A : Script automatique (recommandé)

```bash
cd /path/to/TelcoManager
./setup-db.sh
```

### Option B : Commandes manuelles

```bash
# Se connecter à PostgreSQL en tant qu'utilisateur postgres
sudo -u postgres psql

# Dans le shell PostgreSQL, exécuter :
CREATE USER stock_user WITH PASSWORD 'stock_password';
CREATE DATABASE stock_intervention_db OWNER stock_user;
GRANT ALL PRIVILEGES ON DATABASE stock_intervention_db TO stock_user;
\q
```

### Vérification

```bash
# Tester la connexion
psql -h localhost -U stock_user -d stock_intervention_db -c "SELECT 1;"
# Mot de passe : stock_password
```

## 🚀 Étape 2 : Initialiser le Backend

```bash
cd backend

# Créer les tables (migrations Prisma)
npx prisma migrate dev --name init

# Insérer les données de test
npm run seed

# RÉSULTAT ATTENDU:
# ✅ Admin créé: admin
# ✅ Techniciens créés: jdupont mmartin
# ✅ Clients créés: Entreprise ABC Société XYZ
# ✅ Stock créé: Routeur Wifi Pro Switch 24 ports Caméra IP
# ✅ Interventions créées: Installation réseau Maintenance caméras
```

## 🔧 Étape 3 : Démarrer le Backend

### Terminal 1 : Backend API

```bash
cd backend
npm run dev

# RÉSULTAT ATTENDU:
# 🚀 Serveur démarré sur le port 3001
# 📍 API disponible sur http://localhost:3001
# 🏥 Health check: http://localhost:3001/health
```

### Vérification Rapide

Dans un autre terminal :

```bash
# Test de santé
curl http://localhost:3001/health

# RÉSULTAT ATTENDU:
# {"status":"ok","timestamp":"2025-12-17T..."}

# Test de login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# RÉSULTAT ATTENDU:
# {"token":"eyJhbGci...","user":{"id":"...","nom":"Administrateur","username":"admin","role":"admin"}}
```

## 💻 Étape 4 : Démarrer l'Application Desktop

### Terminal 2 : Desktop Application

```bash
cd desktop
npm run dev

# RÉSULTAT ATTENDU:
# Le serveur Vite démarre sur http://localhost:3000
# L'application Electron s'ouvre automatiquement
```

## 🧪 Étape 5 : Tests Manuels de l'Application

### Test 1 : Authentification ✅

1. L'application Electron s'ouvre sur la page de login
2. Entrer : **admin** / **admin123**
3. Cliquer sur "Se connecter"
4. ✅ Redirection vers le Dashboard

### Test 2 : Dashboard ✅

Vérifier que le Dashboard affiche :
- ✅ 2 Clients
- ✅ 2 Interventions
- ✅ Stock Courant : ~43 unités (15 + 8 + 20)
- ✅ Stock HS : 0
- ✅ Tableau "Stock par catégorie" avec Réseau et Sécurité

### Test 3 : Gestion des Clients ✅

1. Cliquer sur "👥 Clients" dans le menu
2. ✅ Voir "Entreprise ABC" et "Société XYZ"
3. Cliquer sur "+ Nouveau client"
4. Remplir le formulaire :
   - Nom : **Test Client SARL**
   - Contact : **M. Dupuis**
   - Téléphone : **06 12 34 56 78**
   - Adresse : **10 Rue Test, 75000 Paris**
5. Cliquer sur "Créer"
6. ✅ Le nouveau client apparaît dans la liste

### Test 4 : Gestion des Techniciens ✅

1. Cliquer sur "🔧 Techniciens"
2. ✅ Voir "Jean Dupont" et "Marie Martin"
3. Cliquer sur "+ Nouveau technicien"
4. Remplir :
   - Nom : **Pierre Leroy**
   - Username : **pleroy**
   - Password : **tech123**
   - Rôle : **Technicien**
5. Cliquer sur "Créer"
6. ✅ Le nouveau technicien apparaît

### Test 5 : Gestion des Interventions ✅

1. Cliquer sur "📅 Interventions"
2. ✅ Voir les 2 interventions de test
3. Cliquer sur "+ Nouvelle intervention"
4. Remplir :
   - Client : **Test Client SARL**
   - Technicien : **Pierre Leroy**
   - Titre : **Installation fibre**
   - Date planifiée : (choisir demain à 10h00)
   - Description : **Installation et configuration fibre optique**
5. Cliquer sur "Créer"
6. ✅ L'intervention apparaît avec le badge "🔵 planifiee"

### Test 6 : Gestion du Stock ✅

1. Cliquer sur "📦 Stock"
2. ✅ Voir "Routeur Wifi Pro", "Switch 24 ports", "Caméra IP"
3. Cliquer sur "+ Nouveau matériel"
4. Remplir :
   - Nom : **Patch Panel 48 ports**
   - Référence : **PP48-2024-001**
   - Code-barres : **4567890123456**
   - Catégorie : **Réseau**
   - Quantité : **3**
5. Cliquer sur "Créer"
6. ✅ Le matériel apparaît dans la liste

### Test 7 : Déplacement vers Stock HS ✅

1. Dans le Stock Courant, trouver "Routeur Wifi Pro"
2. Cliquer sur "→ Déplacer vers HS"
3. Confirmer
4. ✅ Le routeur disparaît ou sa quantité diminue
5. Cliquer sur "⚠️ Stock HS"
6. ✅ Voir le routeur dans le stock HS

### Test 8 : Module Inventaire ✅

1. Cliquer sur "🔍 Inventaire"
2. Cliquer sur "🔍 Commencer l'inventaire"
3. ✅ La session d'inventaire démarre
4. Dans le champ code-barres, entrer : **2345678901234** (Switch)
5. Appuyer sur Entrée ou cliquer "Scanner"
6. ✅ L'article s'affiche avec ses détails
7. Scanner à nouveau le même code
8. ✅ Le compteur "Nb scans" augmente
9. Scanner un autre code : **3456789012345** (Caméra)
10. Cliquer sur "Terminer la session"
11. ✅ Voir le résumé avec 2 articles différents scannés

### Test 9 : Recherche de Clients ✅

1. Retourner sur "👥 Clients"
2. Dans la barre de recherche, taper "ABC"
3. ✅ Voir uniquement "Entreprise ABC"
4. Effacer et taper "Test"
5. ✅ Voir "Test Client SARL"

### Test 10 : Déconnexion ✅

1. Cliquer sur "🚪 Déconnexion" en bas du menu
2. ✅ Retour à l'écran de login

## 📊 Tests de l'API (Optionnel)

### Test avec curl

```bash
# 1. Se connecter et récupérer le token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"

# 2. Récupérer les clients
curl -s http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Récupérer les statistiques du stock
curl -s http://localhost:3001/api/stock/stats/summary \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Récupérer les interventions
curl -s http://localhost:3001/api/interventions \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 🐛 Dépannage

### Problème : "Cannot connect to database"

```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Démarrer PostgreSQL si nécessaire
sudo systemctl start postgresql

# Vérifier que la base existe
psql -h localhost -U stock_user -d stock_intervention_db -c "SELECT 1;"
```

### Problème : "Port 3001 already in use"

```bash
# Trouver et arrêter le processus
lsof -i :3001
kill -9 <PID>
```

### Problème : "Module not found" dans le desktop

```bash
cd desktop
rm -rf node_modules package-lock.json
npm install
```

### Problème : Erreurs TypeScript dans l'éditeur

C'est normal avant `npm install`. Après l'installation, les erreurs disparaissent.

## ✅ Checklist de Validation Finale

- [ ] Backend démarre sans erreur sur le port 3001
- [ ] Health check retourne `{"status":"ok"}`
- [ ] Login API fonctionne et retourne un token
- [ ] Desktop s'ouvre et affiche la page de login
- [ ] Connexion réussie avec admin/admin123
- [ ] Dashboard affiche les statistiques correctes
- [ ] CRUD complet fonctionne sur les Clients
- [ ] CRUD complet fonctionne sur les Techniciens
- [ ] Création d'interventions fonctionne
- [ ] Ajout de matériel au stock fonctionne
- [ ] Déplacement vers stock HS fonctionne
- [ ] Module inventaire avec scan fonctionne
- [ ] Recherche clients fonctionne
- [ ] Déconnexion fonctionne

## 🎉 Résultat Attendu

Si tous les tests passent :
- ✅ **Backend** : Opérationnel avec 27 endpoints
- ✅ **Database** : 2 clients, 2 techniciens, 2 interventions, 3 articles en stock
- ✅ **Desktop** : Toutes les pages fonctionnelles avec CRUD complet
- ✅ **Authentification** : Sécurisée avec JWT
- ✅ **Inventaire** : Scan de codes-barres opérationnel

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs du backend dans le terminal
2. Vérifiez la console développeur de l'application Electron (F12)
3. Consultez le [Guide de Déploiement](docs/DEPLOYMENT.md)
4. Consultez le [Guide Utilisateur](docs/USER_GUIDE.md)

## 🚀 Prochaines Étapes

Une fois tous les tests validés :

1. **Build de production** :
   ```bash
   cd desktop
   npm run build:linux  # Créer le .deb
   ```

2. **Déploiement** :
   - Installer Docker pour le déploiement en production
   - Suivre le guide dans `docs/DEPLOYMENT.md`

3. **Phase 3 - Application Android** :
   - Développer l'app React Native
   - Synchroniser avec l'API backend
