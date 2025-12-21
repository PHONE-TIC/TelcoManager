// Service Worker for Push Notifications
// This file should be placed in the public folder

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    let data = {
        title: 'TelcoManager',
        body: 'Nouvelle notification',
        icon: '/logo-phonetic.png',
        badge: '/logo-phonetic.png',
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo-phonetic.png',
        badge: data.badge || '/logo-phonetic.png',
        vibrate: [200, 100, 200],
        data: data,
        requireInteraction: true,
        actions: [
            { action: 'view', title: 'Voir' },
            { action: 'dismiss', title: 'Ignorer' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Get the URL to open
    const urlToOpen = event.notification.data?.url || '/interventions';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already an open window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(urlToOpen);
                    return;
                }
            }
            // Open a new window if no existing one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
