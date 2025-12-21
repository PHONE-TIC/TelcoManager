# ✅ Tests Manuels - Application Desktop

## 🔐 Test 1 : Authentification

- [ ] **Login avec les identifiants corrects**
  - Username: `admin`
  - Password: `admin123`
  - ✅ **Résultat attendu** : Redirection vers le Dashboard

- [ ] **Tentative de login avec mot de passe incorrect**
  - Username: `admin`
  - Password: `mauvais`
  - ✅ **Résultat attendu** : Message d'erreur affiché

---

## 📊 Test 2 : Dashboard

Après connexion, vérifiez que le Dashboard affiche :

- [ ] **Carte "Clients"** : Nombre = 2
- [ ] **Carte "Interventions"** : Nombre = 2
- [ ] **Carte "Stock Courant"** : Quantité totale ≈ 43
- [ ] **Carte "Stock HS"** : Quantité = 0
- [ ] **Tableau "Stock par catégorie"** : 2 lignes (Réseau, Sécurité)
- [ ] **Section "Alertes Stock Faible"** : Vide ou avec alertes si stock < 10

---

## 👥 Test 3 : Gestion des Clients

1. **Cliquez sur "👥 Clients" dans le menu latéral**

- [ ] **Liste des clients** : 2 clients visibles (Entreprise ABC, Société XYZ)

2. **Créer un nouveau client**

- [ ] Cliquez sur **"+ Nouveau client"**
- [ ] Formulaire apparaît en haut
- [ ] Remplissez :
  - Nom : `Test Client SARL`
  - Contact : `M. Dupuis`
  - Téléphone : `0612345678`
  - Adresse : `10 Rue Test, 75000 Paris`
- [ ] Cliquez sur **"Créer"**
- [ ] ✅ Le client apparaît dans la liste (3 clients au total)

3. **Modifier un client**

- [ ] Cliquez sur **"✏️"** à côté de "Test Client SARL"
- [ ] Le formulaire se remplit avec les données
- [ ] Modifiez le contact : `Mme Dupuis`
- [ ] Cliquez sur **"Mettre à jour"**
- [ ] ✅ Les modifications sont visibles

4. **Recherche**

- [ ] Dans la barre de recherche, tapez **"ABC"**
- [ ] ✅ Seul "Entreprise ABC" est affiché
- [ ] Effacez la recherche
- [ ] ✅ Tous les clients réapparaissent

---

## 🔧 Test 4 : Gestion des Techniciens

1. **Cliquez sur "🔧 Techniciens"**

- [ ] 2 techniciens visibles (Jean Dupont, Marie Martin)

2. **Créer un technicien**

- [ ] Cliquez sur **"+ Nouveau technicien"**
- [ ] Remplissez :
  - Nom : `Pierre Leroy`
  - Username : `pleroy`
  - Password : `tech123`
  - Rôle : **Technicien** (pas Admin)
- [ ] Cliquez sur **"Créer"**
- [ ] ✅ Le technicien apparaît (3 au total)
- [ ] ✅ Badge **"technicien"** visible

3. **Vérifier les badges de rôle**

- [ ] Admin : Badge **"admin"** en bleu
- [ ] Techniciens : Badge **"technicien"** en gris

---

## 📅 Test 5 : Gestion des Interventions

1. **Cliquez sur "📅 Interventions"**

- [ ] 2 interventions visibles

2. **Créer une intervention**

- [ ] Cliquez sur **"+ Nouvelle intervention"**
- [ ] Remplissez :
  - Client : Sélectionnez **"Test Client SARL"**
  - Technicien : Sélectionnez **"Pierre Leroy"**
  - Titre : `Installation fibre optique`
  - Date : Choisissez demain à 10h00
  - Description : `Installation et configuration`
- [ ] Cliquez sur **"Créer"**
- [ ] ✅ L'intervention apparaît avec badge **"🔵 planifiee"**

3. **Vérifier les statuts**

- [ ] Les interventions ont des badges colorés selon leur statut
- [ ] planifiee : badge bleu
- [ ] en_cours : badge orange
- [ ] terminee : badge vert
- [ ] annulee : badge rouge

