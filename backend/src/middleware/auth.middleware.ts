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

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant ou invalide' });
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'your-secret-key';

        const decoded = jwt.verify(token, secret) as {
            id: string;
            username: string;
            role: string;
        };

        // Vérifier si l'utilisateur existe toujours en base de données
        // (Important après un seed qui regenère les IDs)
        const userExists = await prisma.technicien.findUnique({
            where: { id: decoded.id }
        });

        if (!userExists) {
            return res.status(401).json({ error: 'Utilisateur introuvable ou session expirée' });
        }

        req.user = decoded;
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
