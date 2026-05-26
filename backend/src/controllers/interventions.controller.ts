import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { notifyNewIntervention } from "../services/push.service";
import * as outlookService from "../services/outlook.service";
import {
  manageInterventionEquipment,
} from "../services/intervention-equipment.service";
import {
  getInterventionLockConflict,
  lockInterventionForUser,
  unlockInterventionById,
} from "../services/intervention-lock.service";
import {
  buildFinalInterventionNumero,
  buildInterventionStatusUpdateData,
  buildTemporaryInterventionNumero,
  getClientNomById,
  getTechnicienNomById,
  isClosedInterventionStatus,
  isDateScheduledForToday,
} from "./interventions.controller.helpers";
import {
  buildPagination,
  parsePagination,
  respondValidationError,
} from "./controller.utils";
import {
  interventionClientListSelect,
  interventionTechnicienListSelect,
} from "./prisma-selects";
import {
  interventionCreateReturnInclude,
} from "./interventions.controller.constants";

export const getAllInterventions = async (req: AuthRequest, res: Response) => {
  try {
    const {
      clientId,
      technicienId,
      statut,
      startDate,
      endDate,
      page = "1",
      limit = "20",
    } = req.query;
    const { page: currentPage, limit: pageSize, skip } = parsePagination({
      page: page as string,
      limit: limit as string,
    });

    const where: any = {};

    if (clientId) where.clientId = clientId;
    
    // Restriction de cloisonnement technicien
    if (req.user?.role === "technicien") {
      where.technicienId = req.user.id;
    } else if (technicienId) {
      where.technicienId = technicienId;
    }
    
    if (statut) where.statut = statut;

    if (startDate && endDate) {
      where.datePlanifiee = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          client: {
            select: interventionClientListSelect,
          },
          technicien: {
            select: interventionTechnicienListSelect,
          },
          _count: {
            select: {
              equipements: true,
            },
          },
        },
        orderBy: { datePlanifiee: "desc" },
      }),
      prisma.intervention.count({ where }),
    ]);

    res.json({
      interventions,
      pagination: {
        ...buildPagination(currentPage, pageSize, total),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des interventions:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des interventions" });
  }
};

export const getInterventionById = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        technicien: {
          select: interventionTechnicienListSelect,
        },
        equipements: {
          include: {
            stock: {
              select: {
                nomMateriel: true,
                reference: true,
                categorie: true,
                numeroSerie: true,
              },
            },
          },
        },
      },
    });

    if (!intervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (req.user?.role === "technicien" && intervention.technicienId !== req.user.id) {
      return res.status(403).json({ error: "Accès refusé - Vous n'êtes pas assigné à cette intervention" });
    }

    res.json(intervention);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'intervention" });
  }
};

const handleInterventionAssignmentNotification = async (
  technicienId: string,
  interventionId: string
) => {
  try {
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: { client: true },
    });
    if (!intervention) return;

    // Create database notification
    await prisma.notification.create({
      data: {
        type: "new_intervention",
        title: "📅 Nouvelle intervention assignée",
        message: `${intervention.numero || ""} - ${intervention.titre} chez ${intervention.client?.nom || ""}`,
        link: `/interventions/${intervention.id}`,
        metadata: {
          technicienId,
          interventionId,
        },
      },
    });

    // Send web push notification
    notifyNewIntervention(technicienId, {
      id: intervention.id,
      numero: intervention.numero,
      titre: intervention.titre,
      datePlanifiee: intervention.datePlanifiee,
      client: { nom: intervention.client?.nom || "" },
    }).catch((err) => {
      console.error("Failed to send push notification:", err);
    });
  } catch (err) {
    console.error("Failed to handle intervention assignment notification:", err);
  }
};

export const createIntervention = async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can create interventions
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "Seuls les administrateurs peuvent créer des interventions",
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const {
      clientId,
      technicienId,
      titre,
      description,
      datePlanifiee,
      statut = "planifiee",
      type = "SAV",
    } = req.body;

    const clientNom = await getClientNomById(clientId);
    const technicienNom = await getTechnicienNomById(technicienId);
    const tempNumero = buildTemporaryInterventionNumero();

    // 1. Create with temp number to get the auto-incremented counter
    const initialIntervention = await prisma.intervention.create({
      data: {
        clientId,
        clientNom,
        technicienId,
        technicienNom,
        titre,
        description,
        // Parse date as-is, JavaScript will handle timezone naturally
        datePlanifiee: new Date(datePlanifiee),
        statut,
        type,
        numero: tempNumero,
      },
    });

    const finalNumero = buildFinalInterventionNumero(
      initialIntervention.compteur
    );

    // 3. Update with final number and return with relations
    const intervention = await prisma.intervention.update({
      where: { id: initialIntervention.id },
      data: { numero: finalNumero },
      include: interventionCreateReturnInclude,
    });

    // Send notifications to assigned technician
    if (technicienId) {
      await handleInterventionAssignmentNotification(technicienId, intervention.id);
    }

    // Sync to Outlook Shared Calendar in background
    outlookService.createOutlookEvent(intervention.id).catch((err) => {
      console.error("Erreur lors de la création de l'événement Outlook:", err);
    });

    res.status(201).json(intervention);
  } catch (error) {
    console.error("Erreur lors de la création de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la création de l'intervention" });
  }
};

