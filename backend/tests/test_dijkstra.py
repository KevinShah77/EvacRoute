"""Unit tests for Dijkstra shortest path algorithm."""

import pytest
from algorithms.dijkstra import calculate_shortest_path, calculate_shortest_paths_to_targets


@pytest.fixture
def sample_graph():
    """Simple weighted undirected graph:
    A --(2)-- B --(3)-- C
    |         |
   (1)       (4)
    |         |
    D --(1)-- E
    """
    return {
        "A": {"B": 2.0, "D": 1.0},
        "B": {"A": 2.0, "C": 3.0, "E": 4.0},
        "C": {"B": 3.0},
        "D": {"A": 1.0, "E": 1.0},
        "E": {"B": 4.0, "D": 1.0},
    }


def test_shortest_path_direct(sample_graph):
    res = calculate_shortest_path(sample_graph, "A", "C")
    assert res["distance"] == 5.0
    assert res["path"] == ["A", "B", "C"]
    assert res["edges"] == [("A", "B"), ("B", "C")]


def test_shortest_path_via_detour(sample_graph):
    # A to E: direct path A->B->E is 2+4=6; A->D->E is 1+1=2
    res = calculate_shortest_path(sample_graph, "A", "E")
    assert res["distance"] == 2.0
    assert res["path"] == ["A", "D", "E"]


def test_shortest_path_same_node(sample_graph):
    res = calculate_shortest_path(sample_graph, "A", "A")
    assert res["distance"] == 0.0
    assert res["path"] == ["A"]
    assert res["edges"] == []


def test_unreachable_node():
    disconnected_graph = {
        "A": {"B": 1.0},
        "B": {"A": 1.0},
        "C": {},
    }
    res = calculate_shortest_path(disconnected_graph, "A", "C")
    assert res["distance"] == -1
    assert res["path"] == []
    assert res["edges"] == []


def test_missing_start_or_target(sample_graph):
    res = calculate_shortest_path(sample_graph, "Z", "A")
    assert res["distance"] == -1
    res2 = calculate_shortest_path(sample_graph, "A", "Z")
    assert res2["distance"] == -1


def test_calculate_shortest_paths_to_targets(sample_graph):
    targets = ["C", "E", "NON_EXISTENT"]
    res = calculate_shortest_paths_to_targets(sample_graph, "A", targets)
    assert res["C"]["distance"] == 5.0
    assert res["E"]["distance"] == 2.0
    assert res["NON_EXISTENT"]["distance"] == -1
