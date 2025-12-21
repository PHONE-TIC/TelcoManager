import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtenir le stock du véhicule d'un technicien
export const getTechnicianStock = async (req: Request, res: Response) => {
    try {
        const { technicienId } = req.params;

        const vehicleStock = await prisma.technicianStock.findMany({
            where: { technicienId },
            include: {
                stock: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(vehicleStock);
    } catch (error) {
        console.error('Erreur getTechnicianStock:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du stock véhicule' });
    }
};

// Ajouter un matériel au véhicule
export const addItemToVehicle = async (req: Request, res: Response) => {
    try {
        const { technicienId } = req.params;
        const { stockId, quantite } = req.body;

        if (!stockId) {
            return res.status(400).json({ error: 'stockId est requis' });
        }

        // Vérifier si le matériel existe déjà dans le véhicule
        const existing = await prisma.technicianStock.findUnique({
            where: {
                technicienId_stockId: {
                    technicienId,
                    stockId,
                },
            },
        });

        if (existing) {
            // Mettre à jour la quantité si le matériel existe déjà
            const updated = await prisma.technicianStock.update({
                where: {
                    technicienId_stockId: {
                        technicienId,
                        stockId,
                    },
                },
                data: {
                    quantite: existing.quantite + (quantite || 1),
                },
                include: {
                    stock: true,
                },
            });
            return res.json(updated);
        }

        // Créer un nouvel élément
        const vehicleItem = await prisma.technicianStock.create({
            data: {
                technicienId,
                stockId,
                quantite: quantite || 1,
            },
            include: {
                stock: true,
            },
        });

        res.status(201).json(vehicleItem);
    } catch (error) {
        console.error('Erreur addItemToVehicle:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du matériel au véhicule' });
    }
};

// Mettre à jour la quantité d'un matériel dans le véhicule
export const updateItemQuantity = async (req: Request, res: Response) => {
    try {
        const { technicienId, stockId } = req.params;
        const { quantite } = req.body;

        if (quantite === undefined || quantite === null) {
            return res.status(400).json({ error: 'quantite est requis' });
        }

        // Si quantité <= 0, supprimer l'élément
        if (quantite <= 0) {
            await prisma.technicianStock.delete({
                where: {
                    technicienId_stockId: {
                        technicienId,
                        stockId,
                    },
                },
            });
            return res.json({ message: 'Matériel retiré du véhicule' });
        }

        // Mettre à jour la quantité
        const updated = await prisma.technicianStock.update({
            where: {
                technicienId_stockId: {
                    technicienId,
                    stockId,
                },
            },
            data: {
                quantite,
            },
            include: {
                stock: true,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Erreur updateItemQuantity:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la quantité' });
    }
};

// Retirer un matériel du véhicule
export const removeItemFromVehicle = async (req: Request, res: Response) => {
    try {
        const { technicienId, stockId } = req.params;

        await prisma.technicianStock.delete({
            where: {
                technicienId_stockId: {
                    technicienId,
                    stockId,
                },
            },
        });

        res.json({ message: 'Matériel retiré du véhicule avec succès' });
    } catch (error) {
        console.error('Erreur removeItemFromVehicle:', error);
        res.status(500).json({ error: 'Erreur lors du retrait du matériel' });
    }
};
