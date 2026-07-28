import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { notifyNewIntervention } from "../services/push.service";
import * as outlookService from "../services/outlook.service";
import {
  buildFinalInterventionNumero,
  buildTemporaryInterventionNumero,
  getClientNomById,
  getTechnicienNomById,
  isClosedInterventionStatus,
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

/**
 * Cycle de vie d'une intervention : consultation, création, modification et
 * suppression. Le déroulé terrain, les verrous d'édition et les pièces jointes
 * sont traités par les modules interventions-workflow, interventions-locks et
 * interventions-artifacts.
 */
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

    // Vérifier les références avant l'écriture : sans ce contrôle, une clé
    // étrangère invalide remonte en violation de contrainte PostgreSQL et se
    // traduit par une erreur 500 opaque au lieu d'un refus explicite.
    if (!clientNom) {
      return res.status(400).json({ error: "Client introuvable" });
    }

    if (technicienId && !technicienNom) {
      return res.status(400).json({ error: "Technicien introuvable" });
    }

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
