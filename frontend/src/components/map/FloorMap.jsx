import React from 'react';
import { FLOOR_MAP_IMAGES, FLOOR_ORDER } from '../../constants/floorConfig';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import MapEdge from './MapEdge';
import MapNode from './MapNode';
import SimAvatar from './SimAvatar';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

export default function FloorMap() {
  const {
    graph,
    activeFloor,
    setActiveFloor,
    blueprintOpacity,
    route,
    routeView,
    displayedRoute,
    startNode,
    applyCorridorHazard,
    setStartLocation,
  } = useEvacuation();

  const { avatar } = useSimulation();

  const activeNodes = graph.nodes.filter((n) => n.floor === activeFloor);
  const activeEdges = graph.edges.filter(
    (e) =>
      activeNodes.find((n) => n.id === e.source) &&
      activeNodes.find((n) => n.id === e.target)
  );

  const getOrderedFloorSteps = (routeObj) => {
    if (!routeObj?.steps) return [];
    return routeObj.steps
      .filter((s) => s.floor === activeFloor && s.to_floor === activeFloor && s.from !== s.to)
      .map((s) => {
        const src = activeNodes.find((n) => n.id === s.from);
        const tgt = activeNodes.find((n) => n.id === s.to);
        return src && tgt ? { ...s, src, tgt } : null;
      })
      .filter(Boolean);
  };

  const primaryFloorSteps = getOrderedFloorSteps(route);
  const backupFloorSteps = getOrderedFloorSteps(route?.backup_route);

  const getFloorTransitionInfo = (nodeId) => {
    const steps = displayedRoute?.steps || [];
    const outgoing = steps.find((s) => s.from === nodeId && s.floor !== s.to_floor);
    const incoming = steps.find((s) => s.to === nodeId && s.floor !== s.to_floor);
    if (!outgoing && !incoming) return null;

    if (outgoing) {
      const goingUp = (FLOOR_ORDER[outgoing.to_floor] ?? 0) > (FLOOR_ORDER[outgoing.floor] ?? 0);
      const arrow = goingUp ? '↑' : '↓';
      const action =
        outgoing.type === 'elevator'
          ? `Lift to ${outgoing.to_floor}`
          : goingUp
          ? `Ascend to ${outgoing.to_floor}`
          : `Descend to ${outgoing.to_floor}`;
      return {
        label: `${arrow} ${action}`,
        targetFloor: outgoing.to_floor,
        kind: 'outgoing',
      };
    }

    return {
      label: `← From ${incoming.floor}`,
      targetFloor: incoming.floor,
      kind: 'incoming',
    };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 lg:p-6 mb-5">
      <MapControls />

      <div className="relative aspect-square max-h-[640px] w-full flex justify-center items-center overflow-hidden bg-slate-900/5 rounded-xl border border-slate-200 shadow-inner">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Architectural Floor Blueprint Image Backdrop */}
          {blueprintOpacity > 0 && (
            <image
              href={FLOOR_MAP_IMAGES[activeFloor] || '/maps/Floor-0.png'}
              x="0"
              y="0"
              width="100"
              height="100"
              preserveAspectRatio="none"
              opacity={blueprintOpacity}
              className="pointer-events-none transition-opacity duration-300"
            />
          )}

          {/* Base Interactive Edges */}
          {activeEdges.map((edge, idx) => {
            const src = activeNodes.find((n) => n.id === edge.source);
            const tgt = activeNodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            return (
              <MapEdge
                key={`${edge.source}-${edge.target}-${idx}`}
                edge={edge}
                src={src}
                tgt={tgt}
                route={route}
                routeView={routeView}
                onEdgeClick={applyCorridorHazard}
              />
            );
          })}

          {/* Animated Directional Flow Overlay */}
          {(routeView === 'backup' && route?.backup_route
            ? backupFloorSteps
            : primaryFloorSteps
          ).map((s) => (
            <line
              key={`flow-${s.step}`}
              x1={s.src.x}
              y1={s.src.y}
              x2={s.tgt.x}
              y2={s.tgt.y}
              stroke={
                s.hazard
                  ? '#ea580c'
                  : routeView === 'backup'
                  ? '#d97706'
                  : '#2563eb'
              }
              strokeWidth={1.35}
              strokeLinecap="round"
              className={`pointer-events-none ${
                routeView === 'backup' ? 'evac-flow-backup' : 'evac-flow-primary'
              }`}
            />
          ))}

          {/* Floor Nodes */}
          {activeNodes.map((node) => {
            const isStart = node.id === startNode;
            const onDisplayedPath = displayedRoute?.path?.includes(node.id);
            const transitionInfo = getFloorTransitionInfo(node.id);

            return (
              <MapNode
                key={node.id}
                node={node}
                isStart={isStart}
                onDisplayedPath={onDisplayedPath}
                routeView={routeView}
                transitionInfo={transitionInfo}
                onNodeClick={setStartLocation}
                onTransitionClick={setActiveFloor}
              />
            );
          })}

          {/* Animated Evacuee Avatar */}
          <SimAvatar avatar={avatar} activeFloor={activeFloor} />
        </svg>
      </div>

      <MapLegend />
    </div>
  );
}
