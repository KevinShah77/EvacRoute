import React from 'react';
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { getFloorSequence } from '../../utils/geometry';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

export default function SimControls() {
  const { displayedRoute, graph, activeFloor, setActiveFloor } = useEvacuation();
  const {
    simState,
    simSpeed,
    setSimSpeed,
    simStepIndex,
    avatar,
    toggleSimulation,
    resetSimulationPlayback,
  } = useSimulation();

  if (!displayedRoute || displayedRoute.distance <= 0) return null;

  const floorSequence = getFloorSequence(graph.nodes, displayedRoute.path);

  return (
    <div className="space-y-3 mb-4">
      {/* Simulation Playback Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-slate-500 uppercase tracking-wider">
            Route Floors:
          </span>
          {floorSequence.map((fl, idx, arr) => (
            <React.Fragment key={fl}>
              <button
                onClick={() => setActiveFloor(fl)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  activeFloor === fl
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {fl}
              </button>
              {idx < arr.length - 1 && (
                <span className="text-slate-400 font-bold">→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={toggleSimulation}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
              simState === 'playing'
                ? 'bg-amber-500 hover:bg-amber-400 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {simState === 'playing' ? (
              <>
                <Pause size={14} /> Pause Sim
              </>
            ) : simState === 'paused' ? (
              <>
                <Play size={14} /> Resume Sim
              </>
            ) : simState === 'completed' ? (
              <>
                <RotateCcw size={14} /> Replay Evacuation
              </>
            ) : (
              <>
                <Play size={14} /> Simulate Evacuation
              </>
            )}
          </button>

          {simState !== 'idle' && (
            <button
              onClick={resetSimulationPlayback}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Stop
            </button>
          )}

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
            {APP_CONFIG.SIM_SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  simSpeed === spd
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Avatar Live Step Status Bar */}
      {avatar && (
        <div
          className={`px-4 py-2 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
            avatar.isFinished
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {avatar.isFinished ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>
                  Evacuation Complete! Safely exited via {displayedRoute.target_exit?.label}.
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                <span>
                  Step {simStepIndex + 1}/{displayedRoute.steps?.length}:{' '}
                  {avatar.step.instruction}
                </span>
              </>
            )}
          </div>
          <span className="font-mono font-bold">
            {avatar.elapsedSeconds}s / {displayedRoute.estimated_time_seconds}s
          </span>
        </div>
      )}
    </div>
  );
}
