"""Safety officer telemetry and bottleneck analytics API routes."""

from flask import Blueprint, current_app, jsonify, request

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api")


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    """Retrieves egress analytics, bottleneck hubs/corridors, and room RSET metrics."""
    accessible_param = request.args.get("accessible", "false").lower()
    accessible = accessible_param in ("true", "1", "t", "yes")

    floor_param = request.args.get("floor")
    entrance_param = request.args.get("entrance")

    analytics_service = current_app.extensions["analytics_service"]
    stats = analytics_service.get_building_stats(accessible_only=accessible)

    # Always attach floor-wise & entrance-wise evacuation graph topology
    stats["floor_evacuation_graph"] = analytics_service.get_floor_evacuation_graph(
        floor=floor_param,
        entrance_id=entrance_param,
        accessible_only=accessible,
    )

    return jsonify(stats)


@analytics_bp.route("/analytics/floor-graph", methods=["GET"])
def get_floor_graph():
    """Retrieves floor-wise and entrance-wise evacuation topology, reachability, and metrics."""
    accessible_param = request.args.get("accessible", "false").lower()
    accessible = accessible_param in ("true", "1", "t", "yes")

    floor = request.args.get("floor")
    entrance = request.args.get("entrance")

    analytics_service = current_app.extensions["analytics_service"]
    graph_data = analytics_service.get_floor_evacuation_graph(
        floor=floor,
        entrance_id=entrance,
        accessible_only=accessible,
    )

    return jsonify(graph_data)
