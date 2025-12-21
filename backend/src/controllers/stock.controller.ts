import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllStock = async (req: AuthRequest, res: Response) => {
    try {
        const { statut, categorie, search, page = '1', limit = '50' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = {};

        if (statut) where.statut = statut;
        if (categorie) where.categorie = categorie;
        if (search) {
            where.OR = [
                { nomMateriel: { contains: search as string, mode: 'insensitive' as const } },
                { reference: { contains: search as string, mode: 'insensitive' as const } },
                { codeBarre: { contains: search as string } },
            ];
        }

        const [stock, total] = await Promise.all([
            prisma.stock.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                orderBy: { nomMateriel: 'asc' },
            }),
            prisma.stock.count({ where }),
        ]);

        res.json({
            stock,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du stock:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du stock' });
    }
};

export const getStockById = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        const stock = await prisma.stock.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        clientEquipements: true,
                        interventionEquipements: true,
                    },
                },
            },
        });

        if (!stock) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.json(stock);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'article:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'article' });
    }
};

export const getStockByBarcode = async (req: AuthRequest, res: Response) => {
    try {
        const { codeBarre } = req.params;

        const stock = await prisma.stock.findUnique({
            where: { codeBarre },
        });

        if (!stock) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.json(stock);
    } catch (error) {
        console.error('Erreur lors de la recherche par code-barres:', error);
        res.status(500).json({ error: 'Erreur lors de la recherche' });
    }
};

export const createStock = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nomMateriel, reference, codeBarre, categorie, statut = 'courant', quantite = 1, notes } = req.body;

        const stock = await prisma.stock.create({
            data: {
                nomMateriel,
                reference,
                codeBarre,
                categorie,
                statut,
                quantite,
                notes,
            },
        });

        res.status(201).json(stock);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Code-barres déjà utilisé' });
        }
        console.error('Erreur lors de la création de l\'article:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
    }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { nomMateriel, reference, codeBarre, categorie, statut, quantite, notes } = req.body;

        const data: any = {
            ...(nomMateriel && { nomMateriel }),
            ...(reference && { reference }),
            ...(codeBarre !== undefined && { codeBarre }),
            ...(categorie && { categorie }),
            ...(statut && { statut }),
            ...(quantite !== undefined && { quantite }),
            ...(notes !== undefined && { notes }),
        };

        const stock = await prisma.stock.update({
            where: { id },
            data,
        });

        res.json(stock);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Code-barres déjà utilisé' });
        }
        console.error('Erreur lors de la mise à jour de l\'article:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article' });
    }
};

export const deleteStock = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        await prisma.stock.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        console.error('Erreur lors de la suppression de l\'article:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
    }
};

export const moveToHS = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { quantite, notes } = req.body;

        const stockCourant = await prisma.stock.findUnique({
            where: { id },
        });

        if (!stockCourant) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        if (stockCourant.statut !== 'courant') {
            return res.status(400).json({ error: 'Cet article n\'est pas en stock courant' });
        }

        const qteADeplacer = quantite || stockCourant.quantite;

        if (qteADeplacer > stockCourant.quantite) {
            return res.status(400).json({ error: 'Quantité insuffisante en stock' });
        }

        // Diminuer le stock courant
        await prisma.stock.update({
            where: { id },
            data: {
                quantite: stockCourant.quantite - qteADeplacer,
            },
        });

        // Créer ou mettre à jour le stock HS
        const stockHS = await prisma.stock.findFirst({
            where: {
                reference: stockCourant.reference,
                statut: 'hs',
            },
        });

        if (stockHS) {
            await prisma.stock.update({
                where: { id: stockHS.id },
                data: {
                    quantite: stockHS.quantite + qteADeplacer,
                    notes: notes || stockHS.notes,
                },
            });
        } else {
            await prisma.stock.create({
                data: {
                    nomMateriel: stockCourant.nomMateriel,
                    reference: stockCourant.reference,
                    categorie: stockCourant.categorie,
                    statut: 'hs',
                    quantite: qteADeplacer,
                    notes: notes || 'Matériel hors service',
                },
            });
        }

        res.json({ message: `${qteADeplacer} unité(s) déplacée(s) vers le stock HS` });
    } catch (error) {
        console.error('Erreur lors du déplacement vers HS:', error);
        res.status(500).json({ error: 'Erreur lors du déplacement' });
    }
};

export const getStockStats = async (req: AuthRequest, res: Response) => {
    try {
        const [totalCourant, totalHS, categories, stockFaible] = await Promise.all([
            prisma.stock.aggregate({
                where: { statut: 'courant' },
                _sum: { quantite: true },
                _count: true,
            }),
            prisma.stock.aggregate({
                where: { statut: 'hs' },
                _sum: { quantite: true },
                _count: true,
            }),
            prisma.stock.groupBy({
                by: ['categorie'],
                _sum: { quantite: true },
                _count: true,
            }),
            prisma.stock.findMany({
                where: {
                    statut: 'courant',
                    quantite: { lte: 5 },
                },
                orderBy: { quantite: 'asc' },
                take: 10,
            }),
        ]);

        res.json({
            stockCourant: {
                totalArticles: totalCourant._count,
                totalQuantite: totalCourant._sum.quantite || 0,
            },
            stockHS: {
                totalArticles: totalHS._count,
                totalQuantite: totalHS._sum.quantite || 0,
            },
            parCategorie: categories.map((cat) => ({
                categorie: cat.categorie,
                articles: cat._count,
                quantite: cat._sum.quantite || 0,
            })),
            stockFaible,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
};
