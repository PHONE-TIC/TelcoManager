import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthRequest } from "../middleware/auth.middleware";
import { respondValidationError } from "./controller.utils";
import {
  getInterventionLockConflict,
  lockInterventionForUser,
  unlockInterventionById,
} from "../services/intervention-lock.service";
import { prisma } from "../db";

/**
 * Verrous d'édition collaborative et flux temps réel associé.
 *
 * Le flux SSE s'authentifie par ticket éphémère (voir authenticateStreamTicket) :
 * l'API EventSource ne permet pas d'émettre d'en-tête Authorization.
 */
interface SseClient {
  id: string;
  res: Response;
}

// Clients SSE connectés, conservés en mémoire du processus. Cette liste est
// donc locale à l'instance : une exécution multi-instances nécessiterait un
// relais externe pour diffuser les mises à jour à tous les clients.
let sseClients: SseClient[] = [];

export const broadcastLockUpdate = (update: {
  interventionId: string;
  lockedBy: string | null;
  lockedAt: string | null;
}) => {
  const message = JSON.stringify({ type: "update", ...update });
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch (err) {
      console.error("Error writing to SSE client:", err);
    }
  });
};

export const locksStream = async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });

  try {
    const activeLocks = await prisma.intervention.findMany({
      where: {
        lockedBy: { not: null },
        lockedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: {
        id: true,
        lockedBy: true,
        lockedAt: true,
      },
    });

    const locksWithNames = await Promise.all(
      activeLocks.map(async (lock) => {
        const tech = await prisma.technicien.findUnique({
          where: { id: lock.lockedBy! },
          select: { nom: true },
        });
        return {
          interventionId: lock.id,
          lockedBy: tech?.nom || "Un utilisateur",
          lockedAt: lock.lockedAt ? lock.lockedAt.toISOString() : null,
        };
      })
    );

    res.write(`data: ${JSON.stringify({ type: "initial", locks: locksWithNames })}\n\n`);
  } catch (err) {
    console.error("SSE initial locks error:", err);
  }
};

export const lockIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const lockConflict = await getInterventionLockConflict(id, userId);
    if (lockConflict.missing) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    if (lockConflict.lockedBy) {
      return res.status(409).json({
        error: "Intervention verrouillée",
        lockedBy: lockConflict.lockedBy,
      });
    }

    await lockInterventionForUser(id, userId);

    const lockingUser = await prisma.technicien.findUnique({
      where: { id: userId },
      select: { nom: true },
    });

    broadcastLockUpdate({
      interventionId: id,
      lockedBy: lockingUser?.nom || "Un utilisateur",
      lockedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: "Intervention verrouillée" });
  } catch (error) {
    console.error("Erreur lockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du verrouillage" });
  }
};

export const unlockIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: { lockedBy: true },
    });

    if (!intervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Uniquement le propriétaire du verrou, un admin ou un gestionnaire peut déverrouiller
    if (
      intervention.lockedBy &&
      intervention.lockedBy !== userId &&
      req.user?.role !== "admin" &&
      req.user?.role !== "gestionnaire"
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas le propriétaire du verrou",
      });
    }

    await unlockInterventionById(id);

    broadcastLockUpdate({
      interventionId: id,
      lockedBy: null,
      lockedAt: null,
    });

    res.json({ success: true, message: "Intervention déverrouillée" });
  } catch (error) {
    console.error("Erreur unlockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du déverrouillage" });
  }
};

// Upload artifacts (Photos + Report)