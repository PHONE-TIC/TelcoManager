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
