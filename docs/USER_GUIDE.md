# Guide Utilisateur - TelcoManager Web

Ce guide explique comment utiliser la webapp TelcoManager pour gérer le stock et les interventions.

## Connexion

1. Ouvrez l’application web
2. Connectez-vous avec vos identifiants
3. Identifiants par défaut :
   - nom d’utilisateur : `admin`
   - mot de passe : `admin123`

> Conseil : changez le mot de passe admin après la première connexion.

## Tableau de bord

Le tableau de bord affiche :

- le nombre de clients
- le nombre d’interventions
- le stock courant
- le stock HS
- des alertes de stock faible
- des raccourcis vers les modules principaux

## Clients

### Créer un client

1. Ouvrez la page **Clients**
2. Cliquez sur **Nouveau client**
3. Renseignez les informations
4. Enregistrez

### Modifier / supprimer

- utilisez les actions disponibles dans la liste ou la fiche détail
- attention, la suppression peut impacter les interventions liées

## Techniciens

### Créer un technicien

1. Ouvrez la page **Techniciens**
2. Cliquez sur **Nouveau technicien**
3. Renseignez le nom, l’identifiant, le mot de passe et le rôle
4. Enregistrez

### Rôles

- **admin** : accès complet
- **gestionnaire** : accès étendu selon configuration
- **technicien** : accès limité à ses usages métier

## Interventions

### Créer une intervention

1. Ouvrez la page **Interventions**
2. Cliquez sur **Nouvelle intervention**
3. Choisissez le client et le technicien si nécessaire
4. Ajoutez le titre, la date et la description
5. Enregistrez

### Suivi

Selon le rôle et l’état de l’intervention, vous pouvez :

- consulter la fiche détail
- mettre à jour le statut
- associer du matériel
- ajouter des commentaires, rapports ou pièces jointes

## Stock

### Ajouter du matériel

1. Ouvrez la page **Stock**
2. Choisissez **Stock courant**
3. Cliquez sur **Nouveau matériel**
4. Renseignez le nom, la référence, la catégorie, la quantité et les informations utiles
5. Enregistrez

### Stock HS

Le module permet aussi de gérer le stock hors service et les mouvements entre états.

## Inventaire

1. Ouvrez la page **Inventaire**
2. Lancez une session
3. Scannez ou saisissez les codes-barres / numéros de série
4. Vérifiez les écarts
5. Finalisez la session

## Recherche globale

La recherche globale permet de retrouver rapidement :

- des clients
- des techniciens
- des interventions
- des éléments de stock

## Utilisation sur mobile / tablette

La webapp est responsive et peut être utilisée directement depuis un navigateur sur :

- desktop
- tablette
- mobile

Il ne s’agit pas d’une application mobile séparée, mais de la même interface web adaptée à l’écran.

## Bonnes pratiques

- garder des références de stock cohérentes
- renseigner les codes-barres quand c’est possible
- vérifier les mouvements de stock régulièrement
- documenter les interventions proprement
- faire des inventaires périodiques

## Support

Pour les aspects techniques :

- voir `README.md`
- voir `docs/DEPLOYMENT.md`
