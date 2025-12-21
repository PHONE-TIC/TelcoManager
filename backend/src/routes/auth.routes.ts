import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';

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
router.get('/me', authController.getCurrentUser);

export default router;
