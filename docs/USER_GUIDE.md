# Guide Utilisateur - Système de Gestion de Stock et d'Interventions

Ce guide explique comment utiliser l'application desktop pour gérer votre stock et vos interventions.

## 🚀 Premiers Pas

### Connexion

1. Lancez l'application desktop
2. Entrez vos identifiants :
   - **Nom d'utilisateur** : `admin` (par défaut)
   - **Mot de passe** : `admin123` (par défaut)
3. Cliquez sur "Se connecter"

> 💡 **Conseil** : Changez le mot de passe admin après votre première connexion depuis le module Techniciens

## 📊 Dashboard

Le dashboard affiche une vue d'ensemble de votre système :

- **Nombre total de clients**
- **Nombre total d'interventions**
- **Quantité en stock courant**
- **Quantité en stock HS (hors service)**
- **Stock par catégorie** : tableau détaillé
- **Alertes stock faible** : articles avec ≤5 unités

## 👥 Gestion des Clients

### Créer un Client

1. Cliquez sur "Clients" dans le menu
2. Cliquez sur "+ Nouveau client"
3. Remplissez le formulaire :
   - Nom de l'entreprise/client
   - Nom du contact
   - Numéro de téléphone
   - Adresse complète
4. Cliquez sur "Créer"

### Modifier un Client

1. Dans la liste des clients, cliquez sur "✏️ Modifier"
2. Modifiez les informations souhaitées
3. Cliquez sur "Mettre à jour"

### Supprimer un Client

1. Cliquez sur "🗑️ Supprimer" à côté du client
2. Confirmez la suppression

> ⚠️ **Attention** : La suppression d'un client supprimera également toutes ses interventions et équipements associés

### Rechercher un Client

Utilisez la barre de recherche en haut de la liste pour filtrer les clients par :
- Nom
- Contact
- Numéro de téléphone

## 🔧 Gestion des Techniciens

### Créer un Technicien

1. Cliquez sur "Techniciens" dans le menu
2. Cliquez sur "+ Nouveau technicien"
3. Remplissez :
   - Nom complet
   - Nom d'utilisateur (pour la connexion)
   - Mot de passe (minimum 6 caractères)
   - Rôle : Technicien ou Administrateur
4. Cliquez sur "Créer"

### Rôles et Permissions

- **Administrateur** :
  - Accès complet à toutes les fonctionnalités
  - Peut créer/modifier/supprimer des clients
  - Peut gérer les techniciens
  - Peut créer des interventions

- **Technicien** :
  - Peut voir et mettre à jour les interventions
  - Peut gérer le stock
  - Peut utiliser l'inventaire
  - Ne peut pas créer de clients

### Modifier un Technicien

1. Cliquez sur "✏️ Modifier"
2. Modifiez les informations
3. Pour changer le mot de passe, entrez un nouveau mot de passe (sinon laissez vide)
4. Cliquez sur "Mettre à jour"

## 📅 Gestion des Interventions

### Créer une Intervention

1. Cliquez sur "Interventions" dans le menu
2. Cliquez sur "+ Nouvelle intervention"
3. Remplissez :
   - **Client** : Sélectionnez dans la liste
   - **Technicien** : Assignez un technicien (optionnel)
   - **Titre** : Nom court de l'intervention
   - **Date planifiée** : Date et heure de l'intervention
   - **Description** : Détails de l'intervention (optionnel)
4. Cliquez sur "Créer"

### Statuts d'Intervention

- 🔵 **Planifiée** : Intervention créée, en attente
- 🟡 **En cours** : Intervention commencée
- ✅ **Terminée** : Intervention complétée
- 🔴 **Annulée** : Intervention annulée

### Planning des Techniciens

Chaque technicien peut voir son planning :
- Liste de toutes ses interventions
- Filtrage par date
- Tri chronologique

## 📦 Gestion du Stock

### Ajouter du Matériel

1. Cliquez sur "Stock" dans le menu
2. Assurez-vous que "📦 Stock Courant" est sélectionné
3. Cliquez sur "+ Nouveau matériel"
4. Remplissez :
   - Nom du matériel
   - Référence unique
   - Code-barres (optionnel mais recommandé)
   - Catégorie (ex: Réseau, Sécurité, Informatique)
   - Quantité
   - Notes (optionnel)
5. Cliquez sur "Créer"

### Catégories Recommandées

- Réseau (routeurs, switches, câbles)
- Sécurité (caméras, alarmes)
- Informatique (PC, écrans, périphériques)
- Téléphonie (téléphones, centrales)
- Consommables (vis, câbles, connecteurs)

