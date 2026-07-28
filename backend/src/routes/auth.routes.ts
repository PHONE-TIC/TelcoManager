import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Login
router.post(
    '/login',
    [
        body('username').notEmpty().withMessage('Nom d\'utilisateur requis'),
        body('password').notEmpty().withMessage('Mot de passe requis'),
    ],
    authController.login
);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Get current user info
router.get('/me', authenticate, authController.getCurrentUser);

// Ticket éphémère pour l'ouverture d'un flux SSE (EventSource ne permet pas
// d'émettre d'en-tête Authorization)
router.post('/stream-ticket', authenticate, authController.createStreamTicket);

export default router;
