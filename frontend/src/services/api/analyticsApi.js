import { apiClient } from './client';

/**
 * Retrieves egress telemetry, room evacuation times, and bottleneck data.
 * @param {boolean} [accessible=false]
 * @param {string} [floor]
 * @param {string} [entrance]
 */
export const getAnalytics = (accessible = false, floor = null, entrance = null) => {
  const params = { accessible };
  if (floor) params.floor = floor;
  if (entrance) params.entrance = entrance;
  return apiClient.get('/analytics', { params });
};

/**
 * Retrieves floor-wise and entrance-wise evacuation topology, reachability, and metrics.
 * @param {string} floor
 * @param {string} entrance
 * @param {boolean} [accessible=false]
 */
export const getFloorEvacuationGraph = (floor, entrance, accessible = false) =>
  apiClient.get('/analytics/floor-graph', {
    params: { floor, entrance, accessible },
  });
