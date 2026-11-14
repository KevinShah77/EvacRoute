import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  DoorOpen,
  AlertTriangle,
  Clock,
  Navigation,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  Map,
} from 'lucide-react';
import { FLOOR_MAP_IMAGES } from '../../constants/floorConfig';
import * as api from '../../services/api';

const NODE_COLORS = {
  classroom: '#0284c7', // Sky blue for reachable rooms
  unreachable_room: '#ef4444', // Red for blocked/unreachable rooms
  corridor: '#94a3b8', // Subtle slate for corridor waypoints
  staircase: '#f59e0b', // Amber for staircases
  elevator: '#9333ea', // Purple for elevators
  ramp: '#0d9488', // Teal for ramps
  exit: '#16a34a', // Emerald green for exits
};

export default function FloorEvacuationGraph({
  accessibleOnly = false,
  onInspectRoom,
  initialFloors = [],
  initialEntrances = [],
  initialGraphData = null,
}) {
  const [selectedFloor, setSelectedFloor] = useState(
    initialGraphData?.selected_floor || 'Ground'
  );
  const [selectedEntrance, setSelectedEntrance] = useState(
    initialGraphData?.selected_entrance?.id || 'GF-E-MAIN'
  );
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.85);
  const [graphData, setGraphData] = useState(initialGraphData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const focusedNodeId = hoveredNodeId || selectedNodeId;

  // Fetch floor-wise and entrance-wise evacuation graph from backend
  const fetchFloorGraph = useCallback(
    async (floor, entrance, ada) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getFloorEvacuationGraph(floor, entrance, ada);
        if (res?.data) {
          setGraphData(res.data);
        }
      } catch (err) {
        // Fallback: if server not running or 404 in unit tests, handle gracefully
        setError(err.message || 'Unable to load floor evacuation graph from server.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    // Re-fetch whenever floor, entrance, or ADA mode differs from current graph data
    const isCurrent =
      graphData &&
      graphData.selected_floor === selectedFloor &&
      graphData.selected_entrance?.id === selectedEntrance &&
      graphData.accessible_mode === accessibleOnly;

    if (!isCurrent) {
      fetchFloorGraph(selectedFloor, selectedEntrance, accessibleOnly);
    }
  }, [fetchFloorGraph, selectedFloor, selectedEntrance, accessibleOnly, graphData]);

  const availableFloors = useMemo(() => {
    if (graphData?.available_floors?.length) return graphData.available_floors;
    if (initialFloors.length) return initialFloors;
    return ['Ground', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'];
  }, [graphData, initialFloors]);

  const availableEntrances = useMemo(() => {
    if (graphData?.available_entrances?.length) return graphData.available_entrances;
    if (initialEntrances.length) return initialEntrances;
    return [
      { id: 'GF-E-MAIN', label: 'Main Entrance & Exit (SE)', floor: 'Ground' },
      { id: 'GF-E-WEST', label: 'West Perimeter Exit', floor: 'Ground' },
      { id: 'GF-E-NORTH', label: 'North Perimeter Exit', floor: 'Ground' },
    ];
  }, [graphData, initialEntrances]);

  // Sync default entrance or floor if needed
  useEffect(() => {
    if (availableFloors.length && !availableFloors.includes(selectedFloor)) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors, selectedFloor]);

  useEffect(() => {
    if (availableEntrances.length && !availableEntrances.find((e) => e.id === selectedEntrance)) {
      setSelectedEntrance(availableEntrances[0].id);
    }
  }, [availableEntrances, selectedEntrance]);

  const summary = graphData?.summary || {
    total_rooms: 0,
    reachable_rooms: 0,
    unreachable_rooms: 0,
    reachable_percent: 0,
    avg_rset_seconds: 0,
    avg_rset_formatted: '0 sec',
    shortest_room: null,
    longest_room: null,
    active_hazards_on_floor: 0,
  };

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];
  const rooms = useMemo(() => graphData?.rooms || [], [graphData]);

  // Identify focused room path if a node or room is selected/hovered
  const focusedRoom = useMemo(() => {
    if (!focusedNodeId) return null;
    return rooms.find((r) => r.id === focusedNodeId) || null;
  }, [focusedNodeId, rooms]);

  const focusedPathNodes = useMemo(() => {
    if (!focusedRoom?.path) return new Set();
    return new Set(focusedRoom.path);
  }, [focusedRoom]);

  const focusedPathEdges = useMemo(() => {
    if (!focusedRoom?.path || focusedRoom.path.length < 2) return new Set();
    const set = new Set();
    for (let i = 0; i < focusedRoom.path.length - 1; i++) {
      const u = focusedRoom.path[i];
      const v = focusedRoom.path[i + 1];
      set.add(`${u}--${v}`);
      set.add(`${v}--${u}`);
    }
    return set;
  }, [focusedRoom]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 shadow-sm space-y-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={22} />
            <h3 className="text-xl font-bold text-slate-800">
              Floor-Wise & Entrance-Wise Evacuation Graph Analysis
            </h3>
          </div>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Dynamically analyzes room reachability, corridor egress flow, and vertical multi-floor
            circulation toward the designated building entrance.
          </p>
        </div>

        {summary.unreachable_rooms > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 border border-red-300 text-xs font-bold shadow-xs">
            <AlertTriangle size={15} /> {summary.unreachable_rooms} Room(s) Unreachable!
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs">
            <CheckCircle2 size={15} /> 100% Floor Reachability
          </span>
        )}
      </div>

      {/* Selectors Bar: Floor Selector + Entrance Selector + Blueprint Opacity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
        {/* Floor Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Layers size={14} className="text-blue-600" />
            <span>Select Building Floor</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableFloors.map((floor) => {
              const isSelected = selectedFloor === floor;
              return (
                <button
                  key={floor}
                  type="button"
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {floor}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entrance Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <DoorOpen size={14} className="text-emerald-600" />
            <span>Select Target Evacuation Entrance / Exit</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableEntrances.map((ent) => {
              const isSelected = selectedEntrance === ent.id;
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => setSelectedEntrance(ent.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title={`${ent.label} (${ent.floor})`}
                >
                  <DoorOpen size={13} />
                  <span className="truncate max-w-[150px]">{ent.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Blueprint Map Opacity Control */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <Map size={14} className="text-indigo-600" />
            <span>Floor Blueprint Backdrop ({Math.round(blueprintOpacity * 100)}%)</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[0, 0.4, 0.85, 1.0].map((val) => {
              const isSelected = blueprintOpacity === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBlueprintOpacity(val)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Eye size={12} />
                  <span>{val === 0 ? 'Off' : `${Math.round(val * 100)}%`}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards for Selected Floor & Entrance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className={`p-4 rounded-xl border shadow-xs ${
            summary.unreachable_rooms > 0
              ? 'bg-red-50/70 border-red-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Egress Reachability</span>
            {summary.unreachable_rooms > 0 ? (
              <XCircle size={15} className="text-red-600" />
            ) : (
              <CheckCircle2 size={15} className="text-green-600" />
            )}
          </div>
          <div className="text-2xl font-black mt-1.5 text-slate-900">
            {summary.reachable_rooms} of {summary.total_rooms}
            <span className="text-xs font-semibold text-slate-500 ml-1.5">
              ({summary.reachable_percent}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.unreachable_rooms > 0
              ? `${summary.unreachable_rooms} room(s) cannot reach this entrance!`
              : `All rooms on ${selectedFloor} reach exit`}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Average Floor RSET</span>
            <Clock size={15} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black mt-1.5 text-blue-600">
            {summary.avg_rset_formatted}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Escape time to {graphData?.selected_entrance?.label?.split(' ')[0] || 'Exit'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Fastest Egress Path</span>
            <Navigation size={15} className="text-emerald-600" />
          </div>
          <div className="text-base font-bold mt-1.5 text-slate-900 truncate" title={summary.shortest_room?.label}>
            {summary.shortest_room ? summary.shortest_room.label : 'None'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.shortest_room
              ? `${summary.shortest_room.distance}m · ${summary.shortest_room.formatted_time}`
              : 'N/A'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Primary Egress Hub</span>
            <Activity size={15} className="text-purple-600" />
          </div>
          <div className="text-base font-bold mt-1.5 text-slate-900 truncate">
            {graphData?.bottlenecks?.hubs?.[0]
              ? graphData.bottlenecks.hubs[0].label
              : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {graphData?.bottlenecks?.hubs?.[0]
              ? `${graphData.bottlenecks.hubs[0].load_percent}% of floor evacuation routes`
              : 'Direct corridors'}
          </p>
        </div>
      </div>

      {/* Main Interactive Graph Visualization Canvas */}
      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900/5 shadow-inner">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-20 text-xs font-bold text-slate-600">
            <span className="animate-spin mr-2">⚙</span> Computing evacuation topology for {selectedFloor}...
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-600 text-xs font-bold">
            ⚠ {error}
          </div>
        )}

        <div className="aspect-[4/3] max-h-[560px] w-full flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full select-none">
            {/* Architectural Floor Blueprint Image Backdrop */}
            {blueprintOpacity > 0 && (
              <image
                href={FLOOR_MAP_IMAGES[selectedFloor] || '/maps/Floor-0.png'}
                x="0"
                y="0"
                width="100"
                height="100"
                preserveAspectRatio="none"
                opacity={blueprintOpacity}
                className="pointer-events-none transition-opacity duration-300"
              />
            )}

            {/* Subtle graph coordinate grid lines */}
            <defs>
              <pattern id="graph-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#graph-grid)" opacity={blueprintOpacity > 0 ? 0.35 : 1} />

            {/* Connections / Edges */}
            {edges.map((edge, idx) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              // Don't draw cross-floor connectors across 2D blueprints of upper floors
              if (
                edge.is_vertical_connector &&
                (srcNode.is_external || tgtNode.is_external || srcNode.floor !== tgtNode.floor)
              ) {
                return null;
              }

              const isPathEdge = edge.is_evacuation_path;
              const isFocusedEdge =
                focusedPathEdges.has(`${edge.source}--${edge.target}`) ||
                focusedPathEdges.has(`${edge.target}--${edge.source}`);

              let stroke = '#94a3b8';
              let strokeWidth = 0.45;
              let strokeDash = 'none';
              let opacity = 0.45;

              if (edge.hazard === 'fire') {
                stroke = '#ef4444';
                strokeWidth = 1.3;
                strokeDash = '2,1';
                opacity = 1;
              } else if (edge.hazard === 'smoke') {
                stroke = '#475569';
                strokeWidth = 1.6;
                strokeDash = '1.2,1';
                opacity = 0.8;
              } else if (edge.hazard === 'debris') {
                stroke = '#ea580c';
                strokeWidth = 1.3;
                strokeDash = '1,1';
                opacity = 1;
              } else if (isFocusedEdge) {
                stroke = '#2563eb';
                strokeWidth = 1.75;
                opacity = 1;
              } else if (isPathEdge) {
                stroke = '#059669';
                strokeWidth = 1.15;
                opacity = 0.9;
              } else if (edge.is_vertical_connector) {
                stroke = '#9333ea';
                strokeWidth = 0.9;
                strokeDash = '2,1.5';
                opacity = 0.7;
              }

              const midX = (srcNode.x + tgtNode.x) / 2;
              const midY = (srcNode.y + tgtNode.y) / 2;

              return (
                <g key={`edge-${edge.source}-${edge.target}-${idx}`}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={opacity}
                    className="transition-all"
                  />
                  {edge.hazard && (
                    <text
                      x={midX}
                      y={midY - 0.8}
                      fontSize="1.6"
                      textAnchor="middle"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth="0.4"
                      className="fill-red-600 font-bold font-mono"
                    >
                      {edge.hazard.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              if (node.is_external) return null;

              const isRoom = node.type === 'classroom' || node.type === 'room';
              const isCorridor = node.type === 'corridor';
              const isTargetExit = node.id === selectedEntrance;
              const isFocused = node.id === focusedNodeId || focusedPathNodes.has(node.id);

              let fillColor = NODE_COLORS[node.type] || '#475569';
              if (isRoom && !node.reachable) {
                fillColor = NODE_COLORS.unreachable_room;
              }

              const radius = isTargetExit
                ? 1.9
                : isRoom
                ? (node.reachable ? 1.2 : 1.5)
                : isCorridor
                ? 0.55
                : 1.3;

              // Don't show labels on plain corridor waypoints
              const showNodeLabel =
                !isCorridor &&
                (isRoom || isTargetExit || node.type === 'staircase' || node.type === 'elevator' || isFocused);

              // Stagger label Y to prevent overlap between close rows
              const isLowerRow = node.y > 64;
              const isElevator = node.type === 'elevator';
              const labelY = isLowerRow
                ? node.y + radius + 1.9
                : isElevator
                ? node.y + radius + 2.0
                : node.y - (radius + 0.8);

              // Stagger X anchor for closely spaced nodes in central south corridor
              let textAnchor = 'middle';
              let labelX = node.x;
              if (node.id === 'GF-008') {
                textAnchor = 'end';
                labelX = node.x - 0.8;
              } else if (node.id === 'GF-009') {
                textAnchor = 'start';
                labelX = node.x + 0.8;
              }

              const displayLabel = isTargetExit
                ? `EXIT: ${node.label.replace(/\(.*\)/, '').trim()}`
                : isRoom && !node.reachable
                ? `⚠ ${node.label}`
                : node.label;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform"
                  onClick={() => setSelectedNodeId((prev) => (prev === node.id ? null : node.id))}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  <title>{`${node.label} (${node.floor})\nType: ${node.type}\nStatus: ${node.reachable ? 'Reachable' : 'Unreachable / Blocked'}${node.distance ? `\nDistance: ${node.distance}m (${node.formatted_time})` : ''}`}</title>

                  {/* Highlight ring if focused or target exit */}
                  {(isFocused || isTargetExit || (isRoom && !node.reachable)) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 1.2}
                      fill="none"
                      stroke={isTargetExit ? '#16a34a' : isRoom && !node.reachable ? '#ef4444' : '#2563eb'}
                      strokeWidth="0.5"
                      strokeDasharray={isTargetExit ? '1.2,1' : isRoom && !node.reachable ? '1,0.8' : 'none'}
                      className={isTargetExit ? 'animate-pulse' : ''}
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth={isCorridor ? '0.2' : '0.4'}
                    opacity={isCorridor ? 0.6 : 1}
                  />

                  {/* Node Label with contrast halo */}
                  {showNodeLabel && (
                    <text
                      x={labelX}
                      y={labelY}
                      fontSize={isTargetExit ? '1.8' : isRoom && !node.reachable ? '1.7' : isRoom ? '1.6' : '1.5'}
                      textAnchor={textAnchor}
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth="0.6"
                      className={`select-none font-bold ${
                        isTargetExit
                          ? 'fill-emerald-800'
                          : isRoom && !node.reachable
                          ? 'fill-red-700'
                          : isRoom
                          ? 'fill-blue-800'
                          : 'fill-slate-700'
                      }`}
                    >
                      {displayLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Tooltip / Focused Node Detail Box */}
        {focusedRoom && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 shadow-lg max-w-sm text-xs z-10 transition-all">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-bold text-slate-900 truncate">{focusedRoom.label}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    focusedRoom.reachable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {focusedRoom.reachable ? 'Reachable' : 'Blocked'}
                </span>
                {selectedNodeId && (
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="text-slate-400 hover:text-slate-700 font-bold px-1 rounded hover:bg-slate-100"
                    title="Unpin detail card"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>
                Target: <strong>{graphData?.selected_entrance?.label}</strong>
              </div>
              <div>
                Distance:{' '}
                {focusedRoom.reachable ? (
                  <strong>
                    {focusedRoom.distance}m ({focusedRoom.formatted_time})
                  </strong>
                ) : (
                  <span className="text-red-600">No safe path found</span>
                )}
              </div>
              {focusedRoom.path?.length > 0 && (
                <div className="truncate text-slate-500 font-mono text-[10px] mt-1">
                  Path: {focusedRoom.path.join(' ➔ ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Graph Visual Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
          <span>Reachable Room</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Unreachable Room</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#16a34a]" />
          <span>Target Entrance</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span>Staircase</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#9333ea]" />
          <span>Elevator</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#0d9488]" />
          <span>Ramp</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-[#10b981]" />
          <span>Evacuation Path</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 border-t-2 border-dashed border-red-500" />
          <span>Hazard</span>
        </span>
      </div>

      {/* Room-by-Room Connectivity & Egress Path Table */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-2">
          {selectedFloor} Room Egress to {graphData?.selected_entrance?.label || selectedEntrance}
        </h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Room / Origin</th>
                <th className="py-2.5 px-3">Status to Entrance</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Estimated RSET</th>
                <th className="py-2.5 px-3">Hazards Crossed</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rooms.map((room) => {
                const isHovered = room.id === focusedNodeId;
                const isSelected = room.id === selectedNodeId;
                return (
                  <tr
                    key={room.id}
                    onClick={() => setSelectedNodeId((prev) => (prev === room.id ? null : room.id))}
                    onMouseEnter={() => setHoveredNodeId(room.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`transition-colors cursor-pointer ${
                      !room.reachable
                        ? isSelected
                          ? 'bg-red-100 text-red-950 font-bold ring-1 ring-inset ring-red-400'
                          : 'bg-red-50/70 text-red-900'
                        : isSelected
                        ? 'bg-blue-100/90 font-bold ring-1 ring-inset ring-blue-400'
                        : isHovered
                        ? 'bg-blue-50/60'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {room.label}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          room.reachable
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {room.reachable ? (
                          <>
                            <CheckCircle2 size={11} /> Reachable
                          </>
                        ) : (
                          <>
                            <XCircle size={11} /> Blocked / Trapped
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {room.reachable ? `${room.distance}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      {room.formatted_time}
                    </td>
                    <td className="py-2.5 px-3">
                      {room.hazards_crossed > 0 ? (
                        <span className="text-amber-600 font-bold">
                          ⚠ {room.hazards_crossed} hazard(s)
                        </span>
                      ) : (
                        <span className="text-green-600">Clear</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {onInspectRoom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectRoom(room);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                          title="View this room on interactive floor map"
                        >
                          <Navigation size={12} /> Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
