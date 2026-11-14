import axios from 'axios';
import { APP_CONFIG } from '../../config';

/**
 * Pre-configured Axios instance with timeout and interceptors.
 */
export const apiClient = axios.create({
  baseURL: APP_CONFIG.API_URL,
  timeout: APP_CONFIG.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = 'An unexpected error occurred while communicating with the server.';

    if (error.response) {
      const data = error.response.data;
      friendlyMessage = data?.error || data?.message || `Server responded with status ${error.response.status}`;
    } else if (error.code === 'ECONNABORTED') {
      friendlyMessage = 'Server request timed out. Please verify that the backend API is running.';
    } else if (error.request) {
      friendlyMessage = `Unable to connect to backend at ${APP_CONFIG.API_URL}. Ensure Flask server is running on port 5000.`;
    }

    const enhancedError = new Error(friendlyMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    return Promise.reject(enhancedError);
  }
);
