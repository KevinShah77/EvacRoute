/**
 * Application environment configuration.
 */
export const APP_CONFIG = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  DEFAULT_START_NODE: 'F2-201',
  DEFAULT_TARGET: 'AUTO',
  DEFAULT_FLOOR: 'Floor 2',
  DEFAULT_SIM_SPEED: 5,
  SIM_SPEED_OPTIONS: [2, 5, 10],
  BLUEPRINT_OPACITY_OPTIONS: [1.0, 0.85, 0.6, 0.3, 0.0],
  TOAST_DURATION_MS: 3000,
  REQUEST_TIMEOUT_MS: 10000,
};
