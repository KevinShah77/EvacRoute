"""Central emergency orchestration service for EvacRoute 2.0."""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid

from core.constants import EMERGENCY_STATUSES, EMERGENCY_TYPES, EMERGENCY_SEVERITIES
from models.emergency import (
    EmergencyEvent,
    EmergencyStatus,
    EmergencyType,
    EmergencySeverity,
)
from services.graph_service import GraphService
from services.pathfinding_service import PathfindingService
from services.notification_service import NotificationService
from services.realtime_service import RealTimeService

logger = logging.getLogger(__name__)


class EmergencyService:
    """Orchestrates detection, state transitions, hazard application, notifications, and real-time alerts."""

    def __init__(
        self,
        graph_service: GraphService,
        pathfinding_service: PathfindingService,
        notification_service: NotificationService,
        realtime_service: RealTimeService,
    ):
        self.graph_service = graph_service
        self.pathfinding_service = pathfinding_service
        self.notification_service = notification_service
        self.realtime_service = realtime_service

        self.active_emergency: Optional[EmergencyEvent] = None
        self.emergency_history: List[Dict[str, Any]] = []
        self._active_guided_sessions: int = 0

    @property
    def current_status(self) -> str:
        """Returns current building emergency status string."""
        if self.active_emergency:
            return self.active_emergency.status
        return EmergencyStatus.NORMAL

    def register_guided_user(self) -> int:
        """Increments count of active users following evacuation navigation."""
        self._active_guided_sessions += 1
        return self._active_guided_sessions

    def unregister_guided_user(self) -> int:
        """Decrements count of active users following evacuation navigation."""
        self._active_guided_sessions = max(0, self._active_guided_sessions - 1)
        return self._active_guided_sessions

    def _apply_hazards_for_location(
        self, location_query: str, hazard_type: str, floor: Optional[str] = None
    ) -> List[List[str]]:
        """Maps an emergency location to adjacent graph edges and applies hazards."""
        applied_edges = []
        g = self.graph_service.graph

        # 1. Resolve room or node if possible
        matched_node = None
        if location_query in g:
            matched_node = location_query
        else:
            resolved = self.graph_service.find_room_by_number(location_query)
            if resolved:
                matched_node = resolved.get("id")
            else:
                q_clean = (location_query or "").strip().lower()
                for nid, data in g.nodes(data=True):
                    label = (data.get("label") or "").lower()
                    if q_clean and (q_clean == label or q_clean in label):
                        matched_node = nid
                        break

        # Fallback to corridor on specified floor if no node matched
        if not matched_node and floor:
            floor_corridors = [
                nid for nid, data in g.nodes(data=True)
                if data.get("floor") == floor and data.get("type") == "corridor"
            ]
            if floor_corridors:
                matched_node = floor_corridors[0]

        if matched_node and matched_node in g:
            # Apply hazard to all adjacent corridors of this node
            for neighbor in list(g.neighbors(matched_node)):
                try:
                    self.graph_service.set_edge_hazard(matched_node, neighbor, hazard_type)
                    applied_edges.append([matched_node, neighbor])
                except Exception as e:
                    logger.warning("Could not set hazard on edge (%s, %s): %s", matched_node, neighbor, e)

        return applied_edges

    def activate_emergency(
        self,
        emergency_type: str = EmergencyType.FIRE,
        building: str = "Main Academic Block",
        floor: str = "Floor 2",
        location: str = "F2-201",
        severity: str = EmergencySeverity.HIGH,
        description: str = "",
        source: str = "admin",
        is_simulation: bool = False,
        sensor_metadata: Optional[Dict[str, Any]] = None,
        custom_edges: Optional[List[List[str]]] = None,
    ) -> Dict[str, Any]:
        """Activates an emergency state, applies hazards, and broadcasts notifications."""
        # Map hazard type to graph hazard
        h_type = emergency_type if emergency_type in ["fire", "smoke", "gas_leakage", "structural_damage", "blocked_route"] else "fire"

        applied_edges = []
        if custom_edges:
            for edge in custom_edges:
                if len(edge) >= 2:
                    try:
                        self.graph_service.set_edge_hazard(edge[0], edge[1], h_type)
                        applied_edges.append([edge[0], edge[1]])
                    except Exception as e:
                        logger.warning("Could not set hazard on edge %s: %s", edge, e)
        else:
            applied_edges = self._apply_hazards_for_location(location, h_type, floor=floor)

        affected_nodes = [location] if location else []
        for e in applied_edges:
            if e[0] not in affected_nodes:
                affected_nodes.append(e[0])
            if e[1] not in affected_nodes:
                affected_nodes.append(e[1])

        event = EmergencyEvent(
            emergency_type=emergency_type,
            status=EmergencyStatus.ACTIVE,
            severity=severity,
            building=building,
            floor=floor,
            location=location,
            description=description,
            source=source,
            is_simulation=is_simulation,
            affected_nodes=affected_nodes,
            affected_edges=applied_edges,
            sensor_metadata=sensor_metadata,
        )

        event.log_action("EMERGENCY_ACTIVATED", actor=source, details=f"Active emergency started at {location}")
        self.active_emergency = event

        # Format push notification message
        mode_prefix = "[SIMULATION] " if is_simulation else ""
        notif_title = f"{mode_prefix}EVACROUTE – EMERGENCY ALERT"
        type_display = emergency_type.replace("_", " ").upper()
        notif_message = (
            f"{type_display} DETECTED on {floor}, {location}. "
            f"Avoid affected area immediately. Follow EvacRoute for safest route."
        )

        # Dispatch push notification
        notif_result = self.notification_service.send_broadcast(
            title=notif_title,
            message=notif_message,
            emergency_data=event.to_dict(),
            is_simulation=is_simulation,
        )

        # Broadcast via RealTime SSE
        self.realtime_service.publish(
            "emergency_activated",
            {
                "emergency": event.to_dict(),
                "notification": notif_result,
                "hazards": self.graph_service.get_hazards_list(),
            },
        )

        return event.to_dict()

    def report_emergency(
        self,
        emergency_type: str = EmergencyType.FIRE,
        building: str = "Main Academic Block",
        floor: str = "Floor 2",
        location: str = "F2-201",
        description: str = "",
        source: str = "manual_report",
        severity: str = EmergencySeverity.HIGH,
        is_simulation: bool = False,
        sensor_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Submits an unverified emergency report requiring safety officer verification."""
        event = EmergencyEvent(
            emergency_type=emergency_type,
            status=EmergencyStatus.REPORTED,
            severity=severity,
            building=building,
            floor=floor,
            location=location,
            description=description,
            source=source,
            is_simulation=is_simulation,
            sensor_metadata=sensor_metadata,
        )
        event.log_action("EMERGENCY_REPORTED", actor=source, details=description)
        self.active_emergency = event

        self.realtime_service.publish(
            "emergency_reported",
            {
                "emergency": event.to_dict(),
            },
        )
        return event.to_dict()

    def verify_emergency(
        self,
        emergency_id: str,
        confirmed: bool,
        admin_user: str = "admin",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Confirms or dismisses a reported emergency event."""
        if not self.active_emergency or self.active_emergency.id != emergency_id:
            raise ValueError(f"No active emergency matching ID '{emergency_id}'.")

        if confirmed:
            self.active_emergency.status = EmergencyStatus.ACTIVE
            self.active_emergency.log_action(
                "VERIFIED_BY_ADMIN", actor=admin_user, details=f"Emergency confirmed: {notes}"
            )
            # Apply hazards
            h_type = self.active_emergency.type
            applied = self._apply_hazards_for_location(
                self.active_emergency.location, h_type, floor=self.active_emergency.floor
            )
            self.active_emergency.affected_edges.extend(applied)

            # Dispatch push broadcast
            mode_prefix = "[SIMULATION] " if self.active_emergency.is_simulation else ""
            notif_title = f"{mode_prefix}EVACROUTE – EMERGENCY CONFIRMED"
            notif_message = f"Evacuation activated on {self.active_emergency.floor}. Proceed to safe exits."
            notif_result = self.notification_service.send_broadcast(
                title=notif_title,
                message=notif_message,
                emergency_data=self.active_emergency.to_dict(),
                is_simulation=self.active_emergency.is_simulation,
            )

            self.realtime_service.publish(
                "emergency_activated",
                {
                    "emergency": self.active_emergency.to_dict(),
                    "notification": notif_result,
                    "hazards": self.graph_service.get_hazards_list(),
                },
            )
        else:
            # Dismissed as false alarm
            self.active_emergency.status = EmergencyStatus.RESOLVED
            self.active_emergency.log_action(
                "DISMISSED_FALSE_ALARM", actor=admin_user, details=f"Report dismissed as false alarm: {notes}"
            )
            self.emergency_history.append(self.active_emergency.to_dict())
            resolved_dict = self.active_emergency.to_dict()
            self.active_emergency = None

            self.realtime_service.publish(
                "emergency_resolved",
                {
                    "emergency": resolved_dict,
                    "reason": "dismissed_false_alarm",
                },
            )

        return self.active_emergency.to_dict() if self.active_emergency else resolved_dict

    def update_emergency(
        self,
        emergency_id: str,
        additional_hazards: Optional[List[Dict[str, str]]] = None,
        blocked_corridors: Optional[List[List[str]]] = None,
        cleared_corridors: Optional[List[List[str]]] = None,
        severity: Optional[str] = None,
        description: Optional[str] = None,
        admin_user: str = "admin",
    ) -> Dict[str, Any]:
        """Dynamically updates hazards (e.g. fire spreading, corridor blocked, corridor cleared)."""
        target_id = self.active_emergency.id if (self.active_emergency and emergency_id in ("active", "current")) else emergency_id
        if not self.active_emergency or self.active_emergency.id != target_id:
            raise ValueError(f"No active emergency matching ID '{emergency_id}'.")

        changes = []
        if severity and severity in EMERGENCY_SEVERITIES:
            self.active_emergency.severity = severity
            changes.append(f"Severity updated to {severity}")

        if description:
            self.active_emergency.description = description
            changes.append("Description updated")

        if additional_hazards:
            for item in additional_hazards:
                u, v, h_type = item.get("u"), item.get("v"), item.get("type", "fire")
                if u and v:
                    try:
                        self.graph_service.set_edge_hazard(u, v, h_type)
                        self.active_emergency.affected_edges.append([u, v])
                        changes.append(f"Hazard '{h_type}' applied between {u} and {v}")
                    except Exception as e:
                        logger.warning("Could not set hazard on edge (%s, %s): %s", u, v, e)

        if blocked_corridors:
            for edge in blocked_corridors:
                if len(edge) >= 2:
                    try:
                        self.graph_service.set_edge_hazard(edge[0], edge[1], "fire")
                        self.active_emergency.affected_edges.append([edge[0], edge[1]])
                        changes.append(f"Corridor blocked between {edge[0]} and {edge[1]}")
                    except Exception as e:
                        logger.warning("Could not block corridor edge %s: %s", edge, e)

        if cleared_corridors:
            for edge in cleared_corridors:
                if len(edge) >= 2:
                    try:
                        self.graph_service.set_edge_hazard(edge[0], edge[1], "clear")
                        self.active_emergency.affected_edges = [
                            e for e in self.active_emergency.affected_edges
                            if not ((e[0] == edge[0] and e[1] == edge[1]) or (e[0] == edge[1] and e[1] == edge[0]))
                        ]
                        changes.append(f"Corridor cleared between {edge[0]} and {edge[1]}")
                    except Exception as e:
                        logger.warning("Could not clear corridor edge %s: %s", edge, e)

        self.active_emergency.log_action(
            "EMERGENCY_UPDATED", actor=admin_user, details="; ".join(changes) or "Emergency parameters updated"
        )

        # Notify clients about hazard changes & route recalculations
        self.realtime_service.publish(
            "emergency_updated",
            {
                "emergency": self.active_emergency.to_dict(),
                "hazards": self.graph_service.get_hazards_list(),
                "changes": changes,
            },
        )
        return self.active_emergency.to_dict()

    def record_sensor_hazard(
        self,
        sensor_id: str,
        emergency_type: str,
        floor: str,
        location: str,
        reading_record: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Appends sensor hazard reading to existing active emergency instead of overwriting."""
        if not self.active_emergency:
            return {}

        h_type = emergency_type if emergency_type in ["fire", "smoke", "gas_leakage", "structural_damage", "blocked_route"] else "fire"
        applied = self._apply_hazards_for_location(location, h_type, floor=floor)
        for edge in applied:
            if edge not in self.active_emergency.affected_edges:
                self.active_emergency.affected_edges.append(edge)

        if location and location not in self.active_emergency.affected_nodes:
            self.active_emergency.affected_nodes.append(location)

        val = reading_record.get("value")
        self.active_emergency.log_action(
            "SENSOR_TELEMETRY_ALERT",
            actor=f"sensor:{sensor_id}",
            details=f"Telemetry from {sensor_id} ({emergency_type}) at {floor}, {location} registered value {val}",
        )

        self.realtime_service.publish(
            "emergency_updated",
            {
                "emergency": self.active_emergency.to_dict(),
                "hazards": self.graph_service.get_hazards_list(),
                "changes": [f"Sensor {sensor_id} reported hazard at {floor}, {location}"],
            },
        )
        return self.active_emergency.to_dict()

    def resolve_emergency(
        self,
        emergency_id: str,
        admin_user: str = "admin",
        notes: str = "Emergency resolved by safety personnel.",
    ) -> Dict[str, Any]:
        """Resolves the active emergency, resets hazards, and sends an all-clear broadcast."""
        target_id = self.active_emergency.id if (self.active_emergency and emergency_id in ("active", "current")) else emergency_id
        if not self.active_emergency or self.active_emergency.id != target_id:
            raise ValueError(f"No active emergency matching ID '{emergency_id}'.")
            raise ValueError(f"No active emergency matching ID '{emergency_id}'.")

        self.active_emergency.resolve(actor=admin_user, details=notes)
        resolved_event = self.active_emergency.to_dict()
        self.emergency_history.append(resolved_event)
        self.active_emergency = None

        # Reset all edge hazards
        self.graph_service.reset_hazards()

        # Send All Clear broadcast
        notif_title = "EVACROUTE – ALL CLEAR"
        notif_message = "The emergency has been resolved by college safety authorities. Normal activity may resume."
        self.notification_service.send_broadcast(
            title=notif_title,
            message=notif_message,
            emergency_data=resolved_event,
            is_simulation=resolved_event.get("is_simulation", False),
        )

        self.realtime_service.publish(
            "emergency_resolved",
            {
                "emergency": resolved_event,
                "hazards": [],
                "message": notif_message,
            },
        )
        return resolved_event

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive real-time status of building emergency system."""
        hazards = self.graph_service.get_hazards_list()
        entrances = self.graph_service.get_entrances()
        assembly_points = self.graph_service.get_assembly_points()
        notif_stats = self.notification_service.get_stats()

        # Check exit availability
        available_exits = []
        blocked_exits = []
        for e in entrances:
            eid = e["id"]
            # Check if incident edges are blocked
            edges = list(self.graph_service.graph.neighbors(eid))
            is_blocked = all(
                self.graph_service.get_edge_hazard(eid, n) in ["fire", "structural_damage", "blocked_route", "gas_leakage"]
                for n in edges
            ) if edges else False

            exit_summary = {
                "id": eid,
                "label": e.get("label", eid),
                "floor": e.get("floor", "Ground"),
                "is_safe": not is_blocked,
            }
            if is_blocked:
                blocked_exits.append(exit_summary)
            else:
                available_exits.append(exit_summary)

        return {
            "status": self.current_status,
            "has_active_emergency": self.active_emergency is not None and self.active_emergency.status == EmergencyStatus.ACTIVE,
            "emergency": self.active_emergency.to_dict() if self.active_emergency else None,
            "active_hazards": hazards,
            "available_exits": available_exits,
            "blocked_exits": blocked_exits,
            "assembly_points": assembly_points,
            "active_guided_users": self._active_guided_sessions,
            "notifications": notif_stats,
        }

    def get_history(self) -> List[Dict[str, Any]]:
        """Returns all past emergency events and audit logs."""
        return list(reversed(self.emergency_history))
