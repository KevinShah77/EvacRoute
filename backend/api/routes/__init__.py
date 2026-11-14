"""API route blueprints."""

from .graph_routes import graph_bp
from .route_routes import route_bp
from .hazard_routes import hazard_bp
from .analytics_routes import analytics_bp
from .emergency_routes import emergency_bp
from .notification_routes import notification_bp

__all__ = [
    "graph_bp",
    "route_bp",
    "hazard_bp",
    "analytics_bp",
    "emergency_bp",
    "notification_bp",
]
