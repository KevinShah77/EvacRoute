"""Push notification subscription and delivery routes."""

from flask import Blueprint, current_app, jsonify, request

notification_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def _get_service():
    return current_app.extensions["notification_service"]


@notification_bp.route("/vapid-key", methods=["GET"])
def get_vapid_key():
    """Returns VAPID public key for browser push subscription."""
    svc = _get_service()
    return jsonify({"vapid_public_key": svc.get_vapid_public_key()}), 200


@notification_bp.route("/subscribe", methods=["POST"])
def subscribe():
    """Registers a browser device push subscription."""
    svc = _get_service()
    payload = request.get_json(silent=True) or {}
    try:
        record = svc.subscribe(payload)
        return jsonify({"status": "success", "subscription": record}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to register subscription: {e}"}), 500


@notification_bp.route("/unsubscribe", methods=["POST"])
def unsubscribe():
    """Unregisters a push subscription by endpoint."""
    svc = _get_service()
    payload = request.get_json(silent=True) or {}
    endpoint = payload.get("endpoint")
    if not endpoint:
        return jsonify({"error": "Missing 'endpoint'"}), 400

    removed = svc.unsubscribe(endpoint)
    return jsonify({"status": "success", "removed": removed}), 200


@notification_bp.route("/stats", methods=["GET"])
def get_stats():
    """Returns notification delivery statistics and subscriber counts."""
    svc = _get_service()
    return jsonify(svc.get_stats()), 200


@notification_bp.route("/test", methods=["POST"])
def send_test_notification():
    """Sends a test emergency push notification (for simulation demo)."""
    svc = _get_service()
    payload = request.get_json(silent=True) or {}

    title = payload.get("title", "[SIMULATION] EVACROUTE – TEST ALERT")
    message = payload.get(
        "message",
        "This is a test notification from the EvacRoute Emergency System. Evacuation guidance is active.",
    )

    emergency_mock = {
        "id": "EMG-TEST-SIM",
        "type": "fire",
        "severity": "high",
        "floor": "Floor 2",
        "location": "Simulation Lab (201)",
    }

    result = svc.send_broadcast(
        title=title,
        message=message,
        emergency_data=emergency_mock,
        is_simulation=True,
    )
    return jsonify(result), 200
