import React from 'react';
import { edgeMatchesList } from '../../utils/geometry';

export default function MapEdge({
  edge,
  src,
  tgt,
  route,
  routeView,
  activeSelection,
  onEdgeClick,
}) {
  const hazard = edge.hazard;
  const isRouteMode = activeSelection?.type === 'route';
  const isHazardMode = activeSelection?.type === 'hazard';

  const isPrimary = edgeMatchesList(route?.edges, edge.source, edge.target);
  const isBackup = edgeMatchesList(route?.backup_route?.edges, edge.source, edge.target);

  // When a route is selected, ONLY highlight the currently active route's edges
  const isHighlighted =
    isRouteMode &&
    (activeSelection?.id === 'backup' ? isBackup : isPrimary);

  // Distinguish the selected hazard brush
  const isSelectedHazardBrush =
    isHazardMode && hazard && activeSelection?.id === hazard;

  let stroke = '#cbd5e1';
  let strokeWidth = 0.65;
  let dashArray = 'none';

  if (hazard === 'fire') {
    stroke = isSelectedHazardBrush ? '#b91c1c' : '#ef4444';
    strokeWidth = isSelectedHazardBrush ? 2.6 : 1.35;
    dashArray = isSelectedHazardBrush ? '3,1' : '2,1.5';
  } else if (hazard === 'smoke') {
    stroke = isSelectedHazardBrush ? '#334155' : '#64748b';
    strokeWidth = isSelectedHazardBrush ? 3.4 : 2.4;
    dashArray = isSelectedHazardBrush ? '2,1' : '1.2,1.2';
  } else if (hazard === 'debris') {
    stroke = isSelectedHazardBrush ? '#c2410c' : '#ea580c';
    strokeWidth = isSelectedHazardBrush ? 2.8 : 1.6;
    dashArray = isSelectedHazardBrush ? '1.5,1' : '0.8,1.3';
  } else if (isHighlighted) {
    stroke = activeSelection?.id === 'backup' ? '#fde68a' : '#bfdbfe';
    strokeWidth = 2.0;
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
  } else if (isHighlighted) {
    edgeLabelClass = 'fill-slate-800 font-bold';
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
          !hazard && !isHighlighted
            ? 'group-hover:stroke-slate-400 transition-all'
            : ''
        }
      />
      <text
        x={midX}
        y={midY - 1.3}
        fontSize="2.1"
        textAnchor="middle"
        className={`pointer-events-none select-none font-mono ${edgeLabelClass}`}
      >
        {edgeLabel}
      </text>
    </g>
  );
}
