import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';
import { buildPagination, parsePagination, respondValidationError } from './controller.utils';
import { interventionClientListSelect } from './prisma-selects';
import { createTechnicienRecord, deleteTechnicienRecord, updateTechnicienRecord } from '../services/technicien-write.service';

export const getAllTechniciens = async (req: AuthRequest, res: Response) => {
    try {
        const { active, page = '1', limit = '50' } = req.query;
        const { page: currentPage, limit: pageSize, skip } = parsePagination({
            page: page as string,
            limit: limit as string,
        });

        const where = active !== undefined ? { active: active === 'true' } : {};

        const [techniciens, total] = await Promise.all([
            prisma.technicien.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { nom: 'asc' },
                select: {
                    id: true,
                    nom: true,
                    username: true,
                    role: true,
                    active: true,
                    lastLogin: true,
                    createdAt: true,
                    _count: {
                        select: {
                            interventions: true,
                        },
                    },
                },
            }),
            prisma.technicien.count({ where }),
        ]);

        res.json({
            techniciens,
            pagination: {
                ...buildPagination(currentPage, pageSize, total),
            },
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des techniciens:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des techniciens' });
    }
};

export const getTechnicienById = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const { id } = req.params;

        const technicien = await prisma.technicien.findUnique({
            where: { id },
            select: {
                id: true,
                nom: true,
                username: true,
                role: true,
                active: true,
                lastLogin: true,
                createdAt: true,
                _count: {
                    select: {
                        interventions: true,
                    },
                },
                activityLogs: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!technicien) {
            return res.status(404).json({ error: 'Technicien non trouvé' });
        }

        res.json(technicien);
    } catch (error) {
        console.error('Erreur lors de la récupération du technicien:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du technicien' });
    }
};

export const getTechnicienPlanning = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const where: any = {
            technicienId: id,
        };

        if (startDate && endDate) {
            where.datePlanifiee = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const interventions = await prisma.intervention.findMany({
            where,
            include: {
                client: {
                    select: interventionClientListSelect,
                },
            },
            orderBy: { datePlanifiee: 'asc' },
        });

        res.json(interventions);
    } catch (error) {
        console.error('Erreur lors de la récupération du planning:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du planning' });
    }
};

export const createTechnicien = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const result = await createTechnicienRecord(req.body);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error('Erreur lors de la création du technicien:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du technicien' });
    }
};

export const updateTechnicien = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        const technicien = await updateTechnicienRecord(req.params.id, req.body);
        return res.json(technicien);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Technicien non trouvé' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Nom d'utilisateur déjà utilisé" });
        }
        console.error('Erreur lors de la mise à jour du technicien:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du technicien' });
    }
};

export const deleteTechnicien = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return respondValidationError(res, errors.array());
        }

        await deleteTechnicienRecord(req.params.id);
        return res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Technicien non trouvé' });
        }
        console.error('Erreur lors de la suppression du technicien:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du technicien' });
    }
};
