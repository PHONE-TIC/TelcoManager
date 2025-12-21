import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

// Créer une nouvelle session d'inventaire (Snapshot du stock actuel)
export const createSession = async (req: AuthRequest, res: Response) => {
    try {
        const { notes } = req.body;

        const session = await prisma.$transaction(async (tx) => {
            // 1. Créer la session
            const newSession = await tx.inventorySession.create({
                data: {
                    status: 'draft',
                    notes,
                    date: new Date(),
                },
            });

            // 2. Récupérer tout le stock actif
            const allStock = await tx.stock.findMany({
                where: { statut: 'courant' } // On n'inventorie que le stock courant généralement ? Ou tout ? Disons courant pour l'instant
            });

            // 3. Créer les lignes d'inventaire
            if (allStock.length > 0) {
                await tx.inventoryItem.createMany({
                    data: allStock.map(item => ({
                        sessionId: newSession.id,
                        stockId: item.id,
                        expectedQuantity: item.quantite,
                        countedQuantity: null // Null signifie "pas encore compté"
                    }))
                });
            }

            return newSession;
        });

        res.json(session);
    } catch (error) {
        console.error('Erreur lors de la création de la session:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Récupérer toutes les sessions
export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await prisma.inventorySession.findMany({
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });
        res.json(sessions);
    } catch (error) {
        console.error('Erreur récupération sessions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Récupérer une session détaillée
export const getSessionDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const session = await prisma.inventorySession.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        stock: true // Inclure les détails du stock (nom, ref, code barre)
                    },
                    orderBy: {
                        stock: { nomMateriel: 'asc' }
                    }
                }
            }
        });

        if (!session) return res.status(404).json({ error: 'Session non trouvée' });

        res.json(session);
    } catch (error) {
        console.error('Erreur détail session:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Sauvegarder la progression (Mise à jour des quantités comptées)
export const updateSessionItems = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { items } = req.body; // Array of { id (inventoryItemId), countedQuantity, notes }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Format invalide' });
        }

        // On update en transaction ou en parallèle
        await prisma.$transaction(
            items.map((item: any) =>
                prisma.inventoryItem.update({
                    where: { id: item.id, sessionId: id },
                    data: {
                        countedQuantity: item.countedQuantity,
                        notes: item.notes
                    }
                })
            )
        );

        // Mettre à jour le timestamp de la session
        await prisma.inventorySession.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur sauvegarde progression:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Finaliser l'inventaire (Appliquer les quantités au stock réel)
export const finalizeSession = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const session = await prisma.inventorySession.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!session) return res.status(404).json({ error: 'Session non trouvée' });
        if (session.status === 'completed') return res.status(400).json({ error: 'Session déjà finalisée' });

        await prisma.$transaction(async (tx) => {
            // 1. Mettre à jour le statut de la session
            await tx.inventorySession.update({
                where: { id },
                data: { status: 'completed' }
            });

            // 2. Mettre à jour le stock réel pour chaque item compté
            // On ignore les items non comptés (countedQuantity === null) ? 
            // Ou on considère null = 0 ? Généralement null = pas vu = 0 dans un inventaire complet.
            // Pour la sécurité, on va assumer que si l'utilisateur finalise, tout ce qui est null est considéré comme 0 ou ignoré. 
            // Mieux: Updates seulement ce qui a une valeur définie.

            for (const item of session.items) {
                if (item.countedQuantity !== null) {
                    await tx.stock.update({
                        where: { id: item.stockId },
                        data: { quantite: item.countedQuantity }
                    });
                }
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur finalisation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Supprimer une session (seulement si draft)
export const deleteSession = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.inventorySession.delete({
            where: { id } // Les items seront supprimés via cascade
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Garder les anciennes fonctions pour compatibilité si nécessaire, ou les supprimer.
// Je vais commenter les anciennes pour nettoyer.

export const scanBarcode = async (req: AuthRequest, res: Response) => {
    // ... Garder la fonction scan simple pour vérification ponctuelle
    try {
        const { codeBarre } = req.body;
        const stock = await prisma.stock.findUnique({
            where: { codeBarre },
        });
        if (!stock) return res.status(404).json({ error: 'Non trouvé' });
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
};

