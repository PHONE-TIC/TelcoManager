import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import * as outlookService from "../services/outlook.service";
import { manageInterventionEquipment } from "../services/intervention-equipment.service";
import {
  buildInterventionStatusUpdateData,
  isDateScheduledForToday,
} from "./interventions.controller.helpers";
import { respondValidationError } from "./controller.utils";

/**
 * Déroulé d'une intervention sur le terrain : changement de statut, saisie des
 * heures d'arrivée et de départ, signatures et matériel posé ou repris.
 */
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
