/**
 * Push Notification Service
 * Handles browser push notification permissions and display
 */

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
    return 'Notification' in window && 'serviceWorker' in navigator;
};

// Request permission for notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) {
        console.warn('Notifications not supported in this browser');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return 'denied';
    }
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
};

// Show a local notification
export const showNotification = (title: string, options?: NotificationOptions): void => {
    if (!isNotificationSupported()) {
        console.warn('Notifications not supported');
        return;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
    }

    // Use service worker for notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
                icon: '/logo-phonetic.png',
                badge: '/logo-phonetic.png',
                ...options,
            } as NotificationOptions);
        });
    } else {
        // Fallback to regular notification
        new Notification(title, {
            icon: '/logo-phonetic.png',
            ...options,
        });
    }
};

// Notification types for the app
export interface InterventionNotification {
    type: 'new_intervention' | 'intervention_updated' | 'intervention_assigned';
    interventionId: string;
    title: string;
    message: string;
}

export interface IpLinkNotification {
    type: 'ip_link_disconnected' | 'ip_link_restored';
    linkId: number;
    reference: string;
    clientName: string;
    title: string;
    message: string;
    url?: string;
}

// Show intervention-specific notification
export const showInterventionNotification = (notification: InterventionNotification): void => {
    showNotification(notification.title, {
        body: notification.message,
        tag: `intervention-${notification.interventionId}`,
        data: {
            type: notification.type,
            interventionId: notification.interventionId,
            url: `/interventions/${notification.interventionId}`,
        },
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'Voir' },
            { action: 'dismiss', title: 'Ignorer' },
        ],
    } as NotificationOptions);
};

export const showIpLinkDisconnectedNotification = (notification: IpLinkNotification): void => {
    showNotification(notification.title, {
        body: notification.message,
        tag: `ip-link-disconnected-${notification.linkId}`,
        data: {
            type: notification.type,
            linkId: notification.linkId,
            url: notification.url || '/supervision-liens-ip',
        },
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'Voir' },
            { action: 'dismiss', title: 'Ignorer' },
        ],
    } as NotificationOptions);
};

export const showIpLinkRestoredNotification = (notification: IpLinkNotification): void => {
    showNotification(notification.title, {
        body: notification.message,
        tag: `ip-link-restored-${notification.linkId}`,
        data: {
            type: notification.type,
            linkId: notification.linkId,
            url: notification.url || '/supervision-liens-ip',
        },
        requireInteraction: false,
        actions: [
            { action: 'view', title: 'Voir' },
            { action: 'dismiss', title: 'Ignorer' },
        ],
    } as NotificationOptions);
};

// Register for push notifications (would need backend VAPID keys in production)
export const subscribeToServerPush = async (): Promise<PushSubscription | null> => {
    if (!('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // In production, you'd use VAPID keys from your server
        // For now, this is a placeholder
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            // applicationServerKey would come from your backend
        });

        return subscription;
    } catch (error) {
        console.error('Error subscribing to push:', error);
        return null;
    }
};
