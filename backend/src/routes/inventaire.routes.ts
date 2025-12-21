import { Router } from 'express';
import { body } from 'express-validator';
import * as inventaireController from '../controllers/inventaire.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Toutes les routes inventaire nécessitent une authentification admin
router.use(authenticate);
router.use(requireAdmin);

// Scanner un code-barres (Helper)
router.post('/scan', inventaireController.scanBarcode);

// Sessions
router.post('/sessions', inventaireController.createSession);
router.get('/sessions', inventaireController.getSessions);
router.get('/sessions/:id', inventaireController.getSessionDetails);
router.put('/sessions/:id/items', inventaireController.updateSessionItems);
router.post('/sessions/:id/finalize', inventaireController.finalizeSession);
router.delete('/sessions/:id', inventaireController.deleteSession);

export default router;
