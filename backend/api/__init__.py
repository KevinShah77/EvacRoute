"""Flask application factory for EvacRoute API."""

from flask import Flask, jsonify
from flask_cors import CORS
from config import get_config
from api.middleware.error_handler import register_error_handlers
from api.routes import analytics_bp, graph_bp, hazard_bp, route_bp
from services.analytics_service import AnalyticsService
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService


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
    graph_service = GraphService(data_path)
    pathfinding_service = PathfindingService(graph_service)
    analytics_service = AnalyticsService(graph_service, pathfinding_service)

    app.extensions["graph_service"] = graph_service
    app.extensions["pathfinding_service"] = pathfinding_service
    app.extensions["analytics_service"] = analytics_service

    # Register Middlewares & Error Handlers
    register_error_handlers(app)

    # Register Blueprints
    app.register_blueprint(graph_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(hazard_bp)
    app.register_blueprint(analytics_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "EvacRoute API",
            "version": "1.0.0",
        })

    return app
