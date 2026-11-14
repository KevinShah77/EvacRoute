"""Flask application factory for EvacRoute API."""

from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from config import get_config
from api.middleware.error_handler import register_error_handlers
from api.routes import (
    analytics_bp,
    graph_bp,
    hazard_bp,
    route_bp,
    emergency_bp,
    notification_bp,
)
from services.analytics_service import AnalyticsService
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService
from services.realtime_service import RealTimeService
from services.notification_service import NotificationService
from services.sensor_service import SensorIntegrationService
from services.emergency_service import EmergencyService


def create_app(config_class=None) -> Flask:
    """Creates and configures an instance of the Flask application."""
    app = Flask(__name__)

    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    # Initialize Domain Services
    data_path = app.config.get("DATA_PATH")
    base_dir = Path(__file__).resolve().parent.parent
    sub_path = base_dir / "data" / "push_subscriptions.json"

    graph_service = GraphService(data_path)
    pathfinding_service = PathfindingService(graph_service)
    analytics_service = AnalyticsService(graph_service, pathfinding_service)
    realtime_service = RealTimeService()
    notification_service = NotificationService(storage_path=sub_path)
    emergency_service = EmergencyService(
        graph_service=graph_service,
        pathfinding_service=pathfinding_service,
        notification_service=notification_service,
        realtime_service=realtime_service,
    )
    sensor_service = SensorIntegrationService(emergency_service=emergency_service)

    app.extensions["graph_service"] = graph_service
    app.extensions["pathfinding_service"] = pathfinding_service
    app.extensions["analytics_service"] = analytics_service
    app.extensions["realtime_service"] = realtime_service
    app.extensions["notification_service"] = notification_service
    app.extensions["emergency_service"] = emergency_service
    app.extensions["sensor_service"] = sensor_service

    # Register Middlewares & Error Handlers
    register_error_handlers(app)

    # Register Blueprints
    app.register_blueprint(graph_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(hazard_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(emergency_bp)
    app.register_blueprint(notification_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "EvacRoute API",
            "version": "2.0.0",
            "emergency_status": emergency_service.current_status,
        })

    return app
