import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../db';
import { getJwtSecret, STREAM_TICKET_TYPE } from '../config/jwt';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

type DecodedToken = {
    id: string;
    username: string;
    role: string;
    typ?: string;
};

/**
 * Vérifie un jeton et réconcilie l'identité avec la base.
 *
 * Le rôle et l'état d'activation sont relus à chaque requête plutôt que lus
 * dans le jeton : une désactivation de compte ou une rétrogradation prend ainsi
 * effet immédiatement, sans attendre l'expiration du jeton déjà distribué.
 */
async function resolveTokenUser(
    token: string,
    expectedType: typeof STREAM_TICKET_TYPE | null
) {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

    // Un ticket de flux n'ouvre que le flux ; un jeton de session ne peut pas
    // être présenté à la place d'un ticket. Les deux sens sont refusés.
    if ((decoded.typ ?? null) !== expectedType) {
        return { error: 'forbidden-type' as const };
    }

    const dbUser = await prisma.technicien.findUnique({
        where: { id: decoded.id }
    });

    if (!dbUser) {
        return { error: 'unknown-user' as const };
    }

    if (!dbUser.active) {
        return { error: 'inactive' as const };
    }

    return {
        user: {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role
        }
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        // Le jeton de session ne transite que par l'en-tête Authorization :
        // le passer en paramètre d'URL l'exposerait aux journaux d'accès et à
        // l'historique du navigateur. Les flux SSE utilisent un ticket dédié.
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant ou invalide' });
        }

        const result = await resolveTokenUser(authHeader.substring(7), null);

        if (result.error === 'inactive') {
            return res.status(403).json({ error: 'Compte désactivé. Accès refusé.' });
        }

        if (result.error) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou session expirée' });
        }

        req.user = result.user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

/**
 * Authentifie un flux SSE au moyen d'un ticket éphémère passé en paramètre
 * d'URL, seule option praticable avec l'API EventSource.
 */
export const authenticateStreamTicket = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';

        if (!ticket) {
            return res.status(401).json({ error: 'Ticket de flux manquant' });
        }

        const result = await resolveTokenUser(ticket, STREAM_TICKET_TYPE);

        if (result.error === 'inactive') {
            return res.status(403).json({ error: 'Compte désactivé. Accès refusé.' });
        }

        if (result.error) {
            return res.status(401).json({ error: 'Ticket de flux invalide ou expiré' });
        }

        req.user = result.user;
        next();
    } catch (error) {
        console.error('Stream ticket middleware error:', error);
        return res.status(401).json({ error: 'Ticket de flux invalide ou expiré' });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé - Administrateur requis' });
    }

    next();
};

export const requireGestionnaireOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'gestionnaire') {
        return res.status(403).json({ error: 'Accès refusé - Gestionnaire ou Admin requis' });
    }

    next();
};

export const requireTechnicienOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!['admin', 'technicien', 'gestionnaire'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
};

export const requireInterventionAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ID d'intervention manquant" });
        }

        const intervention = await prisma.intervention.findUnique({
            where: { id }
        });

        if (!intervention) {
            return res.status(404).json({ error: "Intervention non trouvée" });
        }

        if (!req.user) {
            return res.status(401).json({ error: "Non authentifié" });
        }

        // Restriction de cloisonnement (Default-Deny) : seuls un admin, un gestionnaire, ou le technicien assigné à la fiche peuvent y accéder
        if (req.user.role === 'admin' || req.user.role === 'gestionnaire') {
            return next();
        }

        if (req.user.role === 'technicien') {
            if (intervention.technicienId !== req.user.id) {
                return res.status(403).json({ error: "Accès refusé - Vous n'êtes pas assigné à cette intervention" });
            }
            return next();
        }

        return res.status(403).json({ error: "Accès refusé" });
    } catch (error) {
        console.error('requireInterventionAccess error:', error);
        return res.status(500).json({ error: "Erreur serveur lors de la vérification des accès" });
    }
};
