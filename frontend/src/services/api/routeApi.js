import { apiClient } from './client';

/**
 * Calculates primary evacuation route, exit candidates, and secondary backup route.
 * @param {string} start - Origin node ID
 * @param {string} [target='AUTO'] - Target exit ID or 'AUTO'
 * @param {boolean} [accessible=false] - ADA / wheelchair accessibility mode
 */
export const findRoute = (start, target = 'AUTO', accessible = false) =>
  apiClient.post('/find-route', { start, target, accessible });
