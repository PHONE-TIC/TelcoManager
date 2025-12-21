import { Router } from 'express';
import { body, param } from 'express-validator';
import * as stockController from '../controllers/stock.controller';
import { authenticate, requireGestionnaireOrAdmin } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Permettre à tout utilisateur authentifié (y compris techniciens) de VOIR le stock
// nécessaire pour qu'ils puissent ajouter du matériel à leur propre véhicule

// Obtenir tout le stock avec filtres
router.get('/', stockController.getAllStock);

// Obtenir un article de stock par ID
router.get('/:id', param('id').isUUID(), stockController.getStockById);

// Rechercher par code-barres
router.get('/barcode/:codeBarre', stockController.getStockByBarcode);

// Statistiques du stock (Lecture seule mais peut-être sensible? On laisse ouvert aux techs pour l'instant ou on restreint)
router.get('/stats/summary', stockController.getStockStats);


// --- Routes nécessitant des droits Gestionnaire ou Admin ---
router.use(requireGestionnaireOrAdmin);

// Créer un nouvel article de stock
router.post(
    '/',
    [
        body('nomMateriel').notEmpty().withMessage('Nom du matériel requis'),
        body('reference').notEmpty().withMessage('Référence requise'),
        body('codeBarre').optional(),
        body('categorie').notEmpty().withMessage('Catégorie requise'),
        body('statut').optional().isIn(['courant', 'hs']),
        body('quantite').optional().isInt({ min: 0 }),
        body('notes').optional(),
    ],
    stockController.createStock
);

// Mettre à jour un article de stock
router.put(
    '/:id',
    [
        param('id').isUUID(),
        body('nomMateriel').optional().notEmpty(),
        body('reference').optional().notEmpty(),
        body('codeBarre').optional(),
        body('categorie').optional().notEmpty(),
        body('statut').optional().isIn(['courant', 'hs']),
        body('quantite').optional().isInt({ min: 0 }),
        body('notes').optional(),
    ],
    stockController.updateStock
);

// Supprimer un article de stock
router.delete('/:id', param('id').isUUID(), stockController.deleteStock);

// Déplacer du stock vers HS
router.post(
    '/:id/move-to-hs',
    [
        param('id').isUUID(),
        body('quantite').optional().isInt({ min: 1 }),
        body('notes').optional(),
    ],
    stockController.moveToHS
);

export default router;