---

## 📦 Test 6 : Gestion du Stock

1. **Cliquez sur "📦 Stock"**

- [ ] Onglet **"Stock Courant"** sélectionné par défaut
- [ ] 3 articles visibles (Routeur, Switch, Caméra)

2. **Ajouter du matériel**

- [ ] Cliquez sur **"+ Nouveau matériel"**
- [ ] Remplissez :
  - Nom : `Patch Panel 48 ports`
  - Référence : `PP48-2024-001`
  - Code-barres : `4567890123456`
  - Catégorie : `Réseau`
  - Quantité : `5`
- [ ] Cliquez sur **"Créer"**
- [ ] ✅ Le matériel apparaît dans la liste

3. **Déplacer vers Stock HS**

- [ ] Trouvez "Routeur Wifi Pro"
- [ ] Cliquez sur **"→ Déplacer vers HS"**
- [ ] Confirmez dans la boîte de dialogue
- [ ] ✅ Le routeur disparaît du stock courant (ou quantité diminuée)

4. **Vérifier le Stock HS**

- [ ] Cliquez sur l'onglet **"⚠️ Stock HS"**
- [ ] ✅ Le routeur apparaît dans cette liste

---

## 🔍 Test 7 : Module Inventaire

1. **Cliquez sur "🔍 Inventaire"**

2. **Démarrer une session**

- [ ] Cliquez sur **"🔍 Commencer l'inventaire"**
- [ ] ✅ Message "Session d'inventaire démarrée"
- [ ] ✅ Le champ de scan devient actif

3. **Scanner des articles**

- [ ] Dans le champ "Code-barres", entrez : `2345678901234`
  - C'est le code du "Switch 24 ports"
- [ ] Appuyez sur **Entrée** ou cliquez **"Scanner"**
- [ ] ✅ L'article apparaît dans la liste avec ses détails

4. **Scanner le même article à nouveau**

- [ ] Re-scannez : `2345678901234`
- [ ] ✅ Le compteur "Nb scans" passe à 2

5. **Scanner un autre article**

- [ ] Scannez : `3456789012345` (Caméra IP)
- [ ] ✅ 2 articles différents dans la liste

6. **Terminer la session**

- [ ] Cliquez sur **"Terminer la session"**
- [ ] ✅ Récapitulatif affiché :
  - Total articles scannés : 2
  - Total scans : 3 (2 pour le switch + 1 pour la caméra)

---

## 🚪 Test 8 : Déconnexion

- [ ] Cliquez sur **"🚪 Déconnexion"** en bas du menu
- [ ] ✅ Retour à l'écran de login
- [ ] ✅ Impossible d'accéder au Dashboard sans se reconnecter

---

## 🎯 Checklist Globale

### Interface Utilisateur
- [ ] Navigation latérale fonctionnelle
- [ ] Tous les menus cliquables
- [ ] Design cohérent et lisible
- [ ] Pas d'erreurs dans la console (F12)

### Fonctionnalités CRUD
- [ ] Clients : Créer ✅ Lire ✅ Modifier ✅ Supprimer ✅
- [ ] Techniciens : Créer ✅ Lire ✅ Modifier ✅ Supprimer ✅
- [ ] Interventions : Créer ✅ Lire ✅
- [ ] Stock : Créer ✅ Lire ✅ Déplacer HS ✅

### Connexion Backend
- [ ] Toutes les données se chargent correctement
- [ ] Pas d'erreurs 401/403/500
- [ ] Les créations/modifications persistent après refresh

---

## 📸 Captures d'écran (Optionnel)

Si vous voulez documenter vos tests, prenez des captures d'écran de :
- Le Dashboard avec les statistiques
- La liste des clients
- Une intervention créée
- Le module inventaire en action

---

## ✅ Résultat Final

Une fois tous les tests effectués :

**Si TOUS les tests passent** : 🎉 L'application est **100% fonctionnelle** !

**Si certains tests échouent** : Notez les problèmes rencontrés et partagez-les pour correction.

---

**Bon test ! 🚀**
