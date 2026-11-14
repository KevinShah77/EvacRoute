"""Emergency detection, activation, sensor ingestion, and real-time SSE routes."""

import json
from flask import Blueprint, Response, current_app, jsonify, request, stream_with_context

emergency_bp = Blueprint("emergency", __name__, url_prefix="/api/emergency")


def _get_services():
    emergency_service = current_app.extensions["emergency_service"]
    sensor_service = current_app.extensions["sensor_service"]
    realtime_service = current_app.extensions["realtime_service"]
    return emergency_service, sensor_service, realtime_service


@emergency_bp.route("/status", methods=["GET"])
def get_emergency_status():
    """Returns current active emergency status, hazard locations, exits, and assembly points."""
    emergency_service, _, _ = _get_services()
    status_data = emergency_service.get_status()
    return jsonify(status_data), 200


@emergency_bp.route("/activate", methods=["POST"])
def activate_emergency():
    """Activates an emergency state, applies hazards, and broadcasts notifications."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    # Basic authorization check
    auth_header = request.headers.get("Authorization") or request.headers.get("X-Admin-Key")
    # Allow local dev or test calls, or validate secret token if configured
    admin_token = current_app.config.get("ADMIN_API_KEY", "evacroute-admin-secret-2026")
    if auth_header and auth_header.replace("Bearer ", "").strip() != admin_token:
        return jsonify({"error": "Unauthorized. Valid administrator credentials required."}), 403

    emergency_type = payload.get("emergency_type", "fire")
    building = payload.get("building", "Main Academic Block")
    floor = payload.get("floor", "Floor 2")
    location = payload.get("location", "F2-201")
    severity = payload.get("severity", "high")
    description = payload.get("description", "Administrator activated emergency response")
    is_simulation = payload.get("is_simulation", False)
    custom_edges = payload.get("custom_edges", [])

    result = emergency_service.activate_emergency(
        emergency_type=emergency_type,
        building=building,
        floor=floor,
        location=location,
        severity=severity,
        description=description,
        source="admin",
        is_simulation=is_simulation,
        custom_edges=custom_edges,
    )
    return jsonify({"status": "success", "emergency": result}), 201


@emergency_bp.route("/report", methods=["POST"])
def report_emergency():
    """Submits a manual emergency report from security or staff personnel."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    emergency_type = payload.get("emergency_type", "general")
    building = payload.get("building", "Main Academic Block")
    floor = payload.get("floor", "Floor 2")
    location = payload.get("location", "Building Area")
    description = payload.get("description", "")
    severity = payload.get("severity", "medium")
    is_simulation = payload.get("is_simulation", False)
    reporter = payload.get("reporter", "staff")

    result = emergency_service.report_emergency(
        emergency_type=emergency_type,
        building=building,
        floor=floor,
        location=location,
        description=description,
        source=f"manual:{reporter}",
        severity=severity,
        is_simulation=is_simulation,
    )
    return jsonify({"status": "success", "emergency": result}), 201


