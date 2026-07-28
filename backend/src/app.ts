import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";

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
import notificationsRoutes from "./routes/notifications.routes";

import { prisma } from "./db";
import { authenticate, AuthRequest } from "./middleware/auth.middleware";

/**
 * Construit l'application Express sans la démarrer.
 *
 * La séparation avec `index.ts` permet aux tests d'intégration de monter
 * l'application complète — routage, validation, middlewares d'autorisation —
 * sans ouvrir de port ni déclencher les tâches planifiées.
 */
export function createApp() {
  const app = express();

  // Global Security Middleware with Helmet (disabling default CSP to avoid breaking SPA)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // Resolve allowed origins (providing explicit defaults in development)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logger middleware (silencieux en test pour ne pas noyer la sortie)
  if (process.env.NODE_ENV !== "test") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  // Rate limiting specifically for authentication endpoints to prevent brute force
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 login requests per 15 minutes
    message: {
      error: "Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Désactivé en test : la limite fausserait les scénarios d'authentification.
    skip: () => process.env.NODE_ENV === "test",
  });

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth/login", loginLimiter);
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
  app.use("/api/notifications", notificationsRoutes);

  // Point d'accès sécurisé et cloisonné pour les fichiers uploadés (photos, rapports PDF)
  app.get(
    "/uploads/interventions/:id/:filename",
    authenticate,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id, filename } = req.params;

        const intervention = await prisma.intervention.findUnique({
          where: { id },
        });

        if (!intervention) {
          return res.status(404).json({ error: "Intervention non trouvée" });
        }

        // Restriction de cloisonnement : seuls l'assignataire de la fiche, un admin ou un gestionnaire peuvent y accéder
        if (req.user?.role === "technicien" && intervention.technicienId !== req.user.id) {
          return res.status(403).json({
            error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
          });
        }

        // Prévenir les attaques de Directory Traversal en assainissant le nom du fichier
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), "uploads", "interventions", id, safeFilename);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "Fichier non trouvé" });
        }

        res.sendFile(filePath);
      } catch (err) {
        console.error("Error serving uploaded file:", err);
        res.status(500).json({ error: "Erreur lors de la récupération du fichier" });
      }
    }
  );

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

  return app;
}
