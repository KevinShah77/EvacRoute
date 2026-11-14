import React from 'react';

export default function MapNode({
  node,
  isStart,
  onDisplayedPath,
  routeView,
  transitionInfo,
  onNodeClick,
  onTransitionClick,
}) {
  let fill = '#334155';
  if (node.type === 'exit') fill = '#16a34a';
  else if (node.type === 'staircase') fill = '#f59e0b';
  else if (node.type === 'elevator') fill = '#9333ea';
  else if (node.type === 'ramp') fill = '#0d9488';

  const showLabel =
    isStart ||
    onDisplayedPath ||
    node.type === 'exit' ||
    node.type === 'staircase' ||
    node.type === 'elevator' ||
    node.type === 'classroom';

  return (
    <g
      className="cursor-pointer group"
      onClick={() => onNodeClick(node)}
    >
      <title>{`Click to set "${node.label}" as starting location`}</title>

      <circle
        cx={node.x}
        cy={node.y}
        r="3.8"
        fill="transparent"
        stroke="#94a3b8"
        strokeWidth="0.4"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {isStart && (
        <circle
          cx={node.x}
          cy={node.y}
          r="4.1"
          fill="none"
          stroke="#2563eb"
          strokeWidth="0.7"
          strokeDasharray="1.2,1"
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={node.type === 'exit' || isStart ? '2.5' : '2'}
        fill={fill}
        stroke={
          isStart
            ? '#1d4ed8'
            : onDisplayedPath
            ? routeView === 'backup'
              ? '#d97706'
              : '#3b82f6'
            : '#ffffff'
        }
        strokeWidth={onDisplayedPath || isStart ? '0.8' : '0.4'}
      />

      <text
        x={node.x}
        y={node.y - 3.6}
        fontSize="2.4"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.7"
        className={`pointer-events-none select-none font-semibold ${
          isStart
            ? 'fill-blue-700'
            : node.type === 'exit'
            ? 'fill-green-700'
            : showLabel
            ? 'fill-slate-800'
            : 'fill-slate-700 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isStart ? `START: ${node.label}` : node.label}
      </text>

      {transitionInfo && (
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onTransitionClick(transitionInfo.targetFloor);
          }}
        >
          <rect
            x={node.x - 11.5}
            y={node.y + 3.1}
            width="23"
            height="4.4"
            rx="1.2"
            fill={transitionInfo.kind === 'outgoing' ? '#1d4ed8' : '#e2e8f0'}
            stroke={transitionInfo.kind === 'outgoing' ? '#1e40af' : '#94a3b8'}
            strokeWidth="0.25"
          />
          <text
            x={node.x}
            y={node.y + 6.0}
            fontSize="2.0"
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
