import { APP_CONFIG } from '../../config';

/**
 * Real-time Emergency SSE client service.
 */
class EmergencyEventClient {
  constructor() {
    this.eventSource = null;
    this.listeners = new Set();
    this.isConnected = false;
    this.reconnectTimer = null;
  }

  connect() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }
    if (this.eventSource) {
      return;
    }

    const sseUrl = `${APP_CONFIG.API_URL}/emergency/events`;
    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      const handleEvent = (type) => (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notify({ event: type, data: parsed });
        } catch (e) {
          this.notify({ event: type, data: event.data });
        }
      };

      this.eventSource.addEventListener('initial_state', handleEvent('initial_state'));
      this.eventSource.addEventListener('emergency_activated', handleEvent('emergency_activated'));
      this.eventSource.addEventListener('emergency_updated', handleEvent('emergency_updated'));
      this.eventSource.addEventListener('emergency_resolved', handleEvent('emergency_resolved'));
      this.eventSource.addEventListener('emergency_reported', handleEvent('emergency_reported'));

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.disconnect();
        // Attempt reconnection after 5 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 5000);
        }
      };
    } catch (e) {
      this.isConnected = false;
    }
  }

  disconnect() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (!this.eventSource) {
      this.connect();
    }
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  notify(payload) {
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (e) {
        console.error('SSE listener callback error:', e);
      }
    });
  }
}

export const emergencyEventClient = new EmergencyEventClient();
