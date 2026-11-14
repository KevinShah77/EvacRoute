"""Building graph topology and hazard state service."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx

from core.constants import FLOOR_ORDER, HAZARD_CONFIG
from core.exceptions import EdgeNotFoundError, InvalidHazardError, NodeNotFoundError


class GraphService:
    """Manages the building graph topology, floor mappings, and active hazard states."""

    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        self.graph = nx.Graph()
        self.edge_hazards: Dict[Tuple[str, str], str] = {}
        self.load_graph()

    @staticmethod
    def edge_key(u: Any, v: Any) -> Tuple[str, str]:
        """Returns normalized canonical sorted tuple for an undirected edge."""
        return tuple(sorted((str(u), str(v))))

    def load_graph(self) -> None:
        """Loads nodes and edges from JSON data file."""
        if not self.data_path.exists():
            raise FileNotFoundError(f"Building data file not found: {self.data_path}")

        self.graph.clear()
        self.edge_hazards.clear()

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for node in data.get("nodes", []):
            attrs = {k: v for k, v in node.items() if k != "id"}
            self.graph.add_node(str(node["id"]), **attrs)

        for edge in data.get("edges", []):
            self.graph.add_edge(
                str(edge["source"]),
                str(edge["target"]),
                weight=float(edge["weight"]),
            )

    @property
    def blocked_edges(self) -> List[List[str]]:
        """Returns list of edges currently fully impassable."""
        return [
            list(key)
            for key, h_type in self.edge_hazards.items()
            if HAZARD_CONFIG.get(h_type, {}).get("blocked")
        ]

    def get_hazards_list(self) -> List[Dict[str, Any]]:
        """Returns serialized list of active hazards."""
        return [
            {
                "u": key[0],
                "v": key[1],
                "type": h_type,
                "label": HAZARD_CONFIG.get(h_type, {}).get("label", h_type),
                "blocked": HAZARD_CONFIG.get(h_type, {}).get("blocked", False),
            }
            for key, h_type in self.edge_hazards.items()
        ]

    def get_edge_hazard(self, u: str, v: str) -> Optional[str]:
        """Returns hazard type for edge between u and v if present."""
        return self.edge_hazards.get(self.edge_key(u, v))

    def set_edge_hazard(self, u: str, v: str, hazard_type: Optional[str] = "fire") -> bool:
        """Sets or clears hazard on the corridor between u and v."""
        u_str, v_str = str(u), str(v)
        if not self.graph.has_edge(u_str, v_str):
            raise EdgeNotFoundError(u_str, v_str)

        key = self.edge_key(u_str, v_str)

        if hazard_type is None or hazard_type == "clear":
            self.edge_hazards.pop(key, None)
            return True

        if hazard_type not in HAZARD_CONFIG:
            raise InvalidHazardError(hazard_type, list(HAZARD_CONFIG.keys()) + ["clear"])

        self.edge_hazards[key] = hazard_type
        return True

    def reset_hazards(self) -> None:
        """Clears all active edge hazards."""
        self.edge_hazards.clear()

    def is_node_accessible(self, node_id: str) -> bool:
        """Checks whether a node can be navigated by wheelchair/ADA occupants."""
        if node_id not in self.graph:
            return False
        data = self.graph.nodes[node_id]
        if data.get("type") == "staircase":
            return False
        if data.get("accessible") is False:
            return False
        return True

    def get_floors(self) -> List[str]:
        """Returns sorted list of distinct building floors."""
        floors = {
            d.get("floor")
            for _, d in self.graph.nodes(data=True)
            if d.get("floor")
        }
        return sorted(floors, key=lambda f: (FLOOR_ORDER.get(f, 99), f))

    def get_graph_dict(self, accessible_only: bool = False) -> Dict[str, Dict[str, float]]:
        """Builds adjacency dictionary with hazard penalties and ADA restrictions applied."""
        allowed_nodes = [
            n for n in self.graph.nodes()
            if not accessible_only or self.is_node_accessible(n)
        ]
        allowed_set: Set[str] = set(allowed_nodes)
        graph_dict: Dict[str, Dict[str, float]] = {node: {} for node in allowed_nodes}

        for u, v, data in self.graph.edges(data=True):
            if u not in allowed_set or v not in allowed_set:
                continue
            if accessible_only and data.get("accessible") is False:
                continue

            hazard = self.get_edge_hazard(u, v)
            if hazard:
                cfg = HAZARD_CONFIG.get(hazard)
                if cfg:
                    if cfg["blocked"]:
                        continue
                    if accessible_only and cfg["ada_blocked"]:
                        continue
                    effective_weight = data["weight"] * cfg["penalty"]
                else:
                    effective_weight = data["weight"]
            else:
                effective_weight = data["weight"]

            graph_dict[u][v] = effective_weight
            graph_dict[v][u] = effective_weight

        return graph_dict
