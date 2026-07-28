# TelcoManager — Webapp

Interface Single Page Application de TelcoManager : React 19, TypeScript, Vite et PWA.

La documentation d'ensemble (architecture, déploiement, variables d'environnement, modèle de branches) se trouve dans le [README principal](../README.md).

## Lancement

```bash
npm install
npm run dev
```

L'interface est servie sur `http://localhost:3000` et relaie `/api` et `/uploads` vers le backend attendu sur le port `3001`. Le backend doit donc tourner en parallèle — voir la section « Développement Local » du README principal.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud. |
| `npm run build` | Vérification des types (`tsc -b`) puis build de production. |
| `npm run lint` | ESLint sur l'ensemble du projet. |
| `npm test` | Tests Vitest en mode surveillance (`-- --run` pour une exécution unique). |

## Organisation

| Répertoire | Contenu |
| --- | --- |
| `src/pages/` | Écrans applicatifs et leurs utilitaires métier (`*.utils.ts`). |
| `src/components/` | Composants réutilisables (scanner, signature, modales, navigation). |
| `src/contexts/` | Contextes React : authentification, thème, verrous d'édition, notifications. |
| `src/hooks/` | Hooks transverses : hors-ligne, notifications, responsive, installation PWA. |
| `src/services/` | Client API Axios et services navigateur (géolocalisation, stockage hors-ligne). |
| `src/utils/` | Fonctions pures : dates, génération PDF, file de synchronisation hors-ligne. |

## Tests

Les tests couvrent en priorité les zones où un défaut coûte cher : la file d'attente hors-ligne (`utils/offlineSync`), les règles d'édition par rôle, les écarts d'inventaire, le formatage des dates en heure locale et la génération des PDF. Ils s'exécutent sous jsdom, sans backend ni base de données.

## Service Worker

L'enregistrement du Service Worker est assuré **uniquement** par `vite-plugin-pwa`, via le hook `useRegisterSW` du composant `ReloadPrompt`. N'ajoutez pas d'appel manuel à `navigator.serviceWorker.register()` : plusieurs mécanismes concurrents rendent la détection de mise à jour et les notifications push instables. Pour attendre que le Service Worker soit actif, utilisez `navigator.serviceWorker.ready`.
