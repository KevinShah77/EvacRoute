"""Unit tests for room number resolution and floor/entrance evacuation graph analytics."""

import pytest


def test_find_room_by_number(app):
    graph_service = app.extensions["graph_service"]

    # Test exact room numbers
    r201 = graph_service.find_room_by_number("201")
    assert r201 is not None
    assert r201["id"] == "F2-201"
    assert r201["floor"] == "Floor 2"

    r113 = graph_service.find_room_by_number("113")
    assert r113 is not None
    assert r113["id"] == "F1-113"

    # Test with prefix 'Room 201' or 'rm 114'
    r_prefixed = graph_service.find_room_by_number("Room 201")
    assert r_prefixed is not None
    assert r_prefixed["id"] == "F2-201"

    # Test Ground floor leading zeroes or integer
    r001 = graph_service.find_room_by_number("001")
    assert r001 is not None
    assert r001["id"] == "GF-001"

    r1 = graph_service.find_room_by_number("1")
    assert r1 is not None
    assert r1["id"] == "GF-001"

    # Test full node ID
    r_id = graph_service.find_room_by_number("GF-002")
    assert r_id is not None
    assert r_id["id"] == "GF-002"

    # Test invalid and non-existent room numbers (must NOT falsely match substrings)
    assert graph_service.find_room_by_number("5") is None
    assert graph_service.find_room_by_number("0") is None
    assert graph_service.find_room_by_number("13") is None
    assert graph_service.find_room_by_number("15") is None
    assert graph_service.find_room_by_number("a") is None
    assert graph_service.find_room_by_number("x") is None
    assert graph_service.find_room_by_number("9999") is None
    assert graph_service.find_room_by_number("101") is None
    assert graph_service.find_room_by_number("") is None
    assert graph_service.find_room_by_number("   ") is None

    # Test ambiguous room titles (must return None to prevent duplicate/incorrect matching)
    assert graph_service.find_room_by_number("Seminar Hall") is None  # Exists on Ground (002) and Floor 1 (113)

    # Disambiguated by room number
    r_sh113 = graph_service.find_room_by_number("Seminar Hall 113")
    assert r_sh113 is not None
    assert r_sh113["id"] == "F1-113"

    # Unique title
    r_physics = graph_service.find_room_by_number("Physics Lab")
    assert r_physics is not None
    assert r_physics["id"] == "GF-012"


def test_resolve_room_api(client):
    # GET with valid room
    res = client.get("/api/resolve-room?room=201")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["room"]["id"] == "F2-201"

    # POST with valid room
    res_post = client.post("/api/resolve-room", json={"room": "113"})
    assert res_post.status_code == 200
    assert res_post.get_json()["room"]["id"] == "F1-113"

    # Invalid room returns 404
    res_404 = client.get("/api/resolve-room?room=999")
    assert res_404.status_code == 404
    assert "error" in res_404.get_json()

    # Empty room returns 400
    res_400 = client.get("/api/resolve-room?room=")
    assert res_400.status_code == 400


def test_floor_evacuation_graph_all_floors_and_entrances(app):
    analytics_service = app.extensions["analytics_service"]
    graph_service = app.extensions["graph_service"]

    floors = graph_service.get_floors()
    exits = [n for n, d in graph_service.graph.nodes(data=True) if d.get("type") == "exit"]

    assert len(floors) >= 4
    assert len(exits) >= 3

    for floor in floors:
        for entrance in exits:
            result = analytics_service.get_floor_evacuation_graph(floor=floor, entrance_id=entrance)
            assert result["selected_floor"] == floor
            assert result["selected_entrance"]["id"] == entrance
            assert result["summary"]["total_rooms"] > 0
            # Under baseline conditions all rooms should be reachable
            assert result["summary"]["reachable_rooms"] == result["summary"]["total_rooms"]
            assert result["summary"]["unreachable_rooms"] == 0
            assert len(result["nodes"]) > 0
            assert len(result["edges"]) > 0
            assert len(result["rooms"]) == result["summary"]["total_rooms"]


def test_floor_evacuation_graph_with_hazard(client, app):
    # Place fire on Floor 2 West corridor edge
    # Let's inspect an edge on Floor 2, e.g. F2-201 <-> F2-C-WEST
    res_block = client.post(
        "/api/simulate-blockage",
        json={"u": "F2-201", "v": "F2-C-WEST", "hazard_type": "fire"},
    )
    assert res_block.status_code == 200

    analytics_service = app.extensions["analytics_service"]
    f2_graph = analytics_service.get_floor_evacuation_graph(floor="Floor 2", entrance_id="GF-E-MAIN")

    # Room F2-201 should now be unreachable because its sole doorway is blocked by fire!
    r201 = next(r for r in f2_graph["rooms"] if r["id"] == "F2-201")
    assert r201["reachable"] is False
    assert f2_graph["summary"]["unreachable_rooms"] >= 1
    assert f2_graph["summary"]["reachable_rooms"] < f2_graph["summary"]["total_rooms"]

    # Reset hazards
    client.post("/api/reset-simulation")
    f2_restored = analytics_service.get_floor_evacuation_graph(floor="Floor 2", entrance_id="GF-E-MAIN")
    assert f2_restored["summary"]["unreachable_rooms"] == 0


def test_floor_evacuation_graph_ada_mode(app):
    analytics_service = app.extensions["analytics_service"]
    f2_ada = analytics_service.get_floor_evacuation_graph(
        floor="Floor 2",
        entrance_id="GF-E-MAIN",
        accessible_only=True,
    )
    assert f2_ada["accessible_mode"] is True
    assert f2_ada["summary"]["reachable_rooms"] == f2_ada["summary"]["total_rooms"]
    # Check that rooms' paths do not include staircase nodes
    staircase_ids = [
        n for n, d in app.extensions["graph_service"].graph.nodes(data=True)
        if d.get("type") == "staircase"
    ]
    for room in f2_ada["rooms"]:
        for stair in staircase_ids:
            assert stair not in room["path"]


def test_analytics_api_endpoints_with_floor_graph(client):
    # Test dedicated /api/analytics/floor-graph
    res = client.get("/api/analytics/floor-graph?floor=Floor+1&entrance=GF-E-MAIN")
    assert res.status_code == 200
    data = res.get_json()
    assert data["selected_floor"] == "Floor 1"
    assert data["selected_entrance"]["id"] == "GF-E-MAIN"
    assert "summary" in data
    assert "nodes" in data
    assert "edges" in data

    # Test /api/analytics with floor and entrance query params
    res_combined = client.get("/api/analytics?floor=Floor+3&entrance=GF-E-WEST")
    assert res_combined.status_code == 200
    combined_data = res_combined.get_json()
    assert "analytics" in combined_data
    assert "floor_evacuation_graph" in combined_data
    assert combined_data["floor_evacuation_graph"]["selected_floor"] == "Floor 3"
