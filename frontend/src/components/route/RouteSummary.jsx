import React from 'react';
import {
  Clock,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  Zap,
  AlertTriangle,
  Accessibility,
} from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

export default function RouteSummary() {
  const {
    route,
    routeView,
    activeSelection,
    setRouteSelection,
    clearSelection,
    displayedRoute,
    startNode,
    setTargetNode,
    accessibleOnly,
    calculateRoute,
  } = useEvacuation();

  const { resetSimulationPlayback } = useSimulation();

  if (!route) return null;

  if (route.distance === -1) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm mb-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-700">
              {route.error ? 'Route Constraint Alert' : 'Selected Exit Unreachable'}
            </h3>
            <p className="text-slate-600 text-sm mt-1">
              {route.error ||
                'All pathways to the selected exit are currently blocked or unavailable.'}
            </p>

            {route.backup_route && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Dynamic Reroute Available
                  </div>
                  <p className="text-sm text-amber-900 mt-0.5">
                    Safe alternative via{' '}
                    <strong>{route.backup_route.target_exit?.label}</strong> (
                    {route.backup_route.distance}m · {route.backup_route.formatted_time})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTargetNode('AUTO');
                    calculateRoute(startNode, 'AUTO', accessibleOnly, false);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Zap size={16} /> Switch to Nearest Safe Exit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-5">
      {/* Primary vs Backup Route Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => {
              resetSimulationPlayback();
              if (activeSelection?.type === 'route' && activeSelection?.id === 'primary') {
                clearSelection();
              } else {
                setRouteSelection('primary');
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSelection?.type === 'route' && activeSelection?.id === 'primary'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Focus Primary Route on floor map"
          >
            <Zap size={15} />
            Primary Route ({route.distance}m · {route.formatted_time})
          </button>

          {route.backup_route ? (
            <button
              onClick={() => {
                resetSimulationPlayback();
                if (activeSelection?.type === 'route' && activeSelection?.id === 'backup') {
                  clearSelection();
                } else {
                  setRouteSelection('backup');
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeSelection?.type === 'route' && activeSelection?.id === 'backup'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Focus Backup Route on floor map"
            >
              <ShieldAlert size={15} />
              Backup Route ({route.backup_route.distance}m ·{' '}
              {route.backup_route.formatted_time})
            </button>
          ) : (
            <span className="px-3 py-2 text-xs font-medium text-slate-400">
              No secondary backup path available
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {displayedRoute.hazards_encountered?.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-full text-xs font-bold">
              <AlertTriangle size={14} /> Passes Through{' '}
              {displayedRoute.hazards_encountered.length} Hazard Zone(s)
            </span>
          )}
          {route.accessible_mode && (
            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-full text-xs font-bold">
              <Accessibility size={14} /> ADA Step-Free Route Active
            </span>
          )}
        </div>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Estimated Escape Time (RSET)</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {displayedRoute.formatted_time}
          </div>
          {displayedRoute.rset_breakdown && (
            <p className="text-xs text-slate-500 mt-1.5">
              Walk {displayedRoute.rset_breakdown.walking_speed_ms} m/s
              {displayedRoute.rset_breakdown.stair_distance > 0 &&
                ` · Stairs ${displayedRoute.rset_breakdown.stair_speed_ms} m/s`}
              {displayedRoute.rset_breakdown.elevator_distance > 0 &&
                ` · Evac Lift ${displayedRoute.rset_breakdown.elevator_speed_ms} m/s`}
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Travel Distance</span>
            <Navigation size={16} className="text-green-600" />
          </div>
          <div className="flex items-baseline gap-2.5 mt-2">
            <span className="text-3xl font-black text-blue-600">
              {displayedRoute.distance}m
            </span>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              {displayedRoute.target_exit?.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {routeView === 'backup'
              ? 'Alternative emergency escape route'
              : route.auto_selected
              ? 'Auto-selected safest & nearest exit'
              : 'Targeted exit route'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>All Exits Comparison</span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div className="space-y-1.5">
            {(route.exit_candidates || []).map((cand) => {
              const isSelectedExit = cand.id === displayedRoute.target_exit?.id;
              return (
                <button
                  key={cand.id}
                  onClick={() => {
                    if (cand.reachable) {
                      setTargetNode(cand.id);
                      calculateRoute(startNode, cand.id, accessibleOnly, false);
                      setRouteSelection('primary');
                    }
                  }}
                  disabled={!cand.reachable}
                  className={`w-full flex items-center justify-between text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    isSelectedExit
                      ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                      : cand.reachable
                      ? 'hover:bg-slate-50 text-slate-700'
                      : 'text-red-400 line-through cursor-not-allowed'
                  }`}
                >
                  <span className="truncate mr-2">
                    {cand.label}
                    {cand.hazard_count > 0 && cand.reachable ? ' ⚠' : ''}
                  </span>
                  <span className="font-mono shrink-0">
                    {cand.reachable
                      ? `${cand.distance}m (${cand.formatted_time})`
                      : 'Blocked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
