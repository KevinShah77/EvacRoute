import React from 'react';
import { useEvacuation } from '../../hooks/useEvacuation';
import { DEFAULT_HAZARD_COUNTS } from '../../constants/hazardConfig';

export default function TelemetryCard() {
  const { availableFloors, stats } = useEvacuation();
  const hazardCounts = stats.hazard_counts || DEFAULT_HAZARD_COUNTS;

  return (
    <div className="bg-slate-800 p-4 rounded-xl shadow-inner flex-grow">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Building Telemetry
      </h2>
      <ul className="text-sm space-y-2">
        <li className="flex justify-between">
          <span className="text-slate-300">Active Floors:</span>
          <span className="font-mono font-semibold">{availableFloors.length || '—'}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-slate-300">Emergency Exits:</span>
          <span className="font-mono font-semibold text-green-400">
            {stats.total_exits ?? '—'}
          </span>
        </li>
        <li className="flex justify-between text-red-400">
          <span>Fire Blocks:</span>
          <span className="font-mono font-semibold">{hazardCounts.fire}</span>
        </li>
        <li className="flex justify-between text-slate-300">
          <span>Smoke Zones:</span>
          <span className="font-mono font-semibold">{hazardCounts.smoke}</span>
        </li>
        <li className="flex justify-between text-orange-400">
          <span>Structural Debris:</span>
          <span className="font-mono font-semibold">{hazardCounts.debris}</span>
        </li>
      </ul>
    </div>
  );
}
