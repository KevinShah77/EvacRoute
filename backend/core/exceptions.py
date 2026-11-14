"""Domain-specific exceptions for EvacRoute."""


class EvacRouteException(Exception):
    """Base exception for EvacRoute domain errors."""

    def __init__(self, message: str, status_code: int = 400, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NodeNotFoundError(EvacRouteException):
    """Raised when a requested node is not present in the building graph."""

    def __init__(self, node_id: str):
        super().__init__(
            message=f"Node '{node_id}' does not exist in the building graph.",
            status_code=404,
            details={"node_id": node_id},
        )


class EdgeNotFoundError(EvacRouteException):
    """Raised when an edge between two nodes is not present."""

    def __init__(self, u: str, v: str):
        super().__init__(
            message=f"No corridor connects node '{u}' and node '{v}'.",
            status_code=404,
            details={"u": u, "v": v},
        )


class InvalidHazardError(EvacRouteException):
    """Raised when an unrecognized hazard type is provided."""

    def __init__(self, hazard_type: str, allowed: list):
        super().__init__(
            message=f"Invalid hazard type '{hazard_type}'. Allowed types: {', '.join(allowed)}.",
            status_code=400,
            details={"hazard_type": hazard_type, "allowed": allowed},
        )


class InaccessibleNodeError(EvacRouteException):
    """Raised when a start node is inaccessible under ADA mode."""

    def __init__(self, node_id: str, reason: str = "Selected starting point cannot be accessed in Wheelchair / ADA mode."):
        super().__init__(
            message=reason,
            status_code=400,
            details={"node_id": node_id},
        )
