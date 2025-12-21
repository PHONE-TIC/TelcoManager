import { Router } from 'express';
import { body, param } from 'express-validator';
import * as technicienController from '../controllers/techniciens.controller';
import { authenticate, requireAdmin, requireGestionnaireOrAdmin } from '../middleware/auth.middleware';

const router = Router();

// Authentification requise pour toutes les routes
router.use(authenticate);

// Obtenir tous les techniciens (Accessible aux gestionnaires pour le planning)
router.get('/', requireGestionnaireOrAdmin, technicienController.getAllTechniciens);

// Obtenir un technicien par ID (Accessible aux gestionnaires)
router.get('/:id', requireGestionnaireOrAdmin, param('id').isUUID(), technicienController.getTechnicienById);

// Obtenir le planning d'un technicien (Accessible aux gestionnaires)
router.get('/:id/planning', requireGestionnaireOrAdmin, param('id').isUUID(), technicienController.getTechnicienPlanning);

// Créer un nouveau technicien (Admin seulement)
router.post(
    '/',
    requireAdmin,
    [
        body('nom').notEmpty().withMessage('Nom requis'),
        body('username').notEmpty().withMessage('Nom d\'utilisateur requis'),
        body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
        body('role').optional().isIn(['technicien', 'admin', 'gestionnaire']).withMessage('Rôle invalide'),
    ],
    technicienController.createTechnicien
);

// Mettre à jour un technicien (Admin seulement)
router.put(
    '/:id',
    requireAdmin,
    [
        param('id').isUUID(),
        body('nom').optional().notEmpty(),
        body('username').optional().notEmpty(),
        body('password').optional().isLength({ min: 6 }),
        body('role').optional().isIn(['technicien', 'admin', 'gestionnaire']),
        body('active').optional().isBoolean(),
    ],
    technicienController.updateTechnicien
);

// Supprimer un technicien (Admin seulement)
router.delete('/:id', requireAdmin, param('id').isUUID(), technicienController.deleteTechnicien);

export default router;
