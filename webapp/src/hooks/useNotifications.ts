import { useState, useEffect, useCallback } from 'react';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showInterventionNotification,
} from '../services/notification.service';
import type { InterventionNotification } from '../services/notification.service';

interface UseNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    isEnabled: boolean;
    requestPermission: () => Promise<boolean>;
    showNotification: (notification: InterventionNotification) => void;
}

// Convert base64 string to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const useNotifications = (): UseNotificationsReturn => {
    const [isSupported] = useState(() => isNotificationSupported());
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
        getNotificationPermission()
    );

    // Register service worker on mount
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    // Subscribe to server push after permission is granted
    const subscribeToServerPush = useCallback(async () => {
        try {
            // Get VAPID public key from server
            const response = await fetch('/api/push/vapid-public-key');
            if (!response.ok) {
                console.warn('Push notifications not configured on server');
                return;
            }
            const { publicKey } = await response.json();

            if (!publicKey) {
                console.warn('No VAPID public key available');
                return;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
            });

            // Get auth token from sessionStorage
            const token = sessionStorage.getItem('token');
            if (!token) {
                console.warn('No auth token available');
                return;
            }

            // Send subscription to server
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
            });
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
        }
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        const result = await requestNotificationPermission();
        setPermission(result);

        // If permission granted, subscribe to server push
        if (result === 'granted') {
            subscribeToServerPush();
        }

        return result === 'granted';
    }, [subscribeToServerPush]);

    const showNotification = useCallback((notification: InterventionNotification) => {
        if (permission === 'granted') {
            showInterventionNotification(notification);
        }
    }, [permission]);

    return {
        isSupported,
        permission,
        isEnabled: permission === 'granted',
        requestPermission,
        showNotification,
    };
};
