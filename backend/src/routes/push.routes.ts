/**
 * Push Notification Routes
 * Handles push subscription management
 */

import { Router, Response } from 'express';
import { saveSubscription, removeSubscription, getVapidPublicKey } from '../services/push.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/push/vapid-public-key - Get VAPID public key for client-side subscription
router.get('/vapid-public-key', (_req, res: Response) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
        return res.status(503).json({
            error: 'Push notifications not configured on server'
        });
    }
    return res.json({ publicKey });
});

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { subscription } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                error: 'Données de souscription invalides'
            });
        }

        await saveSubscription(userId, subscription, req.headers['user-agent']);

        return res.json({
            success: true,
            message: 'Souscription aux notifications enregistrée'
        });
    } catch (error) {
        console.error('Error subscribing to push:', error);
        return res.status(500).json({
            error: 'Erreur lors de l\'enregistrement de la souscription'
        });
    }
});

// POST /api/push/unsubscribe - Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint manquant' });
        }

        await removeSubscription(endpoint);

        return res.json({
            success: true,
            message: 'Désinscription des notifications effectuée'
        });
    } catch (error) {
        console.error('Error unsubscribing from push:', error);
        return res.status(500).json({
            error: 'Erreur lors de la désinscription'
        });
    }
});

export default router;