export const updateIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Check if intervention exists and get current status
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (
      req.user?.role === "technicien" &&
      existingIntervention.technicienId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
    }

    // Technicians cannot modify closed interventions
    if (
      req.user?.role === "technicien" &&
      isClosedInterventionStatus(existingIntervention.statut)
    ) {
      return res.status(403).json({
        error: "Les interventions clôturées ne peuvent pas être modifiées",
      });
    }

    const {
      technicienId,
      titre,
      description,
      datePlanifiee,
      dateRealisee,
      statut,
      type,
      notes,
      signature,
    } = req.body;

    let technicienNom: string | null | undefined = undefined;
    if (
      technicienId !== undefined &&
      technicienId !== existingIntervention.technicienId
    ) {
      technicienNom = technicienId
        ? await getTechnicienNomById(technicienId)
        : null;
    }

    const data: any = {
      ...(technicienId !== undefined && { technicienId }),
      ...(technicienNom !== undefined && { technicienNom }),
      ...(titre && { titre }),
      ...(description !== undefined && { description }),
      ...(datePlanifiee && { datePlanifiee: new Date(datePlanifiee) }),
      ...(dateRealisee && { dateRealisee: new Date(dateRealisee) }),
      ...(statut && { statut }),
      ...(type && { type }),
      ...(notes !== undefined && { notes }),
      ...(signature !== undefined && { signature }),
    };

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
      include: interventionCreateReturnInclude,
    });

    // Send notifications if technicienId has changed/newly assigned
    if (
      technicienId !== undefined &&
      technicienId !== null &&
      technicienId !== existingIntervention.technicienId
    ) {
      await handleInterventionAssignmentNotification(technicienId, intervention.id);
    }

    // Sync to Outlook Shared Calendar in background
    outlookService.updateOutlookEvent(intervention.id).catch((err) => {
      console.error("Erreur lors de la mise à jour de l'événement Outlook:", err);
    });

    res.json(intervention);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    console.error("Erreur lors de la mise à jour de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de l'intervention" });
  }
};

export const deleteIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    // Fetch outlookEventId before deletion
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      select: { outlookEventId: true },
    });

    await prisma.intervention.delete({
      where: { id },
    });

    if (intervention?.outlookEventId) {
      // Sync deletion to Outlook in background
      outlookService.deleteOutlookEvent(intervention.outlookEventId).catch((err) => {
        console.error("Erreur lors de la suppression de l'événement Outlook:", err);
      });
    }

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    console.error("Erreur lors de la suppression de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression de l'intervention" });
  }
};

// Mettre à jour le statut de l'intervention (Workflow)
export const updateInterventionStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const { statut, datePriseEnCharge, commentaireTechnicien } = req.body;

    // Get the intervention to check its scheduled date
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (
      req.user?.role === "technicien" &&
      existingIntervention.technicienId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
    }

    // Validate that intervention is scheduled for today when starting (en_cours)
    if (statut === "en_cours" && existingIntervention.statut === "planifiee") {
      if (!isDateScheduledForToday(existingIntervention.datePlanifiee)) {
        return res.status(400).json({
          error:
            "Impossible de prendre en charge une intervention qui n'est pas prévue pour aujourd'hui",
        });
      }
    }

    // Validate that transition to 'terminee' meets all business requirements
    if (statut === "terminee") {
      if (!existingIntervention.heureArrivee || !existingIntervention.heureDepart) {
        return res.status(400).json({
          error: "Impossible de cloturer : les heures d'arrivee et de depart doivent etre renseignees.",
        });
      }

      if (!existingIntervention.signature || !existingIntervention.signatureTechnicien) {
        return res.status(400).json({
          error: "Impossible de cloturer : les signatures du technicien et du client sont obligatoires.",
        });
      }

      const comment = commentaireTechnicien || existingIntervention.commentaireTechnicien;
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({
          error: "Impossible de cloturer : le compte-rendu technique est obligatoire.",
        });
      }
    }

    const data = buildInterventionStatusUpdateData({
      statut,
      datePriseEnCharge,
      commentaireTechnicien,
    });

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
    });

    // Sync status change to Outlook in background
    outlookService.updateOutlookEvent(intervention.id).catch((err) => {
      console.error("Erreur lors de la mise à jour de l'événement Outlook:", err);
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur updateInterventionStatus:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut" });
  }
};

