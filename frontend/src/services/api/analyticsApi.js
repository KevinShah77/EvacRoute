import { apiClient } from './client';

/**
 * Retrieves egress telemetry, room evacuation times, and bottleneck data.
 * @param {boolean} [accessible=false]
 */
export const getAnalytics = (accessible = false) =>
  apiClient.get('/analytics', { params: { accessible } });
