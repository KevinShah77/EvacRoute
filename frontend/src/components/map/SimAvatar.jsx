import React from 'react';

export default function SimAvatar({ avatar, activeFloor }) {
  if (!avatar || avatar.floor !== activeFloor) return null;

  return (
    <g className="pointer-events-none">
      <circle
        cx={avatar.x}
        cy={avatar.y}
        r="3.2"
        fill={avatar.isFinished ? '#10b981' : '#3b82f6'}
        opacity="0.35"
        className="evac-avatar-ring"
      />
      <circle
        cx={avatar.x}
        cy={avatar.y}
        r="2.1"
        fill={avatar.isFinished ? '#059669' : '#1d4ed8'}
        stroke="#ffffff"
        strokeWidth="0.7"
      />
      {avatar.transitionStatus && (
        <g>
          <rect
            x={avatar.x - 10}
            y={avatar.y - 7.8}
            width="20"
            height="3.8"
            rx="1"
            fill="#0f172a"
          />
          <text
            x={avatar.x}
            y={avatar.y - 5.2}
            fontSize="1.9"
            textAnchor="middle"
            className="fill-white font-bold"
          >
            {avatar.transitionStatus}
          </text>
        </g>
      )}
    </g>
  );
}