// Valider les heures (Arrivée / Départ)
export const validateHours = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const { heureArrivee, heureDepart } = req.body;

    if (!heureArrivee || !heureDepart) {
      return res
        .status(400)
        .json({ error: "Heures d'arrivée et de départ requises" });
    }

    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (
      req.user?.role === "technicien" &&
      existingIntervention.technicienId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        heureArrivee: new Date(heureArrivee),
        heureDepart: new Date(heureDepart),
      },
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur validateHours:", error);
    res.status(500).json({ error: "Erreur lors de la validation des heures" });
  }
};

// Signer l'intervention
export const signIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const { type, signature } = req.body; // type: 'technicien' | 'client'

    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (
      req.user?.role === "technicien" &&
      existingIntervention.technicienId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
    }

    const data: any = {};
    if (type === "technicien") {
      data.signatureTechnicien = signature;
    } else if (type === "client") {
      data.signature = signature;
    } else {
      return res.status(400).json({ error: "Type de signature invalide" });
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur signIntervention:", error);
    res.status(500).json({ error: "Erreur lors de la signature" });
  }
};

// Gestion du matériel (Installation (depuis stock tech) / Retrait OK / Retrait HS)
export const manageEquipement = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;

    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Restriction de cloisonnement technicien
    if (
      req.user?.role === "technicien" &&
      existingIntervention.technicienId !== req.user.id
    ) {
      return res.status(403).json({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
    }

    const result = await manageInterventionEquipment({
      interventionId: id,
      stockId: req.body.stockId,
      action: req.body.action,
      quantite: req.body.quantite,
      notes: req.body.notes,
      etat: req.body.etat,
      nom: req.body.nom,
      marque: req.body.marque,
      modele: req.body.modele,
      serialNumber: req.body.serialNumber,
      reference: req.body.reference,
      categorie: req.body.categorie,
      fournisseur: req.body.fournisseur,
      dryRun: req.body.dryRun,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur manageEquipement:", error);
    return res
      .status(500)
      .json({ error: "Erreur lors de la gestion du matériel" });
  }
};

// LOCK METHODS
interface SseClient {
  id: string;
  res: Response;
}

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
export const uploadArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];


    if (files) {
      files.forEach((f) => {
        console.log(
          `[Upload] Saved file for intervention ${id}: ${f.filename} (${f.mimetype}) at ${f.path}`
        );
      });
    }

    if (!files || files.length === 0) {
      console.warn(`[Upload] No files received for ${id}`);
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    console.log(
      `[Upload] ${files.length} fichiers sauvegardés pour l'intervention ${id}`
    );

    res.json({
      success: true,
      message: `${files.length} fichiers sauvegardés`,
      files: files.map((f) => ({
        filename: f.filename,
        path: f.path,
        mimetype: f.mimetype,
      })),
    });
  } catch (error) {
    console.error("Erreur uploadArtifacts:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la sauvegarde des fichiers" });
  }
};

// Get Artifacts (List files)
import fs from "fs";
import path from "path";

export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

    const { id } = req.params;
    // Use process.cwd() for consistent path resolution
    const uploadDir = path.join(process.cwd(), `uploads/interventions/${id}`);

    if (!fs.existsSync(uploadDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir);
    const artifacts = files.map((file) => {
      // Construct full URL (assuming /uploads is served statically)
      // file format: timestamp_originalName
      // simple heuristic for type:
      let type = "autre";
      if (file.toLowerCase().endsWith(".pdf")) type = "rapport";
      else if (file.includes("avant")) type = "photo_avant";
      else if (file.includes("apres")) type = "photo_apres";
      else if (file.match(/\.(jpg|jpeg|png|gif)$/i)) type = "photo_autre";

      return {
        filename: file,
        url: `/uploads/interventions/${id}/${file}`,
        type,
        createdAt: fs.statSync(path.join(uploadDir, file)).birthtime,
      };
    });

    res.json(artifacts);
  } catch (error) {
    console.error("Erreur getArtifacts:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des fichiers" });
  }
};
