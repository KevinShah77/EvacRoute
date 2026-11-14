import React from 'react';
import { edgeMatchesList } from '../../utils/geometry';

export default function MapEdge({
  edge,
  src,
  tgt,
  route,
  routeView,
  activeSelection,
  isRouteActive,
  onEdgeClick,
}) {
  const hazard = edge.hazard;
  const isRouteMode = activeSelection?.type === 'route';
  const isHazardMode = activeSelection?.type === 'hazard';

  const routeActive =
    isRouteActive ??
    Boolean(isRouteMode && route && route.distance !== -1);

  const isPrimary = edgeMatchesList(route?.edges, edge.source, edge.target);
  const isBackup = edgeMatchesList(route?.backup_route?.edges, edge.source, edge.target);

  // When an evacuation route is active:
  // Hide all unselected lines (corridors).
  // Exception: keep primary route, backup route, and active hazard corridors.
  if (routeActive && !isPrimary && !isBackup && !hazard) {
    return null;
  }

  // Distinguish the selected hazard brush
  const isSelectedHazardBrush =
    isHazardMode && hazard && activeSelection?.id === hazard;

  let stroke = '#cbd5e1';
  let strokeWidth = 0.65;
  let dashArray = 'none';

  if (hazard === 'fire') {
    stroke = isSelectedHazardBrush ? '#b91c1c' : '#ef4444';
    strokeWidth = isSelectedHazardBrush ? 2.6 : 1.5;
    dashArray = isSelectedHazardBrush ? '3,1' : '2,1.5';
  } else if (hazard === 'smoke') {
    stroke = isSelectedHazardBrush ? '#334155' : '#64748b';
    strokeWidth = isSelectedHazardBrush ? 3.4 : 2.4;
    dashArray = isSelectedHazardBrush ? '2,1' : '1.2,1.2';
  } else if (hazard === 'debris') {
    stroke = isSelectedHazardBrush ? '#c2410c' : '#ea580c';
    strokeWidth = isSelectedHazardBrush ? 2.8 : 1.6;
    dashArray = isSelectedHazardBrush ? '1.5,1' : '0.8,1.3';
  } else if (routeActive) {
    if (isPrimary && isBackup) {
      if (activeSelection?.id === 'backup') {
        stroke = '#d97706'; // Amber focused
        strokeWidth = 2.8;
        dashArray = 'none';
      } else {
        stroke = '#059669'; // Emerald green focused
        strokeWidth = 2.8;
        dashArray = 'none';
      }
    } else if (isPrimary) {
      // Primary Route: clear emerald green
      stroke = '#059669';
      strokeWidth = activeSelection?.id === 'primary' ? 2.8 : 2.0;
      dashArray = 'none';
    } else if (isBackup) {
      // Secondary / Backup Route: distinct amber
      stroke = '#d97706';
      strokeWidth = activeSelection?.id === 'backup' ? 2.8 : 2.2;
      dashArray = activeSelection?.id === 'backup' ? 'none' : '3,1.5';
    }
  }

  const midX = (src.x + tgt.x) / 2;
  const midY = (src.y + tgt.y) / 2;

  let edgeLabel = `${edge.weight}m`;
  let edgeLabelClass = 'fill-slate-400 opacity-0 group-hover:opacity-100';
  if (hazard === 'fire') {
    edgeLabel = isSelectedHazardBrush ? '🔥 FIRE' : 'FIRE';
    edgeLabelClass = isSelectedHazardBrush ? 'fill-red-700 font-extrabold' : 'fill-red-600 font-bold';
  } else if (hazard === 'smoke') {
    edgeLabel = isSelectedHazardBrush ? '💨 SMOKE' : 'SMOKE';
    edgeLabelClass = isSelectedHazardBrush ? 'fill-slate-900 font-extrabold' : 'fill-slate-700 font-bold';
  } else if (hazard === 'debris') {
    edgeLabel = isSelectedHazardBrush ? '⚠ DEBRIS' : 'DEBRIS';
    edgeLabelClass = isSelectedHazardBrush ? 'fill-orange-800 font-extrabold' : 'fill-orange-700 font-bold';
  } else if (routeActive) {
    if (isPrimary) {
      edgeLabelClass = 'fill-emerald-800 font-bold';
    } else if (isBackup) {
      edgeLabelClass = 'fill-amber-800 font-bold';
    }
  }

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onEdgeClick(edge)}
    >
      {/* Invisible wider hit area for easy mouse interaction */}
      <line
        x1={src.x}
        y1={src.y}
        x2={tgt.x}
        y2={tgt.y}
        stroke="transparent"
        strokeWidth={4}
      />
      <line
        x1={src.x}
        y1={src.y}
        x2={tgt.x}
        y2={tgt.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        opacity={hazard === 'smoke' ? 0.65 : 1}
        className={
          !hazard && !routeActive
            ? 'group-hover:stroke-slate-400 transition-all'
            : ''
        }
      />
      <text
        x={midX}
        y={midY - 1.3}
        fontSize="2.1"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.5"
        className={`pointer-events-none select-none font-mono ${edgeLabelClass}`}
      >
        {edgeLabel}
      </text>
    </g>
  );
}
