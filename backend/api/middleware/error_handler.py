"""Global error handling middleware for Flask API."""

import logging
from flask import jsonify
from core.exceptions import EvacRouteException

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """Registers domain exception handlers and standard HTTP error handlers on Flask app."""

    @app.errorhandler(EvacRouteException)
    def handle_domain_exception(error):
        response = {
            "error": error.message,
            "status": error.status_code,
            "details": error.details,
        }
        return jsonify(response), error.status_code

    @app.errorhandler(400)
    def handle_bad_request(error):
        return jsonify({
            "error": "Bad request",
            "message": str(getattr(error, "description", error)),
            "status": 400,
        }), 400

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({
            "error": "Not found",
            "message": str(getattr(error, "description", error)),
            "status": 404,
        }), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({
            "error": "Method not allowed",
            "message": str(getattr(error, "description", error)),
            "status": 405,
        }), 405

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        logger.exception("Internal server error: %s", error)
        return jsonify({
            "error": "Internal server error",
            "message": "An unexpected error occurred while processing the request.",
            "status": 500,
        }), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error):
        logger.exception("Unhandled application error: %s", error)
        return jsonify({
            "error": "Internal server error",
            "message": str(error),
            "status": 500,
        }), 500
