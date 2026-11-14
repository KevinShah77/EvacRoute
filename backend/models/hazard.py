"""Data models for hazards and edge conditions."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class HazardType:
    id: str
    label: str
    blocked: bool
    ada_blocked: bool
    penalty: Optional[float]
    speed_multiplier: float