### Gérer le Stock HS (Hors Service)

#### Déplacer vers le Stock HS

1. Dans le stock courant, trouvez l'article défectueux
2. Cliquez sur "→ Déplacer vers HS"
3. Confirmez l'action

Le système :
- Diminue la quantité du stock courant
- Crée ou augmente l'entrée dans le stock HS

#### Consulter le Stock HS

1. Cliquez sur "⚠️ Stock HS"
2. Vous verrez tous les articles hors service

### Alertes Stock Faible

Sur le Dashboard, les articles avec ≤5 unités sont affichés avec un badge :
- 🟡 **Jaune** : 3-5 unités
- 🔴 **Rouge** : ≤2 unités

## 🔍 Module Inventaire

Le module inventaire permet de scanner rapidement le stock existant.

### Démarrer une Session d'Inventaire

1. Cliquez sur "Inventaire" dans le menu
2. Cliquez sur "🔍 Commencer l'inventaire"
3 Une session d'inventaire est créée

### Scanner des Articles

1. Dans le champ "Scanner un code-barres" :
   - Utilisez un lecteur de codes-barres USB
   - OU tapez le code-barres manuellement
2. Appuyez sur Entrée ou cliquez sur "🔍 Scanner"
3. L'article s'affiche avec ses informations
4. Il est automatiquement ajouté à la session

### Scanner Multiple

Si vous scannez plusieurs fois le même article :
- Le compteur "Nb scans" augmente
- Utile pour vérifier les quantités réelles

### Terminer une Session

1. Une fois l'inventaire terminé, cliquez sur "Terminer la session"
2. Un résumé s'affiche :
   - Nombre d'articles différents scannés
   - Nombre total de scans
3. Les données peuvent être utilisées pour ajuster le stock

## 💡 Workflow Typique

### Exemple : Installation chez un Client

1. **Planifier** :
   - Créer le client (si nouveau)
   - Créer une intervention
   - Assigner un technicien

2. **Préparer** :
   - Vérifier le stock disponible
   - Prévoir le matériel nécessaire

3. **Intervention** :
   - Le technicien consulte son planning (sur mobile ou desktop)
   - Effectue l'installation
   - Note le matériel installé

4. **Suivi** :
   - Le stock se met à jour automatiquement
   - L'historique client affiche l'intervention
   - Le matériel est assigné au client

### Exemple : Retrait de Matériel

1. Créer une intervention "Retrait matériel"
2. Lors de l'intervention, noter le matériel retiré
3. Le matériel :
   - Retourne au stock courant (si OK)
   - Va au stock HS (si défectueux)

## 🔐 Bonnes Pratiques

### Sécurité

- ✅ Changez le mot de passe admin par défaut
- ✅ Utilisez des mots de passe forts (min. 8 caractères)
- ✅ Ne partagez pas les identifiants
- ✅ Déconnectez-vous après utilisation

### Organisation

- ✅ Utilisez des noms de catégories cohérents
- ✅ Renseignez les codes-barres pour l'inventaire
- ✅ Mettez à jour les quantités régulièrement
- ✅ Faites des inventaires périodiques
- ✅ Documentez les interventions avec des notes

### Stock

- ✅ Vérifiez le stock avant de planifier des interventions
- ✅ Commandez quand le stock est faible
- ✅ Séparez bien stock courant et HS
- ✅ Utilisez des références uniques et claires

## ❓ Questions Fréquentes

### Je ne peux pas créer de client

Vérifiez que vous êtes connecté en tant qu'**administrateur**. Seuls les admins peuvent créer des clients.

### Le code-barres ne fonctionne pas

Assurez-vous que :
- Le lecteur de codes-barres est bien connecté
- Le curseur est dans le champ "Scanner un code-barres"
- Le code-barres existe bien dans le stock

### J'ai oublié mon mot de passe

Contactez un administrateur pour réinitialiser votre mot de passe via le module Techniciens.

### Les données ne s'affichent pas

Vérifiez que :
- L'API backend est en cours d'exécution
- Vous avez une connexion réseau
- L'URL de l'API est correcte

### Comment faire un backup ?

Les backups se font au niveau du serveur (voir le [Guide de Déploiement](DEPLOYMENT.md)).

## 📞 Support

Pour toute assistance technique :
1. Vérifiez ce guide utilisateur
2. Consultez le README.md pour les informations techniques
3. Contactez votre administrateur système
