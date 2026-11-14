"""Unit tests for pathfinding service, RSET, and guidance generation."""

import pytest


def test_find_route_auto_exit(pathfinding_service):
    route = pathfinding_service.find_route(start="F2-201", target="AUTO")
    assert route["distance"] > 0
    assert len(route["path"]) > 1
    assert route["path"][0] == "F2-201"
    assert "target_exit" in route
    assert len(route["steps"]) > 0
    assert route["estimated_time_seconds"] > 0


def test_find_route_specific_target(pathfinding_service):
    route = pathfinding_service.find_route(start="F2-201", target="GF-E-MAIN")
    assert route["distance"] > 0
    assert route["path"][-1] == "GF-E-MAIN"
    assert route["target_exit"]["id"] == "GF-E-MAIN"


def test_find_route_ada_wheelchair_mode(pathfinding_service):
    # Standard route may use stairs
    std_route = pathfinding_service.find_route(start="F2-201", target="AUTO", accessible_only=False)
    # ADA route must avoid stairs and use elevators/ramps
    ada_route = pathfinding_service.find_route(start="F2-201", target="AUTO", accessible_only=True)

    assert ada_route["distance"] > 0
    # Step types in ADA route should not contain stairs
    step_types = [s["type"] for s in ada_route["steps"]]
    assert "stairs_down" not in step_types
    assert "stairs_up" not in step_types


def test_find_route_unknown_start(pathfinding_service):
    route = pathfinding_service.find_route(start="NON_EXISTENT_ROOM_XYZ")
    assert route["distance"] == -1
    assert "error" in route


def test_find_backup_route_presence(pathfinding_service):
    route = pathfinding_service.find_route(start="F2-201", target="AUTO")
    # Backup route should either be present or gracefully handled
    if route.get("backup_route"):
        backup = route["backup_route"]
        assert backup["distance"] > 0
        assert backup["path"] != route["path"]


def test_duration_formatter(pathfinding_service):
    assert pathfinding_service.format_duration(45) == "45 sec"
    assert pathfinding_service.format_duration(60) == "1 min"
    assert pathfinding_service.format_duration(75) == "1 min 15 sec"
    assert pathfinding_service.format_duration(0) == "0 sec"


def test_find_route_start_equals_target(pathfinding_service):
    route = pathfinding_service.find_route(start="GF-E-MAIN", target="GF-E-MAIN")
    assert route["distance"] == 0.0
    assert len(route["steps"]) == 1
    assert "already at" in route["steps"][0]["instruction"].lower()


def test_compass_direction(pathfinding_service):
    assert pathfinding_service.compass_direction({"x": 0, "y": 0}, {"x": 10, "y": 0}) == "east"
    assert pathfinding_service.compass_direction({"x": 0, "y": 0}, {"x": 0, "y": 10}) == "south"
    assert pathfinding_service.compass_direction({"x": 0, "y": 0}, {"x": -10, "y": 0}) == "west"
    assert pathfinding_service.compass_direction({"x": 0, "y": 0}, {"x": 0, "y": -10}) == "north"
    assert pathfinding_service.compass_direction(None, None) == ""