@emergency_bp.route("/verify", methods=["POST"])
def verify_emergency():
    """Confirms or dismisses a reported emergency event."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    emergency_id = payload.get("emergency_id")
    if not emergency_id:
        return jsonify({"error": "Missing required field 'emergency_id'"}), 400

    confirmed = payload.get("confirmed", True)
    notes = payload.get("notes", "")
    admin_user = payload.get("admin_user", "safety_officer")

    try:
        result = emergency_service.verify_emergency(
            emergency_id=emergency_id,
            confirmed=confirmed,
            admin_user=admin_user,
            notes=notes,
        )
        return jsonify({"status": "success", "emergency": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@emergency_bp.route("/update", methods=["POST"])
def update_emergency():
    """Updates active emergency parameters, spreads fire, or blocks corridors."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    emergency_id = payload.get("emergency_id")
    if not emergency_id:
        return jsonify({"error": "Missing required field 'emergency_id'"}), 400

    additional_hazards = payload.get("additional_hazards")
    blocked_corridors = payload.get("blocked_corridors")
    cleared_corridors = payload.get("cleared_corridors")
    severity = payload.get("severity")
    description = payload.get("description")
    admin_user = payload.get("admin_user", "safety_officer")

    try:
        result = emergency_service.update_emergency(
            emergency_id=emergency_id,
            additional_hazards=additional_hazards,
            blocked_corridors=blocked_corridors,
            cleared_corridors=cleared_corridors,
            severity=severity,
            description=description,
            admin_user=admin_user,
        )
        return jsonify({"status": "success", "emergency": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@emergency_bp.route("/resolve", methods=["POST"])
def resolve_emergency():
    """Resolves the active emergency, resets hazards, and sends an all-clear notification."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    emergency_id = payload.get("emergency_id")
    if not emergency_id:
        return jsonify({"error": "Missing required field 'emergency_id'"}), 400

    notes = payload.get("notes", "Emergency officially declared resolved by safety personnel.")
    admin_user = payload.get("admin_user", "safety_officer")

    try:
        result = emergency_service.resolve_emergency(
            emergency_id=emergency_id,
            admin_user=admin_user,
            notes=notes,
        )
        return jsonify({"status": "success", "emergency": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@emergency_bp.route("/sensor", methods=["POST"])
def ingest_sensor_data():
    """Secure ingestion endpoint for physical IoT sensors with false-alarm verification."""
    _, sensor_service, _ = _get_services()
    payload = request.get_json(silent=True) or {}

    # Check authentication token
    auth_token = request.headers.get("X-Sensor-Key") or payload.get("token")
    if not sensor_service.authenticate(auth_token):
        return jsonify({"error": "Unauthorized sensor request. Valid sensor API key required."}), 401

    sensor_id = payload.get("sensor_id")
    if not sensor_id:
        return jsonify({"error": "Missing 'sensor_id'"}), 400

    sensor_type = payload.get("sensor_type", "smoke")
    value = float(payload.get("value", 0.0))
    building = payload.get("building", "Main Academic Block")
    floor = payload.get("floor", "Floor 2")
    location = payload.get("location", "F2-201")
    description = payload.get("description", "")
    is_simulation = payload.get("is_simulation", False)
    raw_metadata = payload.get("metadata", {})

    result = sensor_service.process_sensor_reading(
        sensor_id=sensor_id,
        sensor_type=sensor_type,
        value=value,
        building=building,
        floor=floor,
        location=location,
        description=description,
        raw_metadata=raw_metadata,
        is_simulation=is_simulation,
    )
    return jsonify(result), 200


@emergency_bp.route("/sensor-readings", methods=["GET"])
def get_sensor_readings():
    """Returns recent sensor telemetry records."""
    _, sensor_service, _ = _get_services()
    return jsonify({"readings": sensor_service.get_recent_readings()}), 200


@emergency_bp.route("/history", methods=["GET"])
def get_emergency_history():
    """Returns all past emergency incidents and administrative audit logs."""
    emergency_service, _, _ = _get_services()
    return jsonify({"history": emergency_service.get_history()}), 200


@emergency_bp.route("/guide-session", methods=["POST"])
def toggle_guide_session():
    """Tracks active users following voice navigation."""
    emergency_service, _, _ = _get_services()
    payload = request.get_json(silent=True) or {}
    action = payload.get("action", "start")
    if action == "start":
        count = emergency_service.register_guided_user()
    else:
        count = emergency_service.unregister_guided_user()
    return jsonify({"active_guided_users": count}), 200


@emergency_bp.route("/events", methods=["GET"])
def sse_events():
    """Server-Sent Events (SSE) stream for real-time live emergency updates."""
    emergency_service, _, realtime_service = _get_services()
    initial_status = emergency_service.get_status()

    return Response(
        stream_with_context(realtime_service.sse_stream(initial_status)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
