# Guide de Test - Application Mobile (Android)

Ce guide explique comment lancer et tester l'application mobile avec Expo.

## Prérequis

1.  **Backend Démarré** : Assurez-vous que le serveur backend tourne (`cd backend && npm run dev`).
2.  **Base de Données** : La base de données PostgreSQL doit être accessible.

## Option 1 : Test sur Émulateur Android (Recommandé pour le développement)

Si vous avez Android Studio installé avec un émulateur :

1.  Ouvrez un terminal dans le dossier `mobile` :
    ```bash
    cd mobile
    ```
2.  Lancez le serveur de développement :
    ```bash
    npx expo start --android
    ```
    *   Si l'émulateur n'est pas ouvert, Expo tentera de l'ouvrir (assurez-vous qu'il est configuré).
    *   Appuyez sur `a` dans le terminal pour forcer l'ouverture sur Android.

**Configuration API** :
Par défaut, l'application est configurée pour l'émulateur Android standard.
*   Fichier : `mobile/src/services/api.ts`
*   URL : `http://10.0.2.2:3001/api` (10.0.2.2 est l'alias de `localhost` pour l'émulateur Android).

## Option 2 : Test sur Appareil Physique (Via Expo Go)

Pour tester sur votre propre téléphone Android :

1.  Installez l'application **Expo Go** depuis le Google Play Store sur votre téléphone.
2.  Connectez votre téléphone et votre ordinateur au **même réseau Wi-Fi**.
3.  **Important : Mettre à jour l'adresse IP de l'API**.
    *   Trouvez l'adresse IP locale de votre ordinateur (ex: `192.168.1.15`).
    *   Ouvrez `mobile/src/services/api.ts`.
    *   Modifiez `BASE_URL` pour utiliser votre IP :
        ```typescript
        const BASE_URL = 'http://192.168.1.15:3001/api'; // Remplacez par VOTRE IP
        ```
4.  Lancez le serveur Expo :
    ```bash
    cd mobile
    npx expo start
    ```
5.  Un QR Code s'affiche dans le terminal. Scannez-le avec l'application Expo Go (ou l'appareil photo).

## Scénarios de Test

### 1. Connexion
*   Utilisez les identifiants : `admin` / `admin123`.
*   Vérifiez que vous êtes redirigé vers le Dashboard.

### 2. Dashboard
*   Vérifiez que la liste des interventions s'affiche.
*   Pull-to-refresh : Tirez la liste vers le bas pour rafraîchir.

### 3. Détails & Signature
*   Cliquez sur une intervention.
*   Cliquez sur "Signer".
*   Dessinez une signature et validez.
*   Vérifiez que le message de succès s'affiche.

## Dépannage

*   **Erreur de connexion (Network Error)** :
    *   Vérifiez que le backend tourne.
    *   Vérifiez l'adresse IP dans `api.ts`.
    *   Sur Android (Physique), vérifiez que le pare-feu de votre PC autorise le port 3001.
*   **Erreur "Cleartext HTTP traffic not permitted"** :
    *   Par défaut, Android bloque HTTP (non sécurisé). Expo Go en développement l'autorise généralement, mais pour une vraie build, il faudra configurer HTTPS ou le manifeste Android.
