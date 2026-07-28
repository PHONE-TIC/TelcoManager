import { Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';
import { respondValidationError } from './controller.utils';
import { authenticateUser, refreshJwtToken } from '../services/auth.service';
import {
    getJwtSecret,
    STREAM_TICKET_EXPIRES_IN_SECONDS,
    STREAM_TICKET_TYPE,
} from '../config/jwt';
import { prisma } from '../db';

export const login = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const username = typeof req.body.username === 'string' ? req.body.username.trim() : req.body.username;
        const result = await authenticateUser(username, req.body.password);
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

        const newToken = await refreshJwtToken(token);
        return res.json({ token: newToken });
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

/**
 * Délivre un ticket éphémère permettant d'ouvrir un flux SSE.
 *
 * L'appel est authentifié par le jeton de session habituel (en-tête
 * Authorization). Le ticket renvoyé est valable quelques secondes et ne sert
 * qu'à ouvrir le flux : c'est lui, et non le jeton de session, qui transite
 * dans l'URL de l'EventSource.
 */
export const createStreamTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const ticket = jwt.sign(
            {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role,
                typ: STREAM_TICKET_TYPE,
            },
            getJwtSecret(),
            { expiresIn: STREAM_TICKET_EXPIRES_IN_SECONDS }
        );

        return res.json({
            ticket,
            expiresIn: STREAM_TICKET_EXPIRES_IN_SECONDS,
        });
    } catch (error) {
        console.error('Erreur lors de la création du ticket de flux:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du ticket' });
    }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const technicien = await prisma.technicien.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                nom: true,
                username: true,
                role: true,
                active: true,
            },
        });

        if (!technicien) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (!technicien.active) {
            return res.status(403).json({ error: 'Compte désactivé. Accès refusé.' });
        }

        return res.json({ user: technicien });
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};
