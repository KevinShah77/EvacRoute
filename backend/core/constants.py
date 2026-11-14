"""Constants and configuration settings for building geometry, hazards, and RSET."""

FLOOR_ORDER = {
    "Ground": 0,
    "Floor 1": 1,
    "Floor 2": 2,
    "Floor 3": 3,
    "Floor 4": 4,
}

HAZARD_CONFIG = {
    "fire": {
        "label": "Active Fire",
        "blocked": True,
        "ada_blocked": True,
        "penalty": None,
        "speed_multiplier": 0.0,
    },
    "smoke": {
        "label": "Heavy Smoke",
        "blocked": False,
        "ada_blocked": False,
        "penalty": 4.5,
        "speed_multiplier": 0.5,
    },
    "debris": {
        "label": "Structural Damage",
        "blocked": False,
        "ada_blocked": True,
        "penalty": 6.0,
        "speed_multiplier": 0.4,
    },
    "gas_leakage": {
        "label": "Hazardous Gas Leakage",
        "blocked": True,
        "ada_blocked": True,
        "penalty": None,
        "speed_multiplier": 0.0,
    },
    "structural_damage": {
        "label": "Structural Damage",
        "blocked": True,
        "ada_blocked": True,
        "penalty": None,
        "speed_multiplier": 0.0,
    },
    "blocked_route": {
        "label": "Blocked Evacuation Route",
        "blocked": True,
        "ada_blocked": True,
        "penalty": None,
        "speed_multiplier": 0.0,
    },
    "general": {
        "label": "General Emergency Zone",
        "blocked": False,
        "ada_blocked": False,
        "penalty": 3.0,
        "speed_multiplier": 0.6,
    },
}

EMERGENCY_STATUSES = [
    "normal",
    "emergency_reported",
    "emergency_verification",
    "emergency_active",
    "emergency_resolved",
]

EMERGENCY_TYPES = [
    "fire",
    "smoke",
    "gas_leakage",
    "structural_damage",
    "blocked_route",
    "general",
]

EMERGENCY_SEVERITIES = ["low", "medium", "high", "critical"]

DEFAULT_WALK_SPEED = 1.2
ADA_WALK_SPEED = 0.9
STAIR_SPEED = 0.6
ELEVATOR_SPEED = 1.0
ELEVATOR_BOARDING_DELAY = 5.0
