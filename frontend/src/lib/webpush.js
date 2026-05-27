import { notifications as notifApi } from './api';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Register service worker + subscribe to push.
// Safe to call multiple times — skips if already subscribed on this device.
export async function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
        // 1. Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');

        // 2. Check existing subscription
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
            // Already subscribed — make sure backend has it
            await notifApi.pushSubscribe(existing.toJSON());
            return;
        }

        // 3. Ask user for permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 4. Get VAPID public key from backend
        const { data } = await notifApi.vapidKey();
        const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

        // 5. Subscribe
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });

        // 6. Save to backend
        await notifApi.pushSubscribe(subscription.toJSON());
    } catch (err) {
        console.error('[WebPush] Registration failed:', err);
    }
}

// Listen for NAVIGATE messages from the service worker (notif click when app is open)
export function listenServiceWorkerNav(navigate) {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'NAVIGATE' && event.data.link) {
            navigate(event.data.link);
        }
    });
}
