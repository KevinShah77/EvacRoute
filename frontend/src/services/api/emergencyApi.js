import { apiClient } from './client';

/**
 * Emergency detection, activation, and management API.
 */
export const getEmergencyStatus = () => apiClient.get('/emergency/status');

export const activateEmergency = (data) => apiClient.post('/emergency/activate', data);

export const reportEmergency = (data) => apiClient.post('/emergency/report', data);

export const verifyEmergency = (data) => apiClient.post('/emergency/verify', data);

export const updateEmergency = (data) => apiClient.post('/emergency/update', data);

export const resolveEmergency = (data) => apiClient.post('/emergency/resolve', data);

export const sendSensorData = (data, sensorKey = 'evacroute-sensor-sec-token-2026') =>
  apiClient.post('/emergency/sensor', data, {
    headers: { 'X-Sensor-Key': sensorKey },
  });

export const getSensorReadings = () => apiClient.get('/emergency/sensor-readings');

export const getEmergencyHistory = () => apiClient.get('/emergency/history');

export const toggleGuideSession = (action = 'start') =>
  apiClient.post('/emergency/guide-session', { action });

/**
 * Push Notification APIs
 */
export const getVapidKey = () => apiClient.get('/notifications/vapid-key');

export const subscribePush = (subscriptionData) =>
  apiClient.post('/notifications/subscribe', subscriptionData);

export const unsubscribePush = (endpoint) =>
  apiClient.post('/notifications/unsubscribe', { endpoint });

export const getNotificationStats = () => apiClient.get('/notifications/stats');

export const sendTestNotification = (data = {}) =>
  apiClient.post('/notifications/test', data);
