"""Unit tests for building graph and hazard management."""

import pytest
from core.exceptions import EdgeNotFoundError, InvalidHazardError
from graph.building_graph import BuildingGraph


def test_building_graph_loads_nodes_and_edges(graph_service):
    assert graph_service.graph.number_of_nodes() > 0
    assert graph_service.graph.number_of_edges() > 0
    assert "GF-E-MAIN" in graph_service.graph.nodes


def test_floors_order(graph_service):
    floors = graph_service.get_floors()
    assert "Ground" in floors
    assert "Floor 1" in floors
    assert floors.index("Ground") < floors.index("Floor 1")


def test_hazard_lifecycle(graph_service):
    u, v = "GF-E-MAIN", "GF-RAMP"
    assert graph_service.get_edge_hazard(u, v) is None

    # Apply fire hazard
    graph_service.set_edge_hazard(u, v, "fire")
    assert graph_service.get_edge_hazard(u, v) == "fire"
    assert len(graph_service.blocked_edges) == 1

    # Clear hazard
    graph_service.set_edge_hazard(u, v, "clear")
    assert graph_service.get_edge_hazard(u, v) is None
    assert len(graph_service.blocked_edges) == 0


def test_invalid_hazard_raises_error(graph_service):
    u, v = "GF-E-MAIN", "GF-RAMP"
    with pytest.raises(InvalidHazardError):
        graph_service.set_edge_hazard(u, v, "volcano")


def test_nonexistent_edge_raises_error(graph_service):
    with pytest.raises(EdgeNotFoundError):
        graph_service.set_edge_hazard("GF-E-MAIN", "F4-414", "fire")


def test_accessibility_check(graph_service):
    # Staircase should not be accessible for ADA mode
    stairs = [n for n, d in graph_service.graph.nodes(data=True) if d.get("type") == "staircase"]
    if stairs:
        assert graph_service.is_node_accessible(stairs[0]) is False

    # Main exit should be accessible
    assert graph_service.is_node_accessible("GF-E-MAIN") is True


def test_legacy_facade_compatibility():
    bg = BuildingGraph()
    assert bg.G.number_of_nodes() > 0
    assert len(bg.get_floors()) > 0
    route = bg.find_route("F2-201", target="AUTO")
    assert route["distance"] > 0
    assert route["target_exit"] is not None
