"""Safety officer analytics and bottleneck detection service."""

from typing import Any, Dict, List, Optional
from algorithms.dijkstra import calculate_shortest_path, calculate_shortest_paths_to_targets
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
            "available_entrances": [
                {
                    "id": e,
                    "label": g.nodes[e].get("label", e),
                    "floor": g.nodes[e].get("floor", ""),
                    "accessible": g.nodes[e].get("accessible", True),
                }
                for e in exits
            ],
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

    def get_floor_evacuation_graph(
        self,
        floor: Optional[str] = None,
        entrance_id: Optional[str] = None,
        accessible_only: bool = False,
    ) -> Dict[str, Any]:
        """Calculates dynamic floor-wise and entrance-wise evacuation topology and metrics.

        Computes reachability of all rooms on the selected floor towards the selected entrance,
        accounting for multi-floor vertical transitions (staircases, elevators, ramps),
        active corridor hazards, and ADA accessibility constraints.
        """
        g = self.graph_service.graph
        floors = self.graph_service.get_floors()
        if not floor or floor not in floors:
            floor = floors[0] if floors else "Ground"

        all_exits = [n for n, d in g.nodes(data=True) if d.get("type") == "exit"]
        if not entrance_id or entrance_id not in all_exits:
            entrance_id = all_exits[0] if all_exits else "GF-E-MAIN"

        entrance_meta = dict(g.nodes[entrance_id]) if entrance_id in g else {}
        entrance_meta["id"] = entrance_id

        graph_dict = self.graph_service.get_graph_dict(accessible_only=accessible_only)

        floor_rooms = [
            (n, d) for n, d in g.nodes(data=True)
            if d.get("floor") == floor and d.get("type") == "classroom"
        ]

        room_results: List[Dict[str, Any]] = []
        floor_node_traffic: Dict[str, int] = {}
        floor_edge_traffic: Dict[Any, int] = {}
        vertical_egress_traffic: Dict[str, int] = {}

        for room_id, room_data in floor_rooms:
            if room_id not in graph_dict or entrance_id not in graph_dict:
                room_results.append({
                    "id": room_id,
                    "label": room_data.get("label", room_id),
                    "floor": floor,
                    "distance": -1,
                    "time_seconds": 0,
                    "formatted_time": "Trapped / Blocked",
                    "path": [],
                    "hazards_crossed": 0,
                    "reachable": False,
                })
                continue

            raw_path = calculate_shortest_path(graph_dict, room_id, entrance_id)
            if raw_path["distance"] < 0:
                room_results.append({
                    "id": room_id,
                    "label": room_data.get("label", room_id),
                    "floor": floor,
                    "distance": -1,
                    "time_seconds": 0,
                    "formatted_time": "Trapped / Blocked",
                    "path": [],
                    "hazards_crossed": 0,
                    "reachable": False,
                })
                continue

            enriched = self.pathfinding_service.enrich_route(raw_path, accessible_only=accessible_only)
            path = enriched["path"]
            hazards_count = len(enriched.get("hazards_encountered", []))

            room_results.append({
                "id": room_id,
                "label": room_data.get("label", room_id),
                "floor": floor,
                "distance": enriched["distance"],
                "time_seconds": enriched["estimated_time_seconds"],
                "formatted_time": enriched["formatted_time"],
                "path": path,
                "hazards_crossed": hazards_count,
                "reachable": True,
            })

            # Record traffic load for nodes on this floor
            for node in path:
                if g.nodes[node].get("floor") == floor:
                    floor_node_traffic[node] = floor_node_traffic.get(node, 0) + 1

            # Record traffic load for edges on this floor & vertical exits
            for i in range(len(path) - 1):
                u, v = path[i], path[i + 1]
                u_floor = g.nodes[u].get("floor")
                v_floor = g.nodes[v].get("floor")
                if u_floor == floor and v_floor == floor:
                    ek = self.graph_service.edge_key(u, v)
                    floor_edge_traffic[ek] = floor_edge_traffic.get(ek, 0) + 1
                elif u_floor == floor and v_floor != floor:
                    vertical_egress_traffic[u] = vertical_egress_traffic.get(u, 0) + 1

        reachable_rooms = [r for r in room_results if r["reachable"]]
        total_rooms = len(floor_rooms)
        reachable_count = len(reachable_rooms)
        unreachable_count = total_rooms - reachable_count
        avg_rset = (
            round(sum(r["time_seconds"] for r in reachable_rooms) / reachable_count)
            if reachable_count else 0
        )

        shortest_room = (
            min(reachable_rooms, key=lambda r: r["time_seconds"])
            if reachable_rooms else None
        )
        longest_room = (
            max(reachable_rooms, key=lambda r: r["time_seconds"])
            if reachable_rooms else None
        )

        room_results.sort(key=lambda r: (not r["reachable"], r["time_seconds"]))

        # Build floor nodes representation
        nodes_list: List[Dict[str, Any]] = []
        floor_nodes = [
            (n, d) for n, d in g.nodes(data=True)
            if d.get("floor") == floor
        ]

        entrance_on_this_floor = entrance_meta.get("floor") == floor

        for nid, d in floor_nodes:
            is_room = d.get("type") == "classroom"
            room_info = next((r for r in room_results if r["id"] == nid), None)
            is_reach = (
                room_info["reachable"]
                if is_room and room_info
                else (nid in graph_dict)
            )

            nodes_list.append({
                "id": nid,
                "label": d.get("label", nid),
                "floor": d.get("floor", floor),
                "type": d.get("type", "corridor"),
                "accessible": d.get("accessible", True),
                "x": d.get("x", 50),
                "y": d.get("y", 50),
                "reachable": is_reach,
                "is_evacuation_path": nid in floor_node_traffic,
                "route_count": floor_node_traffic.get(nid, 0),
                "distance": room_info["distance"] if room_info else None,
                "formatted_time": room_info["formatted_time"] if room_info else None,
                "is_target_entrance": nid == entrance_id,
                "is_external": False,
            })

        # If entrance is on a different floor, include target entrance node for cross-floor visualization
        if not entrance_on_this_floor:
            nodes_list.append({
                "id": entrance_id,
                "label": f"{entrance_meta.get('label', entrance_id)} ({entrance_meta.get('floor')})",
                "floor": entrance_meta.get("floor", ""),
                "type": "exit",
                "accessible": entrance_meta.get("accessible", True),
                "x": entrance_meta.get("x", 50),
                "y": entrance_meta.get("y", 50),
                "reachable": entrance_id in graph_dict,
                "is_evacuation_path": reachable_count > 0,
                "route_count": reachable_count,
                "is_target_entrance": True,
                "is_external": True,
            })

        # Build floor edges representation
        edges_list: List[Dict[str, Any]] = []
        floor_hazard_count = 0

        for u, v, d in g.edges(data=True):
            if g.nodes[u].get("floor") == floor and g.nodes[v].get("floor") == floor:
                ek = self.graph_service.edge_key(u, v)
                h = self.graph_service.get_edge_hazard(u, v)
                if h:
                    floor_hazard_count += 1
                edges_list.append({
                    "source": u,
                    "target": v,
                    "weight": d["weight"],
                    "hazard": h,
                    "is_evacuation_path": ek in floor_edge_traffic,
                    "route_count": floor_edge_traffic.get(ek, 0),
                    "is_vertical_connector": False,
                })

        # Add multi-floor vertical egress links to target entrance if on another floor
        if not entrance_on_this_floor:
            for v_node, count in vertical_egress_traffic.items():
                v_meta = g.nodes[v_node]
                edges_list.append({
                    "source": v_node,
                    "target": entrance_id,
                    "weight": 10.0,
                    "hazard": None,
                    "is_evacuation_path": True,
                    "route_count": count,
                    "is_vertical_connector": True,
                    "label": f"To {entrance_meta.get('label', entrance_id)}",
                })

        # Bottlenecks on this floor
        bottleneck_hubs = [
            {
                "id": nid,
                "label": g.nodes[nid].get("label", nid),
                "type": g.nodes[nid].get("type", "corridor"),
                "route_count": count,
                "load_percent": round((count / total_rooms) * 100) if total_rooms else 0,
            }
            for nid, count in sorted(floor_node_traffic.items(), key=lambda x: -x[1])
            if g.nodes[nid].get("type") in ("corridor", "staircase", "elevator", "ramp")
        ][:4]

        bottleneck_corridors = [
            {
                "u": ek[0],
                "v": ek[1],
                "corridor": f"{g.nodes[ek[0]].get('label', ek[0])} ↔ {g.nodes[ek[1]].get('label', ek[1])}",
                "hazard": self.graph_service.get_edge_hazard(ek[0], ek[1]),
                "route_count": count,
                "load_percent": round((count / total_rooms) * 100) if total_rooms else 0,
            }
            for ek, count in sorted(floor_edge_traffic.items(), key=lambda x: -x[1])
        ][:4]

        return {
            "selected_floor": floor,
            "selected_entrance": {
                "id": entrance_id,
                "label": entrance_meta.get("label", entrance_id),
                "floor": entrance_meta.get("floor", ""),
                "accessible": entrance_meta.get("accessible", True),
            },
            "available_floors": floors,
            "available_entrances": [
                {
                    "id": e,
                    "label": g.nodes[e].get("label", e),
                    "floor": g.nodes[e].get("floor", ""),
                    "accessible": g.nodes[e].get("accessible", True),
                }
                for e in all_exits
            ],
            "accessible_mode": accessible_only,
            "summary": {
                "total_rooms": total_rooms,
                "reachable_rooms": reachable_count,
                "unreachable_rooms": unreachable_count,
                "reachable_percent": round((reachable_count / total_rooms) * 100) if total_rooms else 0,
                "avg_rset_seconds": avg_rset,
                "avg_rset_formatted": self.pathfinding_service.format_duration(avg_rset),
                "shortest_room": shortest_room,
                "longest_room": longest_room,
                "active_hazards_on_floor": floor_hazard_count,
            },
            "rooms": room_results,
            "bottlenecks": {
                "hubs": bottleneck_hubs,
                "corridors": bottleneck_corridors,
            },
            "nodes": nodes_list,
            "edges": edges_list,
        }
