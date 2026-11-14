"""Comprehensive unit tests for EvacRoute 2.0 Emergency System."""

import json
import pytest
from models.emergency import EmergencyStatus, EmergencyType, EmergencySeverity


def test_emergency_initial_status(client):
    """Initial building state should be normal with no active emergencies."""
    res = client.get("/api/emergency/status")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == EmergencyStatus.NORMAL
    assert data["has_active_emergency"] is False
    assert data["emergency"] is None
    assert "available_exits" in data
    assert "assembly_points" in data
    assert len(data["assembly_points"]) >= 3


def test_activate_emergency_admin_workflow(client):
    """Admin activation should set active emergency, apply hazards, and record notifications."""
    payload = {
        "emergency_type": EmergencyType.FIRE,
        "building": "Main Academic Block",
        "floor": "Floor 2",
        "location": "F2-201",
        "severity": EmergencySeverity.CRITICAL,
        "description": "Simulated structural fire near Room 201",
        "is_simulation": True,
    }
    res = client.post("/api/emergency/activate", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "success"
    emg = data["emergency"]
    assert emg["type"] == EmergencyType.FIRE
    assert emg["status"] == EmergencyStatus.ACTIVE
    assert emg["severity"] == EmergencySeverity.CRITICAL
    assert emg["floor"] == "Floor 2"
    assert emg["is_simulation"] is True

    # Check status endpoint reflects the active emergency
    status_res = client.get("/api/emergency/status")
    status_data = status_res.get_json()
    assert status_data["has_active_emergency"] is True
    assert status_data["status"] == EmergencyStatus.ACTIVE
    assert status_data["emergency"]["id"] == emg["id"]
    assert len(status_data["active_hazards"]) > 0

    # Resolve emergency cleanly
    res_resolve = client.post(
        "/api/emergency/resolve",
        json={"emergency_id": emg["id"], "notes": "Test resolved"},
    )
    assert res_resolve.status_code == 200
    res_data = res_resolve.get_json()
    assert res_data["emergency"]["status"] == EmergencyStatus.RESOLVED

    # Status should return to normal
    after_res = client.get("/api/emergency/status")
    assert after_res.get_json()["status"] == EmergencyStatus.NORMAL


def test_dynamic_hazard_update_and_route_recalculation(client):
    """Updating emergency with blocked corridor changes routing graph and recalculates route."""
    # 1. Activate emergency
    act_res = client.post(
        "/api/emergency/activate",
        json={
            "emergency_type": EmergencyType.SMOKE,
            "floor": "Floor 2",
            "location": "F2-202",
            "is_simulation": True,
        },
    )
    emg_id = act_res.get_json()["emergency"]["id"]

    # 2. Update with additional corridor blockage
    update_res = client.post(
        "/api/emergency/update",
        json={
            "emergency_id": emg_id,
            "blocked_corridors": [["F2-C-N", "F2-C-NE-1"]],
            "severity": EmergencySeverity.CRITICAL,
        },
    )
    assert update_res.status_code == 200
    upd_emg = update_res.get_json()["emergency"]
    assert upd_emg["severity"] == EmergencySeverity.CRITICAL

    # 3. Pathfinding from F2-201 should avoid blocked corridor
    route_res = client.post(
        "/api/find-route",
        json={"start": "F2-201", "target": "AUTO", "accessible": False},
    )
    assert route_res.status_code == 200
    route = route_res.get_json()
    assert route["distance"] > 0
    # Blocked edge must not be in path
    path = route["path"]
    edge_pairs = set(zip(path[:-1], path[1:])) | set(zip(path[1:], path[:-1]))
    assert ("F2-C-N", "F2-C-NE-1") not in edge_pairs

    # 4. Clean up resolve
    client.post("/api/emergency/resolve", json={"emergency_id": emg_id})


def test_manual_reporting_and_verification_flow(client):
    """Staff submits manual report, enters verification, officer confirms it."""
    # 1. Staff reports hazard
    report_res = client.post(
        "/api/emergency/report",
        json={
            "emergency_type": EmergencyType.GAS_LEAKAGE,
            "floor": "Floor 1",
            "location": "F1-113",
            "description": "Strong gas odor detected in chemistry corridor",
            "reporter": "security_guard_2",
            "is_simulation": True,
        },
    )
    assert report_res.status_code == 201
    rep_emg = report_res.get_json()["emergency"]
    assert rep_emg["status"] == EmergencyStatus.REPORTED

    # 2. Safety officer verifies
    verify_res = client.post(
        "/api/emergency/verify",
        json={
            "emergency_id": rep_emg["id"],
            "confirmed": True,
            "notes": "Gas leak verified by facility team. Initiating evacuation.",
        },
    )
    assert verify_res.status_code == 200
    verified_emg = verify_res.get_json()["emergency"]
    assert verified_emg["status"] == EmergencyStatus.ACTIVE

    # 3. Clean up
    client.post("/api/emergency/resolve", json={"emergency_id": rep_emg["id"]})


def test_sensor_ingestion_authentication_and_filtering(client):
    """Sensors must authenticate, ignore sub-threshold values, and trigger above threshold."""
    # 1. Unauthorized request without API key
    bad_res = client.post(
        "/api/emergency/sensor",
        json={"sensor_id": "TEMP-F2-01", "value": 90.0},
    )
    assert bad_res.status_code == 401

    headers = {"X-Sensor-Key": "evacroute-sensor-sec-token-2026"}

    # 2. Sub-threshold temperature reading (30.0°C <= 57.0°C) -> no emergency
    norm_res = client.post(
        "/api/emergency/sensor",
        headers=headers,
        json={
            "sensor_id": "TEMP-F2-01",
            "sensor_type": "temperature",
            "value": 30.0,
            "floor": "Floor 2",
            "location": "F2-201",
        },
    )
    assert norm_res.status_code == 200
    assert norm_res.get_json()["status"] == "normal"
    assert norm_res.get_json()["verified"] is False

    # Check status is still normal
    assert client.get("/api/emergency/status").get_json()["status"] == EmergencyStatus.NORMAL

    # 3. Critical temperature reading (85.0°C > 57.0°C) -> triggers emergency
    crit_res = client.post(
        "/api/emergency/sensor",
        headers=headers,
        json={
            "sensor_id": "TEMP-F2-CRIT",
            "sensor_type": "temperature",
            "value": 85.0,
            "floor": "Floor 2",
            "location": "F2-201",
            "is_simulation": True,
        },
    )
    assert crit_res.status_code == 200
    crit_data = crit_res.get_json()
    assert crit_data["status"] == "triggered"
    assert crit_data["severity"] == EmergencySeverity.CRITICAL

    # Building status should now be active
    st = client.get("/api/emergency/status").get_json()
    assert st["status"] == EmergencyStatus.ACTIVE
    assert st["emergency"]["source"] == "sensor:TEMP-F2-CRIT"

    # Clean up
    client.post("/api/emergency/resolve", json={"emergency_id": st["emergency"]["id"]})


def test_sensor_deduplication_rate_limiting(client):
    """Subsequent sensor triggers within cooldown period should be rate-limited."""
    headers = {"X-Sensor-Key": "evacroute-sensor-sec-token-2026"}
    # First trigger
    r1 = client.post(
        "/api/emergency/sensor",
        headers=headers,
        json={
            "sensor_id": "SMOKE-REPEAT-01",
            "sensor_type": "smoke",
            "value": 75.0,
            "is_simulation": True,
        },
    )
    assert r1.status_code == 200
    assert r1.get_json()["status"] == "triggered"

    # Immediate second trigger from same sensor
    r2 = client.post(
        "/api/emergency/sensor",
        headers=headers,
        json={
            "sensor_id": "SMOKE-REPEAT-01",
            "sensor_type": "smoke",
            "value": 78.0,
            "is_simulation": True,
        },
    )
    assert r2.status_code == 200
    assert r2.get_json()["status"] == "rate_limited"

    # Clean up
    st = client.get("/api/emergency/status").get_json()
    if st.get("emergency"):
        client.post("/api/emergency/resolve", json={"emergency_id": st["emergency"]["id"]})


def test_notifications_subscribe_stats_and_test_dispatch(client):
    """Subscribing push endpoint, querying stats, and test notification dispatch."""
    # 1. Fetch VAPID public key
    vk_res = client.get("/api/notifications/vapid-key")
    assert vk_res.status_code == 200
    assert "vapid_public_key" in vk_res.get_json()
    assert len(vk_res.get_json()["vapid_public_key"]) > 10

    # 2. Subscribe a test endpoint
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test-token-device-abc1234567890",
        "keys": {
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVYOISxkzKuVBMEdTNmk30",
            "auth": "tBHItJI5svbpez7KI4CCXg",
        },
        "role": "student",
        "is_test": True,
    }
    sub_res = client.post("/api/notifications/subscribe", json=sub_payload)
    assert sub_res.status_code == 201

    # 3. Check stats
    stats_res = client.get("/api/notifications/stats")
    assert stats_res.status_code == 200
    stats = stats_res.get_json()
    assert stats["test_subscribers"] >= 1

    # 4. Dispatch test notification
    test_res = client.post(
        "/api/notifications/test",
        json={"title": "Test Alert", "message": "Evacuation simulation in progress."},
    )
    assert test_res.status_code == 200
    assert test_res.get_json()["status"] == "success"

    # 5. Unsubscribe
    unsub_res = client.post(
        "/api/notifications/unsubscribe",
        json={"endpoint": sub_payload["endpoint"]},
    )
    assert unsub_res.status_code == 200


