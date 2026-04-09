import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { respondValidationError } from './controller.utils';
import { authenticateUser, getAuthenticatedUserFromToken, refreshJwtToken } from '../services/auth.service';

export const login = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const result = await authenticateUser(req.body.username, req.body.password);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token requis' });
        }

        const newToken = refreshJwtToken(token);
        return res.json({ token: newToken });
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const technicien = await getAuthenticatedUserFromToken(authHeader.substring(7));

        if (!technicien) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        return res.json({ user: technicien });
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide' });
    }
};
