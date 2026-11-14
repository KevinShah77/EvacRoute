import * as api from '../services/api';

/**
 * Converts VAPID URL-safe base64 string to Uint8Array for PushManager.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser supports push notifications and service worker.
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Subscribes user device to browser push notifications and stores on backend.
 */
export async function registerPushSubscription(isTest = false, role = 'student') {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // 1. Request user permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted by the user.');
  }

  // 2. Fetch VAPID public key
  const vapidRes = await api.getVapidKey();
  const vapidKey = vapidRes.data?.vapid_public_key;
  if (!vapidKey) {
    throw new Error('VAPID public key could not be retrieved from server.');
  }

  // 3. Register service worker if not already active
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js');
  }
  await navigator.serviceWorker.ready;

  // 4. Subscribe to PushManager
  const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  const subJson = subscription.toJSON();

  // 5. Save to backend
  const payload = {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    role: role,
    is_test: isTest,
    device_info: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    },
  };

  await api.subscribePush(payload);
  return { subscription, permission };
}
