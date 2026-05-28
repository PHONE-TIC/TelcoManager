import { Router } from "express";
import { body, param } from "express-validator";
import * as interventionController from "../controllers/interventions.controller";
import {
  authenticate,
  requireGestionnaireOrAdmin,
  requireTechnicienOrAdmin,
  requireInterventionAccess,
} from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Obtenir toutes les interventions avec filtres
router.get("/", interventionController.getAllInterventions);

// Stream temps réel des verrous d'interventions
router.get("/locks/stream", interventionController.locksStream);

// Obtenir une intervention par ID (cloisonné)
router.get(
  "/:id",
  param("id").isUUID(),
  requireInterventionAccess,
  interventionController.getInterventionById
);

// Créer une nouvelle intervention (admin seulement)
router.post(
  "/",
  requireGestionnaireOrAdmin,
  [
    body("clientId").isUUID().withMessage("Client ID requis"),
    body("technicienId").optional().isUUID(),
    body("titre").notEmpty().withMessage("Titre requis"),
    body("description").optional(),
    body("datePlanifiee").isISO8601().withMessage("Date planifiée invalide"),
    body("statut")
      .optional()
      .isIn(["planifiee", "en_cours", "terminee", "annulee"]),
  ],
  interventionController.createIntervention
);

// Mettre à jour une intervention (cloisonné)
router.put(
  "/:id",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    requireInterventionAccess,
    body("technicienId").optional().isUUID(),
    body("titre").optional().notEmpty(),
    body("description").optional(),
    body("datePlanifiee").optional().isISO8601(),
    body("dateRealisee").optional().isISO8601(),
    body("statut")
      .optional()
      .isIn(["planifiee", "en_cours", "terminee", "annulee"]),
    body("notes").optional(),
  ],
  interventionController.updateIntervention
);

// Supprimer une intervention (admin seulement)
router.delete(
  "/:id",
  requireGestionnaireOrAdmin,
  param("id").isUUID(),
  interventionController.deleteIntervention
);

// Mettre à jour le statut (Workflow - cloisonné)
router.put(
  "/:id/status",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    requireInterventionAccess,
    body("statut").isIn(["planifiee", "en_cours", "terminee", "annulee"]),
    body("datePriseEnCharge").optional().isISO8601(),
  ],
  interventionController.updateInterventionStatus
);

// Valider les heures (cloisonné)
router.put(
  "/:id/hours",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    requireInterventionAccess,
    body("heureArrivee").isISO8601(),
    body("heureDepart").isISO8601(),
  ],
  interventionController.validateHours
);

// Signer l'intervention (cloisonné)
router.put(
  "/:id/sign",
  requireTechnicienOrAdmin, // Le client signe via le device du technicien
  [
    param("id").isUUID(),
    requireInterventionAccess,
    body("type").isIn(["technicien", "client"]),
    body("signature").notEmpty(),
  ],
  interventionController.signIntervention
);

// Ajouter/Gérer du matériel (cloisonné)
router.post(
  "/:id/equipements",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    requireInterventionAccess,
    body("stockId").optional().isUUID().withMessage("Stock ID invalide"),
    body("action").isIn(["install", "retrait"]), // Simplified actions
    body("etat").optional().isIn(["ok", "hs"]), // For removal
    body("quantite").optional().isInt({ min: 1 }).toInt(),
    body("notes").optional(),
    body("nom").optional().isString(),
    body("marque").optional().isString(),
    body("modele").optional().isString(),
    body("serialNumber").optional().isString(),
    body("reference").optional().isString(),
    body("categorie").optional().isString(),
    body("fournisseur").optional().isString(),
    body("dryRun").optional().isBoolean().toBoolean(),
  ],
  interventionController.manageEquipement
);

// Verrouillage (Concurrency - cloisonné)
router.post(
  "/:id/lock",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  requireInterventionAccess,
  interventionController.lockIntervention
);
router.post(
  "/:id/unlock",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  requireInterventionAccess,
  interventionController.unlockIntervention
);

// Upload Artifacts (Photos + PDF - cloisonné en amont du chargement fichier)
router.post(
  "/:id/artifacts",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  requireInterventionAccess,
  upload.array("files"), // 'files' is the field name matching FormData
  interventionController.uploadArtifacts
);

// Get Artifacts (cloisonné)
router.get(
  "/:id/artifacts",
  param("id").isUUID(),
  requireInterventionAccess,
  interventionController.getArtifacts
);

export default router;
