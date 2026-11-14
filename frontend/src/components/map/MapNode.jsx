import React from 'react';

export default function MapNode({
  node,
  isStart,
  onDisplayedPath,
  onPrimaryPath,
  onBackupPath,
  isHazardNode,
  isRouteActive,
  routeView,
  activeSelection,
  transitionInfo,
  onNodeClick,
  onTransitionClick,
}) {
  const isRouteSelected = activeSelection?.type === 'route';

  const routeActive =
    isRouteActive ??
    Boolean(isRouteSelected);

  const isCorridor = node.type === 'corridor';

  // When an evacuation route is active:
  // Hide all unselected dots (room/corridor nodes).
  // Plain corridor waypoints are hidden so the clean route polyline bends naturally without obscuring dots.
  // Exception: keep start location, primary/backup endpoints (rooms/exits/stairs), and hazard nodes.
  if (routeActive && !isStart && !isHazardNode && isCorridor) {
    return null;
  }

  if (routeActive && !isStart && !onPrimaryPath && !onBackupPath && !isHazardNode) {
    return null;
  }

  let fill = '#334155';
  if (node.type === 'exit') fill = '#16a34a';
  else if (node.type === 'staircase') fill = '#f59e0b';
  else if (node.type === 'elevator') fill = '#9333ea';
  else if (node.type === 'ramp') fill = '#0d9488';
  else if (isHazardNode) fill = '#ef4444';
  else if (routeActive) {
    if (onPrimaryPath) fill = '#059669';
    else if (onBackupPath) fill = '#d97706';
  }

  const showLabel =
    isStart ||
    isHazardNode ||
    node.type === 'exit' ||
    node.type === 'staircase' ||
    node.type === 'elevator' ||
    node.type === 'classroom' ||
    (!isCorridor && (onDisplayedPath || onPrimaryPath || onBackupPath));

  let nodeStroke = '#ffffff';
  let nodeStrokeWidth = '0.35';

  if (isStart) {
    nodeStroke = '#1d4ed8';
    nodeStrokeWidth = '0.7';
  } else if (isHazardNode) {
    nodeStroke = '#ef4444';
    nodeStrokeWidth = '0.7';
  } else if (routeActive) {
    if (onPrimaryPath) {
      nodeStroke = activeSelection?.id === 'backup' ? '#059669' : '#10b981';
      nodeStrokeWidth = '0.7';
    } else if (onBackupPath) {
      nodeStroke = '#d97706';
      nodeStrokeWidth = '0.7';
    }
  }

  const radius =
    node.type === 'exit' || isStart
      ? 1.8
      : node.type === 'staircase' || node.type === 'elevator' || node.type === 'ramp'
      ? 1.4
      : isCorridor
      ? 0.7
      : 1.3;

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onNodeClick(node)}
    >
      <title>{`Click to set "${node.label}" as starting location`}</title>

      <circle
        cx={node.x}
        cy={node.y}
        r="2.6"
        fill="transparent"
        stroke="#94a3b8"
        strokeWidth="0.3"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {isStart && (
        <circle
          cx={node.x}
          cy={node.y}
          r="2.7"
          fill="none"
          stroke="#2563eb"
          strokeWidth="0.5"
          strokeDasharray="1,0.8"
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={fill}
        stroke={nodeStroke}
        strokeWidth={nodeStrokeWidth}
      />

      {showLabel && (
        <text
          x={node.x}
          y={node.y - (radius + 0.9)}
          fontSize={isStart || node.type === 'exit' ? '1.9' : '1.7'}
          textAnchor="middle"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.5"
          className={`pointer-events-none select-none font-semibold ${
            isStart
              ? 'fill-blue-700 font-bold'
              : node.type === 'exit'
              ? 'fill-green-700 font-bold'
              : 'fill-slate-800'
          }`}
        >
          {isStart ? `START: ${node.label}` : node.label}
        </text>
      )}

      {transitionInfo && (
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onTransitionClick(transitionInfo.targetFloor);
          }}
        >
          <rect
            x={node.x - 7.5}
            y={node.y + 1.8}
            width="15"
            height="3.0"
            rx="0.8"
            fill={transitionInfo.kind === 'outgoing' ? '#1d4ed8' : '#e2e8f0'}
            stroke={transitionInfo.kind === 'outgoing' ? '#1e40af' : '#94a3b8'}
            strokeWidth="0.25"
          />
          <text
            x={node.x}
            y={node.y + 3.8}
            fontSize="1.4"
            textAnchor="middle"
            className={`select-none font-bold ${
              transitionInfo.kind === 'outgoing' ? 'fill-white' : 'fill-slate-700'
            }`}
          >
            {transitionInfo.label}
          </text>
        </g>
      )}
    </g>
  );
}
