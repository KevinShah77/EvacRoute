"""Evacuation route calculation API routes."""

from flask import Blueprint, current_app, jsonify, request
from core.exceptions import EvacRouteException

route_bp = Blueprint("route", __name__, url_prefix="/api")


@route_bp.route("/find-route", methods=["POST"])
def find_route():
    """Calculates primary evacuation route, exit candidates, and secondary backup route."""
    data = request.get_json(silent=True) or {}
    start = data.get("start")
    target = data.get("target", "AUTO")
    accessible = bool(data.get("accessible", False))

    if not start or not str(start).strip():
        raise EvacRouteException("Field 'start' location ID is required.", status_code=400)

    pathfinding_service = current_app.extensions["pathfinding_service"]
    route_data = pathfinding_service.find_route(
        start=str(start).strip(),
        target=str(target).strip() if target else "AUTO",
        accessible_only=accessible,
    )

    return jsonify(route_data)
