import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../db';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        let token = '';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token && typeof req.query.token === 'string') {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Token manquant ou invalide' });
        }

        const secret = process.env.JWT_SECRET || 'your-secret-key';

        const decoded = jwt.verify(token, secret) as {
            id: string;
            username: string;
            role: string;
        };

        // Vérifier si l'utilisateur existe toujours en base de données et s'il est actif
        const dbUser = await prisma.technicien.findUnique({
            where: { id: decoded.id }
        });

        if (!dbUser) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou session expirée' });
        }

        if (!dbUser.active) {
            return res.status(403).json({ error: 'Compte désactivé. Accès refusé.' });
        }

        // Réconcilier et utiliser les données réelles de la base (dont le rôle mis à jour)
        req.user = {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role
        };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
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

        // Restriction de cloisonnement : seuls l'assignataire de la fiche, un admin ou un gestionnaire peuvent y accéder
        if (req.user?.role === 'technicien' && intervention.technicienId !== req.user.id) {
            return res.status(403).json({ error: "Accès refusé - Vous n'êtes pas assigné à cette intervention" });
        }

        next();
    } catch (error) {
        console.error('requireInterventionAccess error:', error);
        return res.status(500).json({ error: "Erreur serveur lors de la vérification des accès" });
    }
};
