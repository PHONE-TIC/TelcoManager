import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.routes";
import clientRoutes from "./routes/clients.routes";
import technicienRoutes from "./routes/techniciens.routes";
import interventionRoutes from "./routes/interventions.routes";
import stockRoutes from "./routes/stock.routes";
import inventaireRoutes from "./routes/inventaire.routes";
import technicianStockRoutes from "./routes/technician-stock.routes";
import searchRoutes from "./routes/search.routes";
import pushRoutes from "./routes/push.routes";
import stockMovementsRoutes from "./routes/stockMovements.routes";
import unycRoutes from "./routes/unyc.routes";
import ipLinksRoutes from "./routes/ip-links.routes";

// Charger les variables d'environnement
dotenv.config();

// Initialiser Prisma
import { prisma } from "./db";
import { startIpLinksSyncJob } from "./services/ip-links.service";
export { prisma };

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/techniciens", technicienRoutes);
app.use("/api/interventions", interventionRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/inventaire", inventaireRoutes);
app.use("/api/technician-stock", technicianStockRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/push", pushRoutes);
app.use("/api", stockMovementsRoutes);
app.use("/api/unyc", unycRoutes);
app.use("/api/ip-links", ipLinksRoutes);

// Servir les fichiers uploadés (photos, pdfs)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "../client")));

// Pour toutes les autres requêtes (SPA), renvoyer index.html
app.get("*", (req: Request, res: Response) => {
  // Si c'est une requête API qui n'a pas matché, renvoyer 404
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route non trouvée" });
  }
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Erreur interne du serveur",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

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