def test_emergency_history_and_audit_logging(client):
    """Resolved emergencies and admin actions should be preserved in history and audit log."""
    act_res = client.post(
        "/api/emergency/activate",
        json={
            "emergency_type": EmergencyType.BLOCKED_ROUTE,
            "floor": "Floor 3",
            "location": "F3-301",
            "is_simulation": True,
        },
    )
    emg_id = act_res.get_json()["emergency"]["id"]

    client.post(
        "/api/emergency/resolve",
        json={"emergency_id": emg_id, "admin_user": "safety_lead", "notes": "Route cleared."},
    )

    hist_res = client.get("/api/emergency/history")
    assert hist_res.status_code == 200
    history = hist_res.get_json()["history"]
    assert any(h["id"] == emg_id for h in history)
    matching = next(h for h in history if h["id"] == emg_id)
    assert len(matching["actions_log"]) >= 2


def test_corridor_clearing_and_multiple_sensor_triggers_on_active_emergency(client):
    """Subsequent sensor readings during active emergency append to event; corridors can be cleared."""
    # 1. Activate emergency
    act_res = client.post(
        "/api/emergency/activate",
        json={
            "emergency_type": EmergencyType.FIRE,
            "floor": "Floor 2",
            "location": "F2-201",
            "is_simulation": True,
        },
    )
    assert act_res.status_code == 201
    emg_id = act_res.get_json()["emergency"]["id"]

    # 2. Block and then clear a corridor dynamically
    upd_res = client.post(
        "/api/emergency/update",
        json={
            "emergency_id": emg_id,
            "blocked_corridors": [["F2-C-N", "F2-C-NE-1"]],
        },
    )
    assert upd_res.status_code == 200

    clear_res = client.post(
        "/api/emergency/update",
        json={
            "emergency_id": emg_id,
            "cleared_corridors": [["F2-C-N", "F2-C-NE-1"]],
        },
    )
    assert clear_res.status_code == 200

    # 3. Subsequent sensor triggers from another floor
    sensor_res = client.post(
        "/api/emergency/sensor",
        headers={"X-Sensor-Key": "evacroute-sensor-sec-token-2026"},
        json={
            "sensor_id": "SMOKE-F3-99",
            "sensor_type": "smoke",
            "value": 85.0,
            "floor": "Floor 3",
            "location": "F3-301",
            "is_simulation": True,
        },
    )
    assert sensor_res.status_code == 200

    # Verify active emergency ID is preserved and sensor telemetry logged
    status_res = client.get("/api/emergency/status")
    status_data = status_res.get_json()
    assert status_data["emergency"]["id"] == emg_id
    assert any("SMOKE-F3-99" in log["details"] for log in status_data["emergency"]["actions_log"])

    # Clean up
    client.post("/api/emergency/resolve", json={"emergency_id": emg_id})


def test_shelter_in_place_when_all_exits_blocked(client):
    """When all egress corridors are blocked, find_route returns distance -1, trapped status, and shelter warning."""
    # Block corridor outside F2-201
    client.post("/api/simulate-blockage", json={"u": "F2-201", "v": "F2-C-WEST"})

    route_res = client.post(
        "/api/find-route",
        json={"start": "F2-201", "target": "AUTO", "accessible": False},
    )
    assert route_res.status_code == 200
    route = route_res.get_json()
    assert route["distance"] == -1
    assert route["safety_status"] == "trapped"
    assert "shelter in place" in route["safety_warning"].lower()

    # Reset hazards
    client.post("/api/reset-simulation")
