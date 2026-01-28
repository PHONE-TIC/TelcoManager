import { Router } from "express";
import { body, param } from "express-validator";
import * as stockController from "../controllers/stock.controller";
import {
  authenticate,
  requireAdmin,
  requireGestionnaireOrAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Permettre à tout utilisateur authentifié (y compris techniciens) de VOIR le stock
// nécessaire pour qu'ils puissent ajouter du matériel à leur propre véhicule

// Obtenir tout le stock avec filtres
router.get("/", stockController.getAllStock);

// Obtenir un article de stock par ID
router.get("/:id", param("id").isUUID(), stockController.getStockById);

// Rechercher par code-barres
router.get("/barcode/:codeBarre", stockController.getStockByBarcode);

// Rechercher par numéro de série
router.get("/serial/:numeroSerie", stockController.getStockBySerial);

// Statistiques du stock (Lecture seule mais peut-être sensible? On laisse ouvert aux techs pour l'instant ou on restreint)
router.get("/stats/summary", stockController.getStockStats);

// --- Routes nécessitant des droits Gestionnaire ou Admin ---
router.use(requireGestionnaireOrAdmin);

// Créer un nouvel article de stock
router.post(
  "/",
  [
    body("nomMateriel").optional(), // Généré automatiquement si non fourni
    body("reference").optional(), // Généré automatiquement si non fourni
    body("marque").notEmpty().withMessage("Marque requise"),
    body("modele").optional().isString(),
    body("codeBarre").optional(),
    body("categorie").notEmpty().withMessage("Catégorie requise"),
    body("statut").optional().isIn(["courant", "hs", "retour_fournisseur"]),
    body("quantite").optional().isInt({ min: 0 }),
    body("notes").optional(),
  ],
  stockController.createStock
);

// Mettre à jour un article de stock
router.put(
  "/:id",
  [
    param("id").isUUID(),
    body("nomMateriel").optional().notEmpty(),
    body("reference").optional().notEmpty(),
    body("marque").optional().isString(),
    body("modele").optional().isString(),
    body("codeBarre").optional(),
    body("categorie").optional().notEmpty(),
    body("statut").optional().isIn(["courant", "hs", "retour_fournisseur"]),
    body("quantite").optional().isInt({ min: 0 }),
    body("notes").optional(),
  ],
  stockController.updateStock
);

// Supprimer un article de stock (Admin uniquement)
router.delete(
  "/:id",
  requireAdmin,
  param("id").isUUID(),
  stockController.deleteStock
);

// Déplacer du stock vers HS
router.post(
  "/:id/move-to-hs",
  [
    param("id").isUUID(),
    body("quantite").optional().isInt({ min: 1 }),
    body("notes").optional(),
  ],
  stockController.moveToHS
);

export default router;
