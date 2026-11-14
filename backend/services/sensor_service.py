"""Sensor integration, ingestion, authentication, and false-alarm verification service."""

from datetime import datetime, timezone
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLDS = {
    "temperature": 57.0,   # °C
    "smoke": 35.0,         # % obscuration
    "gas": 50.0,           # ppm
    "fire": 0.8,           # detection confidence (0.0 to 1.0)
    "structural": 6.5,     # acceleration / vibration threshold
    "iot": 1.0,            # generic trigger threshold
}


class SensorIntegrationService:
    """Manages secure physical sensor ingestion, threshold evaluation, and false-alarm protection."""

    def __init__(self, emergency_service=None):
        self.emergency_service = emergency_service
        self.api_key = os.getenv("SENSOR_API_KEY", "evacroute-sensor-sec-token-2026")
        self.verification_mode = os.getenv("SENSOR_VERIFICATION_MODE", "immediate").lower()  # 'immediate' | 'require_confirmation'
        self.thresholds = dict(DEFAULT_THRESHOLDS)
        self._recent_readings: List[Dict[str, Any]] = []
        self._last_trigger_times: Dict[str, float] = {}
        self.cooldown_seconds = 45.0  # Prevents broadcast storms

    def authenticate(self, provided_token: Optional[str]) -> bool:
        """Validates incoming sensor authentication token."""
        if not provided_token:
            return False
        return provided_token.strip() == self.api_key.strip()

    def process_sensor_reading(
        self,
        sensor_id: str,
        sensor_type: str,
        value: float,
        building: str = "Main Academic Block",
        floor: str = "Floor 2",
        location: str = "F2-201",
        description: str = "",
        raw_metadata: Optional[Dict[str, Any]] = None,
        is_simulation: bool = False,
    ) -> Dict[str, Any]:
        """Evaluates sensor telemetry against calibrated threshold and verification logic."""
        now_ts = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()
        s_type = (sensor_type or "smoke").lower()

        threshold = self.thresholds.get(s_type, 1.0)
        exceeds_threshold = float(value) >= threshold

        reading_record = {
            "sensor_id": sensor_id,
            "sensor_type": s_type,
            "value": value,
            "threshold": threshold,
            "exceeds_threshold": exceeds_threshold,
            "building": building,
            "floor": floor,
            "location": location,
            "timestamp": now_iso,
            "is_simulation": is_simulation,
            "metadata": raw_metadata or {},
        }
        self._recent_readings.append(reading_record)
        if len(self._recent_readings) > 100:
            self._recent_readings.pop(0)

        if not exceeds_threshold:
            return {
                "status": "normal",
                "message": f"Sensor value {value} is below alert threshold {threshold}. No emergency triggered.",
                "verified": False,
                "reading": reading_record,
            }

        # Cooldown check for rate-limiting / deduplication
        last_time = self._last_trigger_times.get(sensor_id, 0.0)
        if (now_ts - last_time) < self.cooldown_seconds:
            return {
                "status": "rate_limited",
                "message": f"Sensor {sensor_id} reported within cooldown period ({self.cooldown_seconds}s). Duplicate alert suppressed.",
                "verified": False,
                "reading": reading_record,
            }

        self._last_trigger_times[sensor_id] = now_ts

        # Map sensor type to standard emergency type
        type_mapping = {
            "smoke": "smoke",
            "fire": "fire",
            "temperature": "fire",
            "gas": "gas_leakage",
            "structural": "structural_damage",
            "iot": "general",
        }
        emergency_type = type_mapping.get(s_type, "general")

        # Determine severity based on magnitude
        ratio = value / threshold if threshold > 0 else 1.0
        if ratio >= 1.4:
            severity = "critical"
        elif ratio >= 1.15:
            severity = "high"
        else:
            severity = "medium"

        # Verification mode logic
        require_human_confirmation = (
            self.verification_mode == "require_confirmation" and severity != "critical"
        )

        target_status = "emergency_verification" if require_human_confirmation else "emergency_active"

        response_payload = {
            "status": "triggered",
            "emergency_status": target_status,
            "emergency_type": emergency_type,
            "severity": severity,
            "building": building,
            "floor": floor,
            "location": location,
            "requires_confirmation": require_human_confirmation,
            "reading": reading_record,
        }

        # If emergency service is linked, invoke activation/reporting or append to active emergency
        if self.emergency_service:
            if (
                self.emergency_service.active_emergency
                and self.emergency_service.active_emergency.status == "emergency_active"
            ):
                # Emergency already active: record telemetry, append hazard, and notify subscribers without wiping active state
                self.emergency_service.record_sensor_hazard(
                    sensor_id=sensor_id,
                    emergency_type=emergency_type,
                    floor=floor,
                    location=location,
                    reading_record=reading_record,
                )
            elif require_human_confirmation:
                self.emergency_service.report_emergency(
                    emergency_type=emergency_type,
                    building=building,
                    floor=floor,
                    location=location,
                    description=f"Automated Sensor Alert: {sensor_id} ({s_type}) registered value {value} (threshold: {threshold})",
                    source=f"sensor:{sensor_id}",
                    severity=severity,
                    is_simulation=is_simulation,
                    sensor_metadata=reading_record,
                )
            else:
                self.emergency_service.activate_emergency(
                    emergency_type=emergency_type,
                    building=building,
                    floor=floor,
                    location=location,
                    severity=severity,
                    description=f"Confirmed Sensor Emergency: {sensor_id} ({s_type}) registered value {value} exceeding critical threshold {threshold}",
                    source=f"sensor:{sensor_id}",
                    is_simulation=is_simulation,
                    sensor_metadata=reading_record,
                )

        return response_payload

    def get_recent_readings(self) -> List[Dict[str, Any]]:
        """Returns recent sensor telemetry records."""
        return list(reversed(self._recent_readings[-30:]))
