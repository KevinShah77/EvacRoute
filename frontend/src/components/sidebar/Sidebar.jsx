import React from 'react';
import { ShieldCheck, Map as MapIcon, BarChart3, Route } from 'lucide-react';
import LocationSearch from './LocationSearch';
import ExitSelector from './ExitSelector';
import AdaToggle from './AdaToggle';
import TelemetryCard from './TelemetryCard';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    stats,
    loading,
    startNode,
    targetNode,
    accessibleOnly,
    calculateRoute,
  } = useEvacuation();

  const trappedRooms = stats.analytics?.summary?.trapped_rooms || 0;

  return (
    <div className="w-80 bg-slate-900 text-white p-6 flex flex-col gap-5 shadow-xl overflow-y-auto shrink-0">
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
        <ShieldCheck size={32} className="text-blue-400 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight leading-none">EvacRoute</h1>
          <p className="text-xs text-slate-400 mt-1">Intelligent Evacuation Planner</p>
        </div>
      </div>

      {/* Navigation Switcher */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('map')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <MapIcon size={14} /> Floor Map
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors relative ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <BarChart3 size={14} /> Analytics
          {trappedRooms > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl shadow-inner space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Route Planner
        </h2>

        <LocationSearch />
        <ExitSelector />
        <AdaToggle />

        <button
          onClick={() => {
            setActiveTab('map');
            calculateRoute(startNode, targetNode, accessibleOnly, true);
          }}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-900/30"
        >
          <Route size={18} />
          {loading ? 'Calculating...' : 'Find Evacuation Route'}
        </button>
      </div>

      <TelemetryCard />
    </div>
  );
}
