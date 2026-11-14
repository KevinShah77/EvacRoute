import { apiClient } from './client';

/**
 * Fetches building topology, nodes, edges, active hazards, and floors.
 */
export const getGraph = () => apiClient.get('/graph');

/**
 * Resolves an entered room number or query to its corresponding building graph node.
 * @param {string} roomQuery
 */
export const resolveRoom = (roomQuery) =>
  apiClient.get('/resolve-room', { params: { room: roomQuery } });
