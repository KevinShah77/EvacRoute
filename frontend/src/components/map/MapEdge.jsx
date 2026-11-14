import React from 'react';
import { edgeMatchesList } from '../../utils/geometry';

export default function MapEdge({
  edge,
  src,
  tgt,
  route,
  routeView,
  onEdgeClick,
}) {
  const hazard = edge.hazard;
  const isPrimary = edgeMatchesList(route?.edges, edge.source, edge.target);
  const isBackup = edgeMatchesList(route?.backup_route?.edges, edge.source, edge.target);

  const isHighlighted = routeView === 'backup' && route?.backup_route ? isBackup : isPrimary;
  const isSecondaryOverlay =
    routeView === 'backup' ? isPrimary && !isBackup : isBackup && !isPrimary;

  let stroke = '#cbd5e1';
  let strokeWidth = 0.65;
  let dashArray = 'none';

  if (hazard === 'fire') {
    stroke = '#ef4444';
    strokeWidth = 1.35;
    dashArray = '2,1.5';
  } else if (hazard === 'smoke') {
    stroke = '#64748b';
    strokeWidth = 2.4;
    dashArray = '1.2,1.2';
  } else if (hazard === 'debris') {
    stroke = '#ea580c';
    strokeWidth = 1.6;
    dashArray = '0.8,1.3';
  } else if (isHighlighted) {
    stroke = routeView === 'backup' ? '#fde68a' : '#bfdbfe';
    strokeWidth = 2.0;
  } else if (isSecondaryOverlay) {
    stroke = routeView === 'backup' ? '#93c5fd' : '#fbbf24';
    strokeWidth = 1.05;
    dashArray = '1.8,1.2';
  }

  const midX = (src.x + tgt.x) / 2;
  const midY = (src.y + tgt.y) / 2;

  let edgeLabel = `${edge.weight}m`;
  let edgeLabelClass = 'fill-slate-400 opacity-0 group-hover:opacity-100';
  if (hazard === 'fire') {
    edgeLabel = 'FIRE';
    edgeLabelClass = 'fill-red-600 font-bold';
  } else if (hazard === 'smoke') {
    edgeLabel = 'SMOKE';
    edgeLabelClass = 'fill-slate-700 font-bold';
  } else if (hazard === 'debris') {
    edgeLabel = 'DEBRIS';
    edgeLabelClass = 'fill-orange-700 font-bold';
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
