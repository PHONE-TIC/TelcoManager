import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth.middleware";
import { notifyNewIntervention } from "../services/push.service";
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
    if (technicienId) where.technicienId = technicienId;
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

    res.json(intervention);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'intervention" });
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

    // Send push notification to assigned technician
    if (technicienId) {
      notifyNewIntervention(technicienId, {
        id: intervention.id,
        numero: intervention.numero,
        titre: intervention.titre,
        datePlanifiee: intervention.datePlanifiee,
        client: intervention.client,
      }).catch((err) => {
        console.error("Failed to send push notification:", err);
      });
    }

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

    await prisma.intervention.delete({
      where: { id },
    });

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
    const { id } = req.params;
    const { statut, datePriseEnCharge, commentaireTechnicien } = req.body;

    // Get the intervention to check its scheduled date
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
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

    const data = buildInterventionStatusUpdateData({
      statut,
      datePriseEnCharge,
      commentaireTechnicien,
    });

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
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
    const { id } = req.params;
    const { heureArrivee, heureDepart } = req.body;

    if (!heureArrivee || !heureDepart) {
      return res
        .status(400)
        .json({ error: "Heures d'arrivée et de départ requises" });
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
    const { id } = req.params;
    const { type, signature } = req.body; // type: 'technicien' | 'client'

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
    const { id } = req.params;
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
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur manageEquipement:", error);
    return res
      .status(500)
      .json({ error: "Erreur lors de la gestion du matériel" });
  }
};

// LOCK MTEHODS
export const lockIntervention = async (req: AuthRequest, res: Response) => {
  try {
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

    res.json({ success: true, message: "Intervention verrouillée" });
  } catch (error) {
    console.error("Erreur lockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du verrouillage" });
  }
};

export const unlockIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Optional: Only allow unlock if locked by self or admin?
    // For MVP, just unlock.

    await unlockInterventionById(id);

    res.json({ success: true, message: "Intervention déverrouillée" });
  } catch (error) {
    console.error("Erreur unlockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du déverrouillage" });
  }
};

// Upload artifacts (Photos + Report)
export const uploadArtifacts = async (req: AuthRequest, res: Response) => {
  try {
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
