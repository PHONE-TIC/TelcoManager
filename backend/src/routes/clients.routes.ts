import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as clientController from '../controllers/clients.controller';
import { authenticate, requireGestionnaireOrAdmin } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes clients nécessitent une authentification admin
router.use(authenticate);
router.use(requireGestionnaireOrAdmin);

// Obtenir tous les clients avec pagination et recherche
router.get('/', clientController.getAllClients);

// Obtenir un client par ID
router.get('/:id', param('id').isUUID(), clientController.getClientById);

// Obtenir l'historique des interventions d'un client
router.get('/:id/interventions', param('id').isUUID(), clientController.getClientInterventions);

// Obtenir les équipements d'un client
router.get('/:id/equipements', param('id').isUUID(), clientController.getClientEquipements);

// Créer un nouveau client
router.post(
    '/',
    [
        body('nom').notEmpty().withMessage('Nom requis'),
        body('rue').notEmpty().withMessage('Rue requise'),
        body('codePostal').notEmpty().withMessage('Code postal requis'),
        body('ville').notEmpty().withMessage('Ville requise'),
        body('contact').notEmpty().withMessage('Contact requis'),
        body('telephone').notEmpty().withMessage('Téléphone requis'),
    ],
    clientController.createClient
);

// Mettre à jour un client
router.put(
    '/:id',
    [
        param('id').isUUID(),
        body('nom').optional().notEmpty(),
        body('rue').optional().notEmpty(),
        body('codePostal').optional().notEmpty(),
        body('ville').optional().notEmpty(),
        body('contact').optional().notEmpty(),
        body('telephone').optional().notEmpty(),
    ],
    clientController.updateClient
);

// Supprimer un client
router.delete('/:id', param('id').isUUID(), clientController.deleteClient);

export default router;
