import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { findStockByBarcode, getInventorySessionDetails, getInventorySessions } from '../services/inventory-query.service';
import { createInventorySession, deleteInventorySession, finalizeInventorySession, updateInventorySessionItems } from '../services/inventory-session.service';

// Créer une nouvelle session d'inventaire (Snapshot du stock actuel)
export const createSession = async (req: AuthRequest, res: Response) => {
    try {
        const session = await createInventorySession(req.body.notes);
        return res.json(session);
    } catch (error) {
        console.error('Erreur lors de la création de la session:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Récupérer toutes les sessions
export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await getInventorySessions();
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
        const session = await getInventorySessionDetails(id);

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

        await updateInventorySessionItems(id, items);
        return res.json({ success: true });
    } catch (error) {
        console.error('Erreur sauvegarde progression:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Finaliser l'inventaire (Appliquer les quantités au stock réel)
export const finalizeSession = async (req: AuthRequest, res: Response) => {
    try {
        const result = await finalizeInventorySession(req.params.id);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error('Erreur finalisation:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Supprimer une session (seulement si draft)
export const deleteSession = async (req: AuthRequest, res: Response) => {
    try {
        await deleteInventorySession(req.params.id);
        return res.json({ success: true });
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
        const stock = await findStockByBarcode(codeBarre);
        if (!stock) return res.status(404).json({ error: 'Non trouvé' });
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
};

