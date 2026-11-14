"""Backward-compatible facade for BuildingGraph delegating to domain services."""

import os
from pathlib import Path
from core.constants import FLOOR_ORDER, HAZARD_CONFIG
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService
from services.analytics_service import AnalyticsService

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_PATH = os.path.join(BASE_DIR, "data", "graph_data.json")


class BuildingGraph:
    """Facade for building navigation graph, hazard state, pathfinding, and egress metrics."""

    def __init__(self, data_path=DEFAULT_DATA_PATH):
        self.data_path = str(data_path)
        self.graph_service = GraphService(Path(self.data_path))
        self.pathfinding_service = PathfindingService(self.graph_service)
        self.analytics_service = AnalyticsService(self.graph_service, self.pathfinding_service)

    @property
    def G(self):
        """Underlying networkx Graph instance."""
        return self.graph_service.graph

    @property
    def edge_hazards(self):
        """Active edge hazard mappings."""
        return self.graph_service.edge_hazards

    @staticmethod
    def _edge_key(u, v):
        return GraphService.edge_key(u, v)

    @property
    def blocked_edges(self):
        return self.graph_service.blocked_edges

    def get_hazards_list(self):
        return self.graph_service.get_hazards_list()

    def get_edge_hazard(self, u, v):
        return self.graph_service.get_edge_hazard(u, v)

    def load_graph(self):
        self.graph_service.load_graph()

    def is_node_accessible(self, node_id):
        return self.graph_service.is_node_accessible(node_id)

    def get_active_graph_dict(self, accessible_only=False):
        return self.graph_service.get_graph_dict(accessible_only=accessible_only)

    @staticmethod
    def _format_duration(seconds):
        return PathfindingService.format_duration(seconds)

    @staticmethod
    def _compass_direction(u_data, v_data):
        return PathfindingService.compass_direction(u_data, v_data)

    def _compute_physical_distance(self, path):
        return self.pathfinding_service.compute_physical_distance(path)

    def _compute_rset(self, path, accessible_only=False):
        return self.pathfinding_service.compute_rset(path, accessible_only=accessible_only)

    def _generate_steps(self, path, leg_details):
        return self.pathfinding_service.generate_steps(path, leg_details)

    def _enrich_route(self, raw_route, accessible_only=False):
        return self.pathfinding_service.enrich_route(raw_route, accessible_only=accessible_only)

    def _find_backup_route(
        self, graph_dict, start, target, primary_path, auto_mode, all_exits, accessible_only
    ):
        return self.pathfinding_service.find_backup_route(
            graph_dict, start, target, primary_path, auto_mode, all_exits, accessible_only
        )

    def find_route(self, start, target="AUTO", accessible_only=False):
        return self.pathfinding_service.find_route(
            start=start, target=target, accessible_only=accessible_only
        )

    def set_edge_hazard(self, u, v, hazard_type="fire"):
        try:
            return self.graph_service.set_edge_hazard(u, v, hazard_type)
        except Exception:
            return False

    def block_corridor(self, u, v):
        return self.set_edge_hazard(u, v, "fire")

    def reset_simulation(self):
        self.graph_service.reset_hazards()

    def get_floors(self):
        return self.graph_service.get_floors()

    def get_stats(self, accessible_only=False):
        return self.analytics_service.get_building_stats(accessible_only=accessible_only)
