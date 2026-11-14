import React from 'react';
import StepIcon from '../common/StepIcon';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

export default function StepGuidance() {
  const {
    route,
    routeView,
    displayedRoute,
    setActiveFloor,
    setRouteView,
    setRouteSelection,
  } = useEvacuation();

  const { simState, simStepIndex, resetSimulationPlayback } = useSimulation();

  if (!displayedRoute || displayedRoute.distance < 0) return null;

  const handleSelectRoute = (targetView) => {
    resetSimulationPlayback();
    if (typeof setRouteSelection === 'function') {
      setRouteSelection(targetView);
    } else if (typeof setRouteView === 'function') {
      setRouteView(targetView);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {routeView === 'backup'
              ? 'Secondary (Backup) Turn-by-Turn Guidance'
              : 'Turn-by-Turn Evacuation Guidance'}
          </h3>
          <p className="text-xs text-slate-500">
            {displayedRoute.steps?.length || 0} navigation steps to{' '}
            {displayedRoute.target_exit?.label}
          </p>
        </div>
        {route?.backup_route && routeView === 'primary' && (
          <button
            onClick={() => handleSelectRoute('backup')}
            className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Preview Backup via {route.backup_route.target_exit?.label} (
            {route.backup_route.distance}m) →
          </button>
        )}
        {route?.backup_route && routeView === 'backup' && (
          <button
            onClick={() => handleSelectRoute('primary')}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← View Primary via {route.target_exit?.label} ({route.distance}m)
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {(displayedRoute.steps || []).map((step, idx) => {
          const isCurrentSimStep =
            (simState === 'playing' || simState === 'paused') &&
            idx === simStepIndex;

          return (
            <div
              key={step.step}
              onClick={() => step.floor && setActiveFloor(step.floor)}
              className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                isCurrentSimStep
                  ? 'border-blue-400 bg-blue-50/90 shadow-xs'
                  : step.hazard
                  ? 'border-amber-300 bg-amber-50/60'
                  : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/80'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCurrentSimStep
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {step.step}
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <StepIcon type={step.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">
                    {step.instruction}
                  </p>
                  {isCurrentSimStep && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-blue-600 text-white rounded">
                      Active
                    </span>
                  )}
                  {step.hazard && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                      ⚠ {step.hazard_label || step.hazard} — Reduced Speed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                    {step.floor}
                  </span>
                  {step.to_floor && step.to_floor !== step.floor && (
                    <span>→ {step.to_floor}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono text-slate-800">
                  {step.distance}m
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  ~{step.time_seconds}s
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Raw Path Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-center text-xs font-mono text-slate-500">
        <span className="font-sans font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Node Path:
        </span>
        {displayedRoute.path.map((step, idx) => (
          <React.Fragment key={idx}>
            <span
              className={
                idx === 0
                  ? 'text-slate-900 font-bold'
                  : idx === displayedRoute.path.length - 1
                  ? 'text-green-600 font-bold'
                  : 'text-slate-600'
              }
            >
              {step}
            </span>
            {idx < displayedRoute.path.length - 1 && (
              <span className="text-slate-400">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
