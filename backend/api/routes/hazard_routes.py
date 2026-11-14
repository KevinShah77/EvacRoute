"""Corridor blockage simulation and dynamic hazard injection API routes."""

from flask import Blueprint, current_app, jsonify, request
from core.exceptions import EvacRouteException

hazard_bp = Blueprint("hazard", __name__, url_prefix="/api")


@hazard_bp.route("/simulate-blockage", methods=["POST"])
@hazard_bp.route("/set-hazard", methods=["POST"])
def simulate_blockage():
    """Sets or clears a hazard on a building corridor edge."""
    data = request.get_json(silent=True) or {}
    u = data.get("u")
    v = data.get("v")
    hazard_type = data.get("hazard_type", "fire")

    if not u or not v:
        raise EvacRouteException("Both 'u' and 'v' corridor endpoint IDs are required.", status_code=400)

    graph_service = current_app.extensions["graph_service"]
    ok = graph_service.set_edge_hazard(str(u), str(v), hazard_type)

    return jsonify({
        "status": "success" if ok else "ignored",
        "blocked": graph_service.blocked_edges,
        "hazards": graph_service.get_hazards_list(),
    })


@hazard_bp.route("/reset-simulation", methods=["POST"])
def reset_simulation():
    """Resets all simulated hazards and corridor blockages."""
    graph_service = current_app.extensions["graph_service"]
    graph_service.reset_hazards()
    return jsonify({
        "status": "success",
        "message": "All corridor hazards and blockages have been cleared.",
    })
