import { apiClient } from './client';

/**
 * Sets or clears a hazard on a corridor between node u and node v.
 * @param {string} u
 * @param {string} v
 * @param {string} [hazardType='fire']
 */
export const blockCorridor = (u, v, hazardType = 'fire') =>
  apiClient.post('/simulate-blockage', { u, v, hazard_type: hazardType });

/**
 * Clears all active hazards and corridor blockages.
 */
export const resetSimulation = () => apiClient.post('/reset-simulation');
