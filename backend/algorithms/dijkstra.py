"""Dijkstra's shortest path algorithm implementation.

Provides single-target and multi-target shortest path calculations on weighted graphs
represented as adjacency dictionaries: {node: {neighbor: weight, ...}, ...}.
"""

from typing import Any, Dict, List, Optional, Tuple
import heapq


def _run_dijkstra(
    graph: Dict[Any, Dict[Any, float]],
    start: Any,
    target: Optional[Any] = None,
) -> Tuple[Dict[Any, float], Dict[Any, Optional[Any]]]:
    """Runs Dijkstra's algorithm from `start` on the adjacency dict.

    Args:
        graph: Adjacency dictionary mapping node -> {neighbor: weight}.
        start: Starting node ID.
        target: Optional target node ID. If provided, search terminates early upon reaching target.

    Returns:
        A tuple of (distances, predecessors) where:
            - distances is a mapping from node to minimum distance from start.
            - predecessors is a mapping from node to predecessor node along shortest path.
    """
    distances: Dict[Any, float] = {vertex: float("infinity") for vertex in graph}
    distances[start] = 0.0
    predecessors: Dict[Any, Optional[Any]] = {vertex: None for vertex in graph}

    # Priority queue stores tuples of (tentative_distance, vertex)
    pq: List[Tuple[float, Any]] = [(0.0, start)]

    while pq:
        current_distance, current_vertex = heapq.heappop(pq)

        if current_distance > distances[current_vertex]:
            continue

        if target is not None and current_vertex == target:
            break

        for neighbor, weight in graph.get(current_vertex, {}).items():
            if neighbor not in distances:
                continue

            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                predecessors[neighbor] = current_vertex
                heapq.heappush(pq, (distance, neighbor))

    return distances, predecessors


def _reconstruct_path(
    start: Any,
    target: Any,
    distances: Dict[Any, float],
    predecessors: Dict[Any, Optional[Any]],
) -> Dict[str, Any]:
    """Reconstructs the node and edge sequence from start to target.

    Returns:
        Dictionary with keys:
            - distance: float total weight (-1 if unreachable)
            - path: list of nodes along path
            - edges: list of (u, v) tuples
            - nodes_visited: count of nodes in path or search space
    """
    if target not in distances or distances[target] == float("infinity"):
        return {
            "distance": -1,
            "path": [],
            "edges": [],
            "nodes_visited": len(distances),
        }

    path: List[Any] = []
    current: Optional[Any] = target
    while current is not None:
        path.insert(0, current)
        current = predecessors.get(current)

    if not path or path[0] != start:
        return {
            "distance": -1,
            "path": [],
            "edges": [],
            "nodes_visited": len(distances),
        }

    edges = [(path[i], path[i + 1]) for i in range(len(path) - 1)]

    return {
        "distance": distances[target],
        "path": path,
        "edges": edges,
        "nodes_visited": len(path),
    }


def calculate_shortest_path(
    graph: Dict[Any, Dict[Any, float]],
    start: Any,
    target: Any,
) -> Dict[str, Any]:
    """Calculates the shortest path between start and target in graph.

    Args:
        graph: Graph adjacency dict {u: {v: weight}}.
        start: Source node identifier.
        target: Destination node identifier.

    Returns:
        Path dict containing distance, path, edges, and nodes_visited.
    """
    if start not in graph or target not in graph:
        return {"distance": -1, "path": [], "edges": [], "nodes_visited": 0}

    distances, predecessors = _run_dijkstra(graph, start, target=target)
    return _reconstruct_path(start, target, distances, predecessors)


def calculate_shortest_paths_to_targets(
    graph: Dict[Any, Dict[Any, float]],
    start: Any,
    targets: List[Any],
) -> Dict[Any, Dict[str, Any]]:
    """Calculates shortest paths from start to multiple targets in a single traversal.

    Args:
        graph: Graph adjacency dict {u: {v: weight}}.
        start: Source node identifier.
        targets: Collection of target node identifiers.

    Returns:
        Mapping from target ID to its shortest path result dict.
    """
    if start not in graph:
        return {
            t: {"distance": -1, "path": [], "edges": [], "nodes_visited": 0}
            for t in targets
        }

    distances, predecessors = _run_dijkstra(graph, start, target=None)
    return {
        t: _reconstruct_path(start, t, distances, predecessors)
        for t in targets
    }
