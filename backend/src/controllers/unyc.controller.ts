import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as unycService from '../services/unyc.service';
import { respondAdminOnly } from './controller.utils';

/**
 * Sync customers from UNYC Atlas API
 * POST /api/unyc/sync-customers
 */
export const syncCustomers = async (req: AuthRequest, res: Response) => {
    try {
        // Only admins can sync
        if (req.user?.role !== 'admin') {
            return respondAdminOnly(res, 'Seuls les administrateurs peuvent synchroniser avec UNYC');
        }

        const result = await unycService.syncCustomers();

        res.json({
            success: true,
            message: `Synchronisation terminée: ${result.created} créé(s), ${result.updated} mis à jour sur ${result.total} clients.`,
            ...result,
        });
    } catch (error: any) {
        console.error('UNYC sync error:', error);
        res.status(500).json({
            error: error.message || 'Erreur lors de la synchronisation UNYC',
        });
    }
};

/**
 * Test UNYC connection
 * GET /api/unyc/test-connection
 */
export const testConnection = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin') {
            return respondAdminOnly(res);
        }

        const connected = await unycService.testConnection();

        res.json({
            connected,
            message: connected ? 'Connexion UNYC réussie' : 'Échec de connexion UNYC',
        });
    } catch (error: any) {
        res.status(500).json({
            connected: false,
            error: error.message,
        });
    }
};
