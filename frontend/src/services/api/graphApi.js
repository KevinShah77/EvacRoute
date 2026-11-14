import { apiClient } from './client';

/**
 * Fetches building topology, nodes, edges, active hazards, and floors.
 */
export const getGraph = () => apiClient.get('/graph');
