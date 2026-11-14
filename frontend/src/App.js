import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import Sidebar from './components/sidebar/Sidebar';
import HazardToolbar from './components/hazards/HazardToolbar';
import FloorMap from './components/map/FloorMap';
import SimControls from './components/route/SimControls';
import RouteSummary from './components/route/RouteSummary';
import StepGuidance from './components/route/StepGuidance';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import ErrorBanner from './components/common/ErrorBanner';
import { EvacuationProvider } from './context/EvacuationContext';
import { SimulationProvider } from './context/SimulationContext';
import { useEvacuation } from './hooks/useEvacuation';
import { DEFAULT_HAZARD_COUNTS } from './constants/hazardConfig';

function EvacuationAppContent() {
  const {
    activeTab,
    stats,
    error,
    setError,
    statusToast,
    resetAllSimulation,
    inspectRoom,
    accessibleOnly,
  } = useEvacuation();

  const hazardCounts = stats.hazard_counts || DEFAULT_HAZARD_COUNTS;
  const activeHazardTotal = stats.active_hazards || 0;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Active Hazard Simulation Banner */}
        {activeHazardTotal > 0 && (
          <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between font-semibold shadow-md text-sm">
            <div className="flex items-center gap-2.5 flex-wrap">
              <AlertTriangle size={18} />
              <span>
                Hazard Simulation Active: {hazardCounts.fire} Fire · {hazardCounts.smoke} Smoke ·{' '}
                {hazardCounts.debris} Structural — routes dynamically recalculated.
              </span>
            </div>
            <button
              onClick={resetAllSimulation}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors shrink-0"
            >
              Clear All Hazards
            </button>
          </div>
        )}

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
          {activeTab === 'analytics' ? (
            <AnalyticsDashboard
              stats={stats}
              accessibleOnly={accessibleOnly}
              onInspectRoom={inspectRoom}
            />
          ) : (
            <>
              {/* Map View Header */}
              <div className="flex flex-wrap justify-between items-end gap-4 mb-5">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
                    Interactive Floor Map
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      Select a hazard brush and click any corridor, or click a room to set start.
                    </span>
                    {statusToast && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        <MapPin size={12} /> {statusToast}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <HazardToolbar />
              <SimControls />
              <FloorMap />
              <RouteSummary />
              <StepGuidance />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <EvacuationProvider>
      <SimulationProvider>
        <EvacuationAppContent />
      </SimulationProvider>
    </EvacuationProvider>
  );
}
