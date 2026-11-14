"""Graph topology and active edge hazard API routes."""

from flask import Blueprint, current_app, jsonify

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
