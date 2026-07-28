import dotenv from "dotenv";

// Charger les variables d'environnement avant toute autre initialisation
dotenv.config();

import { getJwtSecret } from "./config/jwt";

// Enforce JWT secret checks on startup
getJwtSecret();

// Enforce ALLOWED_ORIGINS check in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === "") {
    console.error("FATAL ERROR: ALLOWED_ORIGINS environment variable must be set in production to secure CORS policies.");
    process.exit(1);
  }
}

import { prisma } from "./db";
import { createApp } from "./app";
import { startIpLinksSyncJob } from "./services/ip-links.service";

export { prisma };

const app = createApp();
const PORT = process.env.PORT || 3001;

// Démarrer le serveur
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 API disponible sur http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  startIpLinksSyncJob();
});

// Gestion de l'arrêt gracieux
process.on("SIGTERM", async () => {
  console.log("SIGTERM reçu, arrêt du serveur...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Serveur arrêté proprement");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT reçu, arrêt du serveur...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Serveur arrêté proprement");
    process.exit(0);
  });
});

export default app;
