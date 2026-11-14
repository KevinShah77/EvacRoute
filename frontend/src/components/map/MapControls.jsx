import React from 'react';
import { Layers, RefreshCcw } from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { FLOOR_MAP_IMAGES } from '../../constants/floorConfig';
import { getFloorSequence } from '../../utils/geometry';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function MapControls() {
  const {
    availableFloors,
    activeFloor,
    setActiveFloor,
    route,
    graph,
    startNode,
    resetAllSimulation,
    blueprintOpacity,
    setBlueprintOpacity,
  } = useEvacuation();

  const primaryFloors = new Set(getFloorSequence(graph.nodes, route?.path));
  const backupFloors = new Set(getFloorSequence(graph.nodes, route?.backup_route?.path));
  const startNodeObj = graph.nodes.find((n) => n.id === startNode);

  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-sm flex-wrap">
          <Layers size={15} className="text-slate-400 ml-2 mr-1" />
          {availableFloors.map((floor) => {
            const onPrimary = primaryFloors.has(floor);
            const onBackup = backupFloors.has(floor);
            const isStartFloor = startNodeObj?.floor === floor;
            const isActive = activeFloor === floor;

            return (
              <button
                key={floor}
                onClick={() => setActiveFloor(floor)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : onPrimary
                    ? 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{floor}</span>
                {onPrimary && (
                  <span
                    title="Active evacuation route passes through this floor"
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'
                    }`}
                  />
                )}
                {!onPrimary && onBackup && (
                  <span
                    title="Backup route passes through this floor"
                    className="w-2 h-2 rounded-full bg-amber-400"
                  />
                )}
                {!onPrimary && isStartFloor && (
                  <span
                    title="Current start location floor"
                    className="text-[10px] font-bold uppercase opacity-75"
                  >
                    •
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={resetAllSimulation}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-xl shadow-sm text-sm font-medium"
        >
          <RefreshCcw size={15} /> Reset Simulation
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Floor Blueprint:</span>
          {APP_CONFIG.BLUEPRINT_OPACITY_OPTIONS.map((op) => (
            <button
              key={op}
              onClick={() => setBlueprintOpacity(op)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                blueprintOpacity === op
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {op === 0 ? 'Off' : `${Math.round(op * 100)}%`}
            </button>
          ))}
        </div>

        <span className="font-mono text-slate-400 text-[11px]">
          {FLOOR_MAP_IMAGES[activeFloor]} ({activeFloor})
        </span>
      </div>
    </div>
  );
}
