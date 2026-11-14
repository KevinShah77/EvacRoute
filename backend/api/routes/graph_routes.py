"""Graph topology and active edge hazard API routes."""

from flask import Blueprint, current_app, jsonify, request
from core.exceptions import EvacRouteException

graph_bp = Blueprint("graph", __name__, url_prefix="/api")


@graph_bp.route("/graph", methods=["GET"])
def get_graph():
    """Retrieves building graph topology with nodes, edges, active hazards, and floors."""
    graph_service = current_app.extensions["graph_service"]
    g = graph_service.graph

    nodes = [{"id": n, **d} for n, d in g.nodes(data=True)]
    edges = [
        {
            "source": u,
            "target": v,
            "weight": d["weight"],
            "hazard": graph_service.get_edge_hazard(u, v),
        }
        for u, v, d in g.edges(data=True)
    ]

    return jsonify({
        "nodes": nodes,
        "edges": edges,
        "blocked": graph_service.blocked_edges,
        "hazards": graph_service.get_hazards_list(),
        "floors": graph_service.get_floors(),
    })


@graph_bp.route("/resolve-room", methods=["GET", "POST"])
def resolve_room():
    """Resolves an entered room number to its corresponding node in the building graph."""
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        room_query = data.get("room") or data.get("room_number") or data.get("query")
    else:
        room_query = request.args.get("room") or request.args.get("query")

    if not room_query or not str(room_query).strip():
        raise EvacRouteException("Field 'room' number is required.", status_code=400)

    graph_service = current_app.extensions["graph_service"]
    room_node = graph_service.find_room_by_number(str(room_query).strip())

    if not room_node:
        raise EvacRouteException(
            f"Room '{str(room_query).strip()}' was not found in building graph.",
            status_code=404,
        )

    return jsonify({
        "status": "success",
        "room": room_node,
    })
