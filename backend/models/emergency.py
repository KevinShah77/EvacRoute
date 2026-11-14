"""Emergency data models and state representations."""

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional


class EmergencyStatus:
    NORMAL = "normal"
    REPORTED = "emergency_reported"
    VERIFICATION = "emergency_verification"
    ACTIVE = "emergency_active"
    RESOLVED = "emergency_resolved"

    ALL = [NORMAL, REPORTED, VERIFICATION, ACTIVE, RESOLVED]


class EmergencyType:
    FIRE = "fire"
    SMOKE = "smoke"
    GAS_LEAKAGE = "gas_leakage"
    STRUCTURAL_DAMAGE = "structural_damage"
    BLOCKED_ROUTE = "blocked_route"
    GENERAL = "general"

    ALL = [FIRE, SMOKE, GAS_LEAKAGE, STRUCTURAL_DAMAGE, BLOCKED_ROUTE, GENERAL]


class EmergencySeverity:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    ALL = [LOW, MEDIUM, HIGH, CRITICAL]


class EmergencyEvent:
    """Represents an emergency incident event in EvacRoute."""

    def __init__(
        self,
        event_id: Optional[str] = None,
        emergency_type: str = EmergencyType.FIRE,
        status: str = EmergencyStatus.ACTIVE,
        severity: str = EmergencySeverity.HIGH,
        building: str = "Main Academic Block",
        floor: str = "Floor 2",
        location: str = "F2-201",
        description: str = "",
        source: str = "admin",
        is_simulation: bool = False,
        affected_nodes: Optional[List[str]] = None,
        affected_edges: Optional[List[List[str]]] = None,
        sensor_metadata: Optional[Dict[str, Any]] = None,
    ):
        now_iso = datetime.now(timezone.utc).isoformat()
        self.id = event_id or f"EMG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        self.type = emergency_type if emergency_type in EmergencyType.ALL else EmergencyType.GENERAL
        self.status = status if status in EmergencyStatus.ALL else EmergencyStatus.REPORTED
        self.severity = severity if severity in EmergencySeverity.ALL else EmergencySeverity.HIGH
        self.building = building or "Main Academic Block"
        self.floor = floor or "Floor 2"
        self.location = location or "Building General Area"
        self.description = description or ""
        self.source = source
        self.is_simulation = bool(is_simulation)
        self.affected_nodes = list(affected_nodes or [])
        self.affected_edges = list(affected_edges or [])
        self.sensor_metadata = sensor_metadata or {}
        self.created_at = now_iso
        self.updated_at = now_iso
        self.resolved_at: Optional[str] = None
        self.actions_log: List[Dict[str, Any]] = [
            {
                "timestamp": now_iso,
                "action": "EMERGENCY_INITIATED",
                "actor": source,
                "details": f"Emergency initialized with status '{self.status}', severity '{self.severity}'",
            }
        ]

    def log_action(self, action: str, actor: str = "system", details: str = "") -> None:
        """Appends an audit log entry."""
        now_iso = datetime.now(timezone.utc).isoformat()
        self.updated_at = now_iso
        self.actions_log.append({
            "timestamp": now_iso,
            "action": action,
            "actor": actor,
            "details": details,
        })

    def resolve(self, actor: str = "admin", details: str = "Emergency resolved by safety personnel") -> None:
        """Transitions emergency to resolved status."""
        now_iso = datetime.now(timezone.utc).isoformat()
        self.status = EmergencyStatus.RESOLVED
        self.resolved_at = now_iso
        self.log_action("EMERGENCY_RESOLVED", actor=actor, details=details)

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the emergency event to a dictionary."""
        return {
            "id": self.id,
            "type": self.type,
            "status": self.status,
            "severity": self.severity,
            "building": self.building,
            "floor": self.floor,
            "location": self.location,
            "description": self.description,
            "source": self.source,
            "is_simulation": self.is_simulation,
            "affected_nodes": self.affected_nodes,
            "affected_edges": self.affected_edges,
            "sensor_metadata": self.sensor_metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "resolved_at": self.resolved_at,
            "actions_log": self.actions_log,
        }
