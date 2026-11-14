"""Safety officer analytics and bottleneck detection service."""

from typing import Any, Dict, List
from algorithms.dijkstra import calculate_shortest_paths_to_targets
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService


class AnalyticsService:
    """Computes building egress analytics, bottleneck loads, and exit utilization."""

    def __init__(self, graph_service: GraphService, pathfinding_service: PathfindingService):
        self.graph_service = graph_service
        self.pathfinding_service = pathfinding_service

    def get_building_stats(self, accessible_only: bool = False) -> Dict[str, Any]:
        """Gathers comprehensive egress telemetry and room escape analysis."""
        g = self.graph_service.graph

        exits = [n for n, d in g.nodes(data=True) if d.get("type") == "exit"]
        elevators = [n for n, d in g.nodes(data=True) if d.get("type") == "elevator"]
        rooms = [
            (n, d) for n, d in g.nodes(data=True)
            if d.get("type") == "classroom"
        ]

        hazard_counts = {"fire": 0, "smoke": 0, "debris": 0}
        for h_type in self.graph_service.edge_hazards.values():
            if h_type in hazard_counts:
                hazard_counts[h_type] += 1

        graph_dict = self.graph_service.get_graph_dict(accessible_only=accessible_only)
        all_exits = [e for e in exits if e in graph_dict]

        room_evacuation_times: List[Dict[str, Any]] = []
        exit_counts = {
            e: {
                "id": e,
                "label": g.nodes[e].get("label", e),
                "rooms_count": 0,
                "total_rset": 0.0,
            }
            for e in exits
        }
        trapped_count = 0
        hub_loads: Dict[str, Dict[str, Any]] = {}
        corridor_loads: Dict[Any, Dict[str, Any]] = {}

        for room_id, room_data in rooms:
            if room_id not in graph_dict:
                trapped_count += 1
                room_evacuation_times.append({
                    "id": room_id,
                    "label": room_data.get("label", room_id),
                    "floor": room_data.get("floor", ""),
                    "distance": -1,
                    "time_seconds": 0,
                    "formatted_time": "Trapped",
                    "assigned_exit": "None",
                    "hazards_crossed": 0,
                    "reachable": False,
                })
                continue

            exit_paths = calculate_shortest_paths_to_targets(graph_dict, room_id, all_exits)
            best_raw = None
            for eid in all_exits:
                res = exit_paths[eid]
                if res["distance"] >= 0:
                    if best_raw is None or res["distance"] < best_raw["distance"]:
                        best_raw = res

            if best_raw is None:
                trapped_count += 1
                room_evacuation_times.append({
                    "id": room_id,
                    "label": room_data.get("label", room_id),
                    "floor": room_data.get("floor", ""),
                    "distance": -1,
                    "time_seconds": 0,
                    "formatted_time": "Trapped",
                    "assigned_exit": "None",
                    "hazards_crossed": 0,
                    "reachable": False,
                })
                continue

            enriched = self.pathfinding_service.enrich_route(best_raw, accessible_only=accessible_only)
            chosen_exit = enriched["target_exit"]["id"]
            if chosen_exit in exit_counts:
                exit_counts[chosen_exit]["rooms_count"] += 1
                exit_counts[chosen_exit]["total_rset"] += enriched["estimated_time_seconds"]

            room_evacuation_times.append({
                "id": room_id,
                "label": room_data.get("label", room_id),
                "floor": room_data.get("floor", ""),
                "distance": enriched["distance"],
                "time_seconds": enriched["estimated_time_seconds"],
                "formatted_time": enriched["formatted_time"],
                "assigned_exit": enriched["target_exit"]["label"],
                "hazards_crossed": len(enriched["hazards_encountered"]),
                "reachable": True,
            })

            # Intermediate transit hubs & edges
            path = enriched["path"]
            for node_id in path[1:-1]:
                node_meta = g.nodes[node_id]
                key_name = f"{node_meta.get('label', node_id)} ({node_meta.get('floor', '')})"
                if node_id not in hub_loads:
                    hub_loads[node_id] = {
                        "id": node_id,
                        "name": key_name,
                        "label": node_meta.get("label", node_id),
                        "floor": node_meta.get("floor", ""),
                        "type": node_meta.get("type", "corridor"),
                        "route_count": 0,
                    }
                hub_loads[node_id]["route_count"] += 1

            for i in range(len(path) - 1):
                ek = self.graph_service.edge_key(path[i], path[i + 1])
                if ek not in corridor_loads:
                    u_lbl = g.nodes[ek[0]].get("label", ek[0])
                    v_lbl = g.nodes[ek[1]].get("label", ek[1])
                    corridor_loads[ek] = {
                        "corridor": f"{u_lbl} ↔ {v_lbl}",
                        "u": ek[0],
                        "v": ek[1],
                        "hazard": self.graph_service.get_edge_hazard(ek[0], ek[1]),
                        "route_count": 0,
                    }
                corridor_loads[ek]["route_count"] += 1

        total_rooms = len(rooms)
        reachable_rooms = [r for r in room_evacuation_times if r["reachable"]]
        avg_rset = (
            round(sum(r["time_seconds"] for r in reachable_rooms) / len(reachable_rooms))
            if reachable_rooms else 0
        )
        slowest_room = (
            max(reachable_rooms, key=lambda r: r["time_seconds"])
            if reachable_rooms else None
        )

        room_evacuation_times.sort(key=lambda r: (r["reachable"], -r["time_seconds"]))

        exit_utilization = []
        for e_info in exit_counts.values():
            cnt = e_info["rooms_count"]
            exit_utilization.append({
                "id": e_info["id"],
                "name": e_info["label"],
                "rooms": cnt,
                "share_percent": round((cnt / total_rooms) * 100) if total_rooms else 0,
                "avg_rset_seconds": round(e_info["total_rset"] / cnt) if cnt else 0,
            })

        if trapped_count > 0:
            exit_utilization.append({
                "id": "TRAPPED",
                "name": "No Exit (Blocked)",
                "rooms": trapped_count,
                "share_percent": round((trapped_count / total_rooms) * 100) if total_rooms else 0,
                "avg_rset_seconds": 0,
            })

        top_hubs = sorted(hub_loads.values(), key=lambda h: -h["route_count"])[:6]
        for h in top_hubs:
            h["load_percent"] = round((h["route_count"] / total_rooms) * 100) if total_rooms else 0

        top_corridors = sorted(corridor_loads.values(), key=lambda c: -c["route_count"])[:6]
        for c in top_corridors:
            c["load_percent"] = round((c["route_count"] / total_rooms) * 100) if total_rooms else 0

        return {
            "total_vertices": g.number_of_nodes(),
            "total_edges": g.number_of_edges(),
            "total_exits": len(exits),
            "total_elevators": len(elevators),
            "blocked_pathways": hazard_counts["fire"],
            "active_hazards": sum(hazard_counts.values()),
            "hazard_counts": hazard_counts,
            "floors": self.graph_service.get_floors(),
            "analytics": {
                "accessible_mode": accessible_only,
                "summary": {
                    "total_rooms": total_rooms,
                    "reachable_rooms": len(reachable_rooms),
                    "trapped_rooms": trapped_count,
                    "avg_rset_seconds": avg_rset,
                    "avg_rset_formatted": self.pathfinding_service.format_duration(avg_rset),
                    "max_rset_seconds": slowest_room["time_seconds"] if slowest_room else 0,
                    "max_rset_formatted": slowest_room["formatted_time"] if slowest_room else "N/A",
                    "slowest_room_label": (
                        f"{slowest_room['label']} ({slowest_room['floor']})"
                        if slowest_room else "N/A"
                    ),
                },
                "room_evacuation_times": room_evacuation_times,
                "exit_utilization": exit_utilization,
                "bottleneck_hubs": top_hubs,
                "bottleneck_corridors": top_corridors,
            },
        }
