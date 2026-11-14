"""Pathfinding, RSET calculation, and turn-by-turn evacuation guidance service."""

import math
from typing import Any, Dict, List, Optional
from algorithms.dijkstra import calculate_shortest_path, calculate_shortest_paths_to_targets
from core.constants import (
    ADA_WALK_SPEED,
    DEFAULT_WALK_SPEED,
    ELEVATOR_BOARDING_DELAY,
    ELEVATOR_SPEED,
    FLOOR_ORDER,
    HAZARD_CONFIG,
    STAIR_SPEED,
)
from core.exceptions import InaccessibleNodeError, NodeNotFoundError
from services.graph_service import GraphService


class PathfindingService:
    """Computes egress pathways, RSET metrics, guidance steps, and backup routes."""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    @staticmethod
    def format_duration(seconds: float) -> str:
        """Formats seconds into human-readable minutes and seconds."""
        total = max(0, int(round(seconds)))
        mins, secs = divmod(total, 60)
        if mins == 0:
            return f"{secs} sec"
        if secs == 0:
            return f"{mins} min"
        return f"{mins} min {secs} sec"

    @staticmethod
    def compass_direction(u_data: Optional[Dict[str, Any]], v_data: Optional[Dict[str, Any]]) -> str:
        """Determines compass bearing from node u to node v based on coordinate plane."""
        u_map = u_data or {}
        v_map = v_data or {}
        dx = v_map.get("x", 0) - u_map.get("x", 0)
        dy = v_map.get("y", 0) - u_map.get("y", 0)
        if dx == 0 and dy == 0:
            return ""

        angle = math.degrees(math.atan2(dy, dx))
        directions = [
            (-22.5, 22.5, "east"),
            (22.5, 67.5, "south-east"),
            (67.5, 112.5, "south"),
            (112.5, 157.5, "south-west"),
            (-67.5, -22.5, "north-east"),
            (-112.5, -67.5, "north"),
            (-157.5, -112.5, "north-west"),
        ]
        for low, high, name in directions:
            if low <= angle < high:
                return name
        return "west"

    def compute_physical_distance(self, path: List[str]) -> float:
        """Sums true physical edge weights along path."""
        if not path or len(path) < 2:
            return 0.0
        g = self.graph_service.graph
        return sum(g[path[i]][path[i + 1]]["weight"] for i in range(len(path) - 1))

    def compute_rset(self, path: List[str], accessible_only: bool = False) -> Dict[str, Any]:
        """Calculates Required Safe Egress Time (RSET) and per-segment breakdown."""
        walk_speed = ADA_WALK_SPEED if accessible_only else DEFAULT_WALK_SPEED
        stair_speed = STAIR_SPEED
        elevator_speed = ELEVATOR_SPEED
        elevator_delay = ELEVATOR_BOARDING_DELAY

        flat_distance = 0.0
        stair_distance = 0.0
        elevator_distance = 0.0
        flat_time = 0.0
        stair_time = 0.0
        elevator_time = 0.0

        prev_leg_type = None
        leg_details = []
        hazards_encountered = []
        g = self.graph_service.graph

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            dist = g[u][v]["weight"]
            u_data = g.nodes[u]
            v_data = g.nodes[v]
            floor_changed = u_data.get("floor") != v_data.get("floor")
            hazard = self.graph_service.get_edge_hazard(u, v)

            speed_mult = 1.0
            if hazard and hazard in HAZARD_CONFIG:
                mult = HAZARD_CONFIG[hazard]["speed_multiplier"]
                if mult > 0:
                    speed_mult = mult

            if hazard:
                hazards_encountered.append(hazard)

            if floor_changed and (
                u_data.get("type") == "elevator" or v_data.get("type") == "elevator"
            ):
                leg_type = "elevator"
                delay = elevator_delay if prev_leg_type != "elevator" else 0.0
                leg_time = (dist / (elevator_speed * speed_mult)) + delay
                elevator_distance += dist
                elevator_time += leg_time
            elif floor_changed and (
                u_data.get("type") == "staircase" or v_data.get("type") == "staircase"
            ):
                leg_type = "stairs"
                leg_time = dist / (stair_speed * speed_mult)
                stair_distance += dist
                stair_time += leg_time
            else:
                leg_type = "ramp" if (
                    u_data.get("type") == "ramp" or v_data.get("type") == "ramp"
                ) else "flat"
                leg_time = dist / (walk_speed * speed_mult)
                flat_distance += dist
                flat_time += leg_time

            prev_leg_type = leg_type
            leg_details.append({
                "type": leg_type,
                "distance": dist,
                "time_seconds": round(leg_time, 1),
                "hazard": hazard,
            })

        total_seconds = flat_time + stair_time + elevator_time
        return {
            "estimated_time_seconds": int(round(total_seconds)),
            "formatted_time": self.format_duration(total_seconds),
            "hazards_encountered": hazards_encountered,
            "rset_breakdown": {
                "flat_distance": round(flat_distance, 1),
                "stair_distance": round(stair_distance, 1),
                "elevator_distance": round(elevator_distance, 1),
                "flat_time_seconds": round(flat_time, 1),
                "stair_time_seconds": round(stair_time, 1),
                "elevator_time_seconds": round(elevator_time, 1),
                "walking_speed_ms": walk_speed,
                "stair_speed_ms": stair_speed,
                "elevator_speed_ms": elevator_speed,
            },
            "leg_details": leg_details,
        }

    def generate_steps(self, path: List[str], leg_details: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generates human-readable turn-by-turn navigation steps."""
        if not path:
            return []

        g = self.graph_service.graph

        if len(path) == 1:
            node_data = g.nodes[path[0]]
            return [{
                "step": 1,
                "from": path[0],
                "to": path[0],
                "from_label": node_data.get("label", path[0]),
                "to_label": node_data.get("label", path[0]),
                "floor": node_data.get("floor"),
                "to_floor": node_data.get("floor"),
                "distance": 0,
                "time_seconds": 0,
                "type": "exit" if node_data.get("type") == "exit" else "walk",
                "hazard": None,
                "instruction": f"You are already at {node_data.get('label', path[0])}.",
            }]

        steps = []
        for idx in range(len(path) - 1):
            u, v = path[idx], path[idx + 1]
            u_data = g.nodes[u]
            v_data = g.nodes[v]
            leg = leg_details[idx]
            dist = leg["distance"]
            hazard = leg.get("hazard")
            u_label = u_data.get("label", u)
            v_label = v_data.get("label", v)
            u_floor = u_data.get("floor", "")
            v_floor = v_data.get("floor", "")

            if u_floor != v_floor:
                u_rank = FLOOR_ORDER.get(u_floor, 0)
                v_rank = FLOOR_ORDER.get(v_floor, 0)
                going_down = v_rank < u_rank
                verb_dir = "down to" if going_down else "up to"

                if leg["type"] == "elevator":
                    action_type = "elevator"
                    instruction = f"Take {u_label} from {u_floor} {verb_dir} {v_floor}"
                else:
                    action_type = "stairs_down" if going_down else "stairs_up"
                    action_word = "Descend" if going_down else "Ascend"
                    instruction = f"{action_word} {u_label} from {u_floor} {verb_dir} {v_floor}"
            else:
                direction = self.compass_direction(u_data, v_data)
                dir_phrase = f"{direction} " if direction else ""

                if v_data.get("type") == "exit":
                    action_type = "exit"
                    instruction = f"Proceed {dir_phrase}{dist}m to exit via {v_label}"
                elif idx == 0 and u_data.get("type") == "classroom":
                    action_type = "walk"
                    instruction = f"Exit {u_label} and head {dir_phrase}{dist}m toward {v_label}"
                elif v_data.get("type") == "ramp":
                    action_type = "ramp"
                    instruction = f"Head {dir_phrase}{dist}m along {v_label}"
                elif v_data.get("type") == "staircase":
                    action_type = "walk"
                    instruction = f"Head {dir_phrase}{dist}m to {v_label}"
                elif v_data.get("type") == "elevator":
                    action_type = "walk"
                    instruction = f"Head {dir_phrase}{dist}m to {v_label} (Accessible Lift)"
                else:
                    action_type = "walk"
                    instruction = f"Walk {dir_phrase}{dist}m through {v_label}"

            steps.append({
                "step": idx + 1,
                "from": u,
                "to": v,
                "from_label": u_label,
                "to_label": v_label,
                "floor": u_floor,
                "to_floor": v_floor,
                "distance": dist,
                "time_seconds": leg["time_seconds"],
                "type": action_type,
                "hazard": hazard,
                "hazard_label": HAZARD_CONFIG[hazard]["label"] if hazard in HAZARD_CONFIG else None,
                "instruction": instruction,
            })

        return steps

    def enrich_route(self, raw_route: Dict[str, Any], accessible_only: bool = False) -> Dict[str, Any]:
        """Enriches raw shortest path result with physical length, RSET, and instructions."""
        path = raw_route.get("path", [])
        if raw_route.get("distance", -1) < 0 or not path:
            return raw_route

        g = self.graph_service.graph
        physical_distance = self.compute_physical_distance(path)
        effective_cost = round(raw_route["distance"], 1)
        rset = self.compute_rset(path, accessible_only=accessible_only)
        steps = self.generate_steps(path, rset["leg_details"])
        exit_id = path[-1]
        exit_node = g.nodes[exit_id]

        return {
            "distance": physical_distance,
            "effective_cost": effective_cost,
            "path": path,
            "edges": raw_route["edges"],
            "nodes_visited": raw_route["nodes_visited"],
            "estimated_time_seconds": rset["estimated_time_seconds"],
            "formatted_time": rset["formatted_time"],
            "hazards_encountered": rset["hazards_encountered"],
            "rset_breakdown": rset["rset_breakdown"],
            "target_exit": {
                "id": exit_id,
                "label": exit_node.get("label", exit_id),
                "floor": exit_node.get("floor", "Ground"),
            },
            "steps": steps,
        }

    def find_backup_route(
        self,
        graph_dict: Dict[str, Dict[str, float]],
        start: str,
        target: str,
        primary_path: List[str],
        auto_mode: bool,
        all_exits: List[str],
        accessible_only: bool,
    ) -> Optional[Dict[str, Any]]:
        """Finds secondary emergency pathway penalizing shared corridors from primary path."""
        if not primary_path or len(primary_path) < 2:
            return None

        primary_edges = set()
        for i in range(len(primary_path) - 1):
            u, v = primary_path[i], primary_path[i + 1]
            primary_edges.add((u, v))
            primary_edges.add((v, u))

        penalized_graph = {u: {} for u in graph_dict}
        for u, neighbors in graph_dict.items():
            for v, weight in neighbors.items():
                penalty = 10000.0 if (u, v) in primary_edges else 0.0
                penalized_graph[u][v] = weight + penalty

        candidate_raw = None

        if auto_mode:
            candidates = calculate_shortest_paths_to_targets(penalized_graph, start, all_exits)
            valid = [
                (eid, res) for eid, res in candidates.items()
                if res["distance"] >= 0 and res["path"] != primary_path
            ]
            if valid:
                _, best_res = min(valid, key=lambda item: item[1]["distance"])
                candidate_raw = best_res
        else:
            same_exit_res = calculate_shortest_path(penalized_graph, start, target)
            if same_exit_res["distance"] >= 0 and same_exit_res["path"] != primary_path:
                candidate_raw = same_exit_res
            else:
                other_exits = [e for e in all_exits if e != target]
                candidates = calculate_shortest_paths_to_targets(
                    penalized_graph, start, other_exits
                )
                valid = [
                    res for res in candidates.values()
                    if res["distance"] >= 0 and res["path"] != primary_path
                ]
                if valid:
                    candidate_raw = min(valid, key=lambda r: r["distance"])

        if not candidate_raw:
            return None

        return self.enrich_route(candidate_raw, accessible_only=accessible_only)

    def find_route(
        self,
        start: str,
        target: Optional[str] = "AUTO",
        accessible_only: bool = False,
    ) -> Dict[str, Any]:
        """Calculates primary evacuation route, exit candidates, and backup alternative."""
        g = self.graph_service.graph

        if start not in g:
            return {
                "distance": -1,
                "path": [],
                "edges": [],
                "nodes_visited": 0,
                "error": f"Unknown starting location: {start}",
                "exit_candidates": [],
                "backup_route": None,
            }

        if accessible_only and not self.graph_service.is_node_accessible(start):
            return {
                "distance": -1,
                "path": [],
                "edges": [],
                "nodes_visited": 0,
                "accessible_mode": True,
                "error": "Selected starting point is a staircase and cannot be accessed in Wheelchair / ADA mode.",
                "exit_candidates": [],
                "backup_route": None,
            }

        graph_dict = self.graph_service.get_graph_dict(accessible_only=accessible_only)
        all_exits = [
            n for n, d in g.nodes(data=True)
            if d.get("type") == "exit" and n in graph_dict
        ]
        auto_mode = target is None or str(target).upper() == "AUTO"

        all_exit_paths = calculate_shortest_paths_to_targets(graph_dict, start, all_exits)

        exit_candidates = []
        enriched_exit_routes = {}
        for eid in all_exits:
            raw = all_exit_paths[eid]
            node_data = g.nodes[eid]
            if raw["distance"] >= 0:
                enriched = self.enrich_route(raw, accessible_only=accessible_only)
                enriched_exit_routes[eid] = enriched
                exit_candidates.append({
                    "id": eid,
                    "label": node_data.get("label", eid),
                    "floor": node_data.get("floor", "Ground"),
                    "distance": enriched["distance"],
                    "effective_cost": enriched["effective_cost"],
                    "estimated_time_seconds": enriched["estimated_time_seconds"],
                    "formatted_time": enriched["formatted_time"],
                    "hazard_count": len(enriched["hazards_encountered"]),
                    "reachable": True,
                })
            else:
                exit_candidates.append({
                    "id": eid,
                    "label": node_data.get("label", eid),
                    "floor": node_data.get("floor", "Ground"),
                    "distance": -1,
                    "effective_cost": float("inf"),
                    "estimated_time_seconds": -1,
                    "formatted_time": "Blocked",
                    "hazard_count": 0,
                    "reachable": False,
                })

        exit_candidates.sort(
            key=lambda c: (not c["reachable"], c["effective_cost"] if c["reachable"] else float("inf"))
        )

        primary_enriched = None
        if auto_mode:
            reachable_candidates = [c for c in exit_candidates if c["reachable"]]
            if reachable_candidates:
                best_exit_id = reachable_candidates[0]["id"]
                primary_enriched = enriched_exit_routes[best_exit_id]
        else:
            if target in enriched_exit_routes:
                primary_enriched = enriched_exit_routes[target]
            else:
                raw_target = calculate_shortest_path(graph_dict, start, target)
                if raw_target["distance"] >= 0:
                    primary_enriched = self.enrich_route(raw_target, accessible_only=accessible_only)

        if not primary_enriched:
            fallback_route = None
            reachable_candidates = [c for c in exit_candidates if c["reachable"]]
            if not auto_mode and reachable_candidates:
                fallback_route = enriched_exit_routes[reachable_candidates[0]["id"]]

            return {
                "distance": -1,
                "path": [],
                "edges": [],
                "nodes_visited": len(graph_dict),
                "auto_selected": auto_mode,
                "accessible_mode": accessible_only,
                "exit_candidates": exit_candidates,
                "backup_route": fallback_route,
            }

        target_exit_id = primary_enriched["target_exit"]["id"] if auto_mode else target
        backup_route = self.find_backup_route(
            graph_dict=graph_dict,
            start=start,
            target=target_exit_id,
            primary_path=primary_enriched["path"],
            auto_mode=auto_mode,
            all_exits=all_exits,
            accessible_only=accessible_only,
        )

        return {
            **primary_enriched,
            "auto_selected": auto_mode,
            "accessible_mode": accessible_only,
            "exit_candidates": exit_candidates,
            "backup_route": backup_route,
        }
