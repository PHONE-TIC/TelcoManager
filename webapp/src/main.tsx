import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Police embarquée dans le projet plutôt qu'appelée chez Google : aucune
// requête vers un tiers, rien à autoriser dans la politique de sécurité, et
// pas de texte invisible le temps qu'une ressource distante arrive.
// Seul l'axe de graisse est chargé (ni italique, ni optical size), et les
// unicode-range limitent le téléchargement au sous-ensemble latin.
import "@fontsource-variable/inter/wght.css";

import "./index.css";
import "./styles/global.css";
// Chargé après index.css : les variables ci-dessous font autorité, y compris
// sur l'ancien vocabulaire que les écrans pas encore repris consomment.
import "./styles/tokens.css";
import App from "./App.tsx";

// L'enregistrement du Service Worker est délégué à vite-plugin-pwa via le hook
// useRegisterSW du composant ReloadPrompt (monté dans App). Un enregistrement
// manuel de /sw.js ici entrerait en concurrence avec celui du plugin et rendait
// la détection de mise à jour et les notifications push instables.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
