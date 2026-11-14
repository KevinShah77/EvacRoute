"""Integration tests for all REST API endpoints and error handling."""

import json


def test_health_check_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"


def test_get_graph_endpoint(client):
    res = client.get("/api/graph")
    assert res.status_code == 200
    data = res.get_json()
    assert "nodes" in data
    assert "edges" in data
    assert "floors" in data
    assert len(data["nodes"]) > 0


def test_find_route_endpoint_success(client):
    payload = {"start": "F2-201", "target": "AUTO", "accessible": False}
    res = client.post("/api/find-route", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["distance"] > 0
    assert "steps" in data
    assert "target_exit" in data


def test_find_route_missing_start_returns_400(client):
    res = client.post("/api/find-route", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data


def test_hazard_simulation_and_reset(client):
    # Set hazard on actual edge (GF-E-MAIN <-> GF-RAMP)
    payload = {"u": "GF-E-MAIN", "v": "GF-RAMP", "hazard_type": "fire"}
    res = client.post("/api/simulate-blockage", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert len(data["blocked"]) > 0

    # Reset simulation
    res_reset = client.post("/api/reset-simulation")
    assert res_reset.status_code == 200
    data_reset = res_reset.get_json()
    assert data_reset["status"] == "success"

    # Verify hazards cleared in graph
    res_graph = client.get("/api/graph")
    assert len(res_graph.get_json()["blocked"]) == 0


def test_hazard_missing_corridor_nodes_returns_400(client):
    res = client.post("/api/simulate-blockage", json={"u": "GF-E-MAIN"})
    assert res.status_code == 400


def test_hazard_invalid_type_returns_400(client):
    res = client.post(
        "/api/simulate-blockage",
        json={"u": "GF-E-MAIN", "v": "GF-RAMP", "hazard_type": "nuclear"},
    )
    assert res.status_code == 400


def test_analytics_endpoint(client):
    res = client.get("/api/analytics")
    assert res.status_code == 200
    data = res.get_json()
    assert "analytics" in data
    assert "summary" in data["analytics"]
    assert data["analytics"]["summary"]["total_rooms"] > 0
    assert "exit_utilization" in data["analytics"]
    assert "bottleneck_hubs" in data["analytics"]


def test_not_found_endpoint(client):
    res = client.get("/api/non-existent-endpoint")
    assert res.status_code == 404
    data = res.get_json()
    assert "error" in data


def test_find_route_start_equals_target(client):
    payload = {"start": "GF-E-MAIN", "target": "GF-E-MAIN"}
    res = client.post("/api/find-route", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["distance"] == 0.0
    assert len(data["steps"]) == 1
    assert "already at" in data["steps"][0]["instruction"].lower()


def test_find_route_ada_mode_via_api(client):
    payload = {"start": "F2-201", "target": "AUTO", "accessible": True}
    res = client.post("/api/find-route", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["distance"] > 0
    assert data["accessible_mode"] is True
    step_types = [s["type"] for s in data["steps"]]
    assert "stairs_down" not in step_types
    assert "stairs_up" not in step_types


def test_set_hazard_endpoint_alias(client):
    payload = {"u": "GF-E-MAIN", "v": "GF-RAMP", "hazard_type": "smoke"}
    res = client.post("/api/set-hazard", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    # Clean up
    client.post("/api/reset-simulation")


def test_simulate_blockage_nonexistent_edge_returns_404(client):
    res = client.post(
        "/api/simulate-blockage",
        json={"u": "GF-E-MAIN", "v": "F4-414", "hazard_type": "fire"},
    )
    assert res.status_code == 404
    data = res.get_json()
    assert "error" in data


def test_analytics_with_accessible_flag(client):
    res = client.get("/api/analytics?accessible=true")
    assert res.status_code == 200
    data = res.get_json()
    assert data["analytics"]["accessible_mode"] is True

