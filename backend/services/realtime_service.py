"""Real-time event broadcasting service using Server-Sent Events (SSE)."""

import json
import logging
import queue
import threading
import time
from typing import Any, Dict, Generator, List, Optional

logger = logging.getLogger(__name__)


class RealTimeService:
    """Manages active real-time client listeners and broadcasts emergency updates."""

    def __init__(self):
        self._lock = threading.Lock()
        self._listeners: List[queue.Queue] = []

    def subscribe(self) -> queue.Queue:
        """Registers a new client listener queue."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._listeners.append(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        """Unregisters a client listener queue."""
        with self._lock:
            if q in self._listeners:
                self._listeners.remove(q)

    def publish(self, event_type: str, data: Dict[str, Any]) -> None:
        """Publishes an event to all connected listeners."""
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": time.time(),
        }
        with self._lock:
            dead_queues = []
            for q in self._listeners:
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    dead_queues.append(q)
                except Exception as e:
                    logger.warning("Error pushing event to listener: %s", e)
                    dead_queues.append(q)

            for dq in dead_queues:
                if dq in self._listeners:
                    self._listeners.remove(dq)

    def format_sse(self, event_type: str, data: Dict[str, Any]) -> str:
        """Formats SSE event string according to the W3C spec."""
        json_data = json.dumps(data)
        return f"event: {event_type}\ndata: {json_data}\n\n"

    def sse_stream(self, initial_state: Optional[Dict[str, Any]] = None) -> Generator[str, None, None]:
        """Generator yielding SSE formatted strings for streaming."""
        q = self.subscribe()
        try:
            # Yield initial keep-alive comment or state
            yield ": connected\n\n"
            if initial_state:
                yield self.format_sse("initial_state", initial_state)

            while True:
                try:
                    item = q.get(timeout=20.0)
                    yield self.format_sse(item["event"], item["data"])
                except queue.Empty:
                    # Send periodic keepalive heartbeat
                    yield ": ping\n\n"
        except GeneratorExit:
            self.unsubscribe(q)
        except Exception as e:
            logger.debug("Client disconnected from SSE stream: %s", e)
            self.unsubscribe(q)
