"""Safety officer telemetry and bottleneck analytics API routes."""

from flask import Blueprint, current_app, jsonify, request

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api")


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    """Retrieves egress analytics, bottleneck hubs/corridors, and room RSET metrics."""
    accessible_param = request.args.get("accessible", "false").lower()
    accessible = accessible_param in ("true", "1", "t", "yes")

    analytics_service = current_app.extensions["analytics_service"]
    stats = analytics_service.get_building_stats(accessible_only=accessible)

    return jsonify(stats)
