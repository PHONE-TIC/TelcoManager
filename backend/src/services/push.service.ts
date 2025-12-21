/**
 * Push Notification Service
 * Handles web push notifications to technicians
 */

import webpush from 'web-push';
import { prisma } from '../db';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@phonetic.fr';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('Web Push configured with VAPID keys');
} else {
    console.warn('VAPID keys not configured - push notifications disabled');
}

// Interface for subscription data
interface SubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Save a push subscription for a technician
export const saveSubscription = async (
    technicienId: string,
    subscription: SubscriptionData,
    userAgent?: string
): Promise<void> => {
    try {
        await prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent,
                updatedAt: new Date(),
            },
            create: {
                technicienId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent,
            },
        });
        console.log(`Push subscription saved for technician ${technicienId}`);
    } catch (error) {
        console.error('Error saving push subscription:', error);
        throw error;
    }
};

// Remove a push subscription
export const removeSubscription = async (endpoint: string): Promise<void> => {
    try {
        await prisma.pushSubscription.delete({
            where: { endpoint },
        });
        console.log('Push subscription removed');
    } catch (error) {
        console.error('Error removing push subscription:', error);
    }
};

// Interface for notification payload
interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    interventionId?: string;
}

// Send notification to a specific technician
export const sendNotificationToTechnician = async (
    technicienId: string,
    payload: NotificationPayload
): Promise<{ success: number; failed: number }> => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('Push notifications not configured');
        return { success: 0, failed: 0 };
    }

    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { technicienId },
        });

        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for technician ${technicienId}`);
            return { success: 0, failed: 0 };
        }

        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/logo-phonetic.png',
            badge: payload.badge || '/logo-phonetic.png',
            tag: payload.tag,
            url: payload.url,
            data: {
                interventionId: payload.interventionId,
            },
        });

        let success = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    notificationPayload
                );
                success++;
            } catch (error: any) {
                console.error('Push notification failed:', error.message);
                failed++;

                // Remove invalid subscriptions (410 Gone or 404 Not Found)
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await removeSubscription(sub.endpoint);
                }
            }
        }

        console.log(`Notifications sent to ${technicienId}: ${success} success, ${failed} failed`);
        return { success, failed };
    } catch (error) {
        console.error('Error sending notifications:', error);
        return { success: 0, failed: 0 };
    }
};

// Send notification for new intervention assignment
export const notifyNewIntervention = async (
    technicienId: string,
    intervention: {
        id: string;
        numero?: string;
        titre: string;
        datePlanifiee: Date;
        client?: { nom: string };
    }
): Promise<void> => {
    const dateStr = new Date(intervention.datePlanifiee).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });

    await sendNotificationToTechnician(technicienId, {
        title: '📅 Nouvelle intervention assignée',
        body: `${intervention.titre}\n${intervention.client?.nom || ''}\n${dateStr}`,
        tag: `intervention-${intervention.id}`,
        url: `/interventions/${intervention.id}`,
        interventionId: intervention.id,
    });
};

// Get VAPID public key for clients
export const getVapidPublicKey = (): string => {
    return VAPID_PUBLIC_KEY;
};
