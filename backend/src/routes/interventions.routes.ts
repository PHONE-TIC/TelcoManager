import { Router } from "express";
import { body, param } from "express-validator";
import * as interventionController from "../controllers/interventions.controller";
import {
  authenticate,
  requireGestionnaireOrAdmin,
  requireTechnicienOrAdmin,
} from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Obtenir toutes les interventions avec filtres
router.get("/", interventionController.getAllInterventions);

// Obtenir une intervention par ID
router.get(
  "/:id",
  param("id").isUUID(),
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

// Mettre à jour une intervention
router.put(
  "/:id",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
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

// Mettre à jour le statut (Workflow)
router.put(
  "/:id/status",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    body("statut").isIn(["planifiee", "en_cours", "terminee", "annulee"]),
    body("datePriseEnCharge").optional().isISO8601(),
  ],
  interventionController.updateInterventionStatus
);

// Valider les heures
router.put(
  "/:id/hours",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    body("heureArrivee").isISO8601(),
    body("heureDepart").isISO8601(),
  ],
  interventionController.validateHours
);

// Signer l'intervention
router.put(
  "/:id/sign",
  requireTechnicienOrAdmin, // Le client signe via le device du technicien
  [
    param("id").isUUID(),
    body("type").isIn(["technicien", "client"]),
    body("signature").notEmpty(),
  ],
  interventionController.signIntervention
);

// Ajouter/Gérer du matériel
router.post(
  "/:id/equipements",
  requireTechnicienOrAdmin,
  [
    param("id").isUUID(),
    body("stockId").isUUID().withMessage("Stock ID requis"),
    body("action").isIn(["install", "retrait"]), // Simplified actions
    body("etat").optional().isIn(["ok", "hs"]), // For removal
    body("quantite").optional().isInt({ min: 1 }),
    body("notes").optional(),
  ],
  interventionController.manageEquipement
);

// Verrouillage (Concurrency)
router.post(
  "/:id/lock",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  interventionController.lockIntervention
);
router.post(
  "/:id/unlock",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  interventionController.unlockIntervention
);

// Upload Artifacts (Photos + PDF)
router.post(
  "/:id/artifacts",
  requireTechnicienOrAdmin,
  param("id").isUUID(),
  upload.array("files"), // 'files' is the field name matching FormData
  interventionController.uploadArtifacts
);

// Get Artifacts
router.get(
  "/:id/artifacts",
  authenticate, // Anyone authenticated can see artifacts? Or check role?
  // Let's use authenticate for now, as Tech/Admin access is mainly handled by middleware
  param("id").isUUID(),
  interventionController.getArtifacts
);

export default router;
