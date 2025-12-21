import { Response } from 'express';
import { validationResult } from 'express-validator';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '24h';

export const login = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Trouver le technicien
        const technicien = await prisma.technicien.findUnique({
            where: { username },
        });

        if (!technicien) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Vérifier si le compte est actif
        if (!technicien.active) {
            return res.status(401).json({ error: 'Compte désactivé' });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, technicien.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Mettre à jour la dernière connexion et créer un log
        await prisma.$transaction([
            prisma.technicien.update({
                where: { id: technicien.id },
                data: { lastLogin: new Date() },
            }),
            prisma.activityLog.create({
                data: {
                    technicienId: technicien.id,
                    action: 'LOGIN',
                    details: 'Connexion réussie',
                },
            }),
        ]);

        // Créer le token JWT
        const token = jwt.sign(
            {
                id: technicien.id,
                username: technicien.username,
                role: technicien.role,
            },
            getJwtSecret(),
            { expiresIn: getJwtExpiresIn() as any }
        );

        // Retourner les informations utilisateur et le token
        res.json({
            token,
            user: {
                id: technicien.id,
                nom: technicien.nom,
                username: technicien.username,
                role: technicien.role,
                lastLogin: new Date(),
            },
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token requis' });
        }

        // Vérifier le token
        const decoded = jwt.verify(token, getJwtSecret()) as {
            id: string;
            username: string;
            role: string;
        };

        // Créer un nouveau token
        const newToken = jwt.sign(
            {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role,
            },
            getJwtSecret(),
            { expiresIn: getJwtExpiresIn() as any }
        );

        res.json({ token: newToken });
    } catch (error) {
        res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, getJwtSecret()) as {
            id: string;
            username: string;
            role: string;
        };

        const technicien = await prisma.technicien.findUnique({
            where: { id: decoded.id },
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

        res.json({ user: technicien });
    } catch (error) {
        res.status(401).json({ error: 'Token invalide' });
    }
};
