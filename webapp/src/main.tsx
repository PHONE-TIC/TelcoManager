import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/global.css";
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
