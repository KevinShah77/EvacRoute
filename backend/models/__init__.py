"""Domain data models."""
from .hazard import HazardType
from .emergency import (
    EmergencyEvent,
    EmergencyStatus,
    EmergencyType,
    EmergencySeverity,
)

__all__ = [
    "HazardType",
    "EmergencyEvent",
    "EmergencyStatus",
    "EmergencyType",
    "EmergencySeverity",
]
