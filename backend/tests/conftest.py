"""Pytest fixtures for EvacRoute backend testing."""

import pytest
from api import create_app
from config import TestingConfig
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService
from services.analytics_service import AnalyticsService


@pytest.fixture
def app():
    """Creates test Flask application."""
    app = create_app(TestingConfig)
    return app


@pytest.fixture
def client(app):
    """Provides Flask test client."""
    return app.test_client()


@pytest.fixture
def graph_service(app):
    """Provides GraphService instance from app extensions."""
    service = app.extensions["graph_service"]
    service.reset_hazards()
    return service


@pytest.fixture
def pathfinding_service(app):
    """Provides PathfindingService instance from app extensions."""
    return app.extensions["pathfinding_service"]


@pytest.fixture
def analytics_service(app):
    """Provides AnalyticsService instance from app extensions."""
    return app.extensions["analytics_service"]
