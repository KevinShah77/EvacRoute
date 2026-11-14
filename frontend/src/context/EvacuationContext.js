import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { APP_CONFIG } from '../config';
import { FLOOR_ORDER } from '../constants/floorConfig';
import { HAZARD_TOOLS } from '../constants/hazardConfig';

const EvacuationContext = createContext(null);

export function EvacuationProvider({ children }) {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'analytics'
  const [graph, setGraph] = useState({ nodes: [], edges: [], blocked: [], hazards: [], floors: [] });
  const [stats, setStats] = useState({});
  const [startNode, setStartNode] = useState(APP_CONFIG.DEFAULT_START_NODE);
  const [targetNode, setTargetNode] = useState(APP_CONFIG.DEFAULT_TARGET);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [hazardTool, setHazardTool] = useState('fire');
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.85);
  const [route, setRoute] = useState(null);
  const [routeView, setRouteView] = useState('primary');
  const [activeSelection, setActiveSelection] = useState(null); // null | { type: 'route', id: string } | { type: 'hazard', id: string }
  const [activeFloor, setActiveFloor] = useState(APP_CONFIG.DEFAULT_FLOOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusToast, setStatusToast] = useState(null);

  const showToast = useCallback((msg) => {
    setStatusToast(msg);
  }, []);

  useEffect(() => {
    if (!statusToast) return;
    const timer = setTimeout(() => setStatusToast(null), APP_CONFIG.TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [statusToast]);

  const loadData = useCallback(
    async (adaFlag = accessibleOnly) => {
      try {
        const [graphRes, statsRes] = await Promise.all([
          api.getGraph(),
          api.getAnalytics(adaFlag),
        ]);
        setGraph(graphRes.data);
        setStats(statsRes.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load building data:', err);
        setError(err.message || 'Unable to connect to backend API server.');
      }
    },
    [accessibleOnly]
  );

  useEffect(() => {
    loadData(accessibleOnly);
  }, [loadData, accessibleOnly]);

  const calculateRoute = useCallback(
    async (
      start = startNode,
      target = targetNode,
      accessible = accessibleOnly,
      switchFloor = true,
      selectionOverride = null
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.findRoute(start, target, accessible);
        setRoute(res.data);

        setActiveSelection((prev) => {
          if (selectionOverride) {
            if (selectionOverride.type === 'route') {
              setRouteView(selectionOverride.id);
            }
            return selectionOverride;
          }
          // Preserve active hazard brush mode so corridor editing is not interrupted
          if (prev?.type === 'hazard') {
            return prev;
          }
          // Preserve backup route view if available
          if (prev?.type === 'route' && prev?.id === 'backup' && res.data?.backup_route) {
            setRouteView('backup');
            return prev;
          }
          // If default map view (cleared selection), preserve default
          if (prev === null) {
            setRouteView('primary');
            return null;
          }
          setRouteView('primary');
          return { type: 'route', id: 'primary' };
        });

        if (switchFloor) {
          const sNode = graph.nodes.find((n) => n.id === start);
          if (sNode?.floor) setActiveFloor(sNode.floor);
        }
      } catch (err) {
        console.error('Route calculation failed:', err);
        setError(err.message || 'Failed to calculate evacuation route.');
      } finally {
        setLoading(false);
      }
    },
    [startNode, targetNode, accessibleOnly, graph.nodes]
  );

  const toggleAccessible = useCallback(async () => {
    const nextVal = !accessibleOnly;
    setAccessibleOnly(nextVal);
    await loadData(nextVal);

    if (nextVal) {
      const currentStart = graph.nodes.find((n) => n.id === startNode);
      if (currentStart?.type === 'staircase') {
        const fallbackRoom =
          graph.nodes.find((n) => n.type === 'classroom') || graph.nodes[0];
        if (fallbackRoom) {
          setStartNode(fallbackRoom.id);
          showToast(`Switched start to ${fallbackRoom.label} (ADA compliant)`);
          if (route) {
            await calculateRoute(fallbackRoom.id, targetNode, nextVal, true);
          }
          return;
        }
      }
    }
    if (route) {
      await calculateRoute(startNode, targetNode, nextVal, false);
    }
  }, [accessibleOnly, loadData, graph.nodes, startNode, route, calculateRoute, targetNode, showToast]);

  const applyCorridorHazard = useCallback(
    async (edge) => {
      const nextHazard = edge.hazard === hazardTool ? 'clear' : hazardTool;
      try {
        await api.blockCorridor(edge.source, edge.target, nextHazard);
        await loadData(accessibleOnly);
        if (nextHazard === 'clear') {
          showToast('Corridor hazard cleared');
        } else {
          const toolMeta = HAZARD_TOOLS.find((t) => t.id === nextHazard);
          showToast(`Applied ${toolMeta?.label || nextHazard} hazard`);
        }
        if (route) {
          await calculateRoute(startNode, targetNode, accessibleOnly, false);
        }
      } catch (err) {
        console.error('Failed to update corridor hazard:', err);
        setError(err.message || 'Failed to update corridor hazard.');
      }
    },
    [hazardTool, loadData, accessibleOnly, showToast, route, calculateRoute, startNode, targetNode]
  );

  const resetAllSimulation = useCallback(async () => {
    try {
      await api.resetSimulation();
      setError(null);
      await loadData(accessibleOnly);
      showToast('All hazards cleared');
      if (route) {
        await calculateRoute(startNode, targetNode, accessibleOnly, false);
      }
    } catch (err) {
      console.error('Failed to reset simulation:', err);
      setError(err.message || 'Failed to reset simulation.');
    }
  }, [loadData, accessibleOnly, showToast, route, calculateRoute, startNode, targetNode]);

  const setStartLocation = useCallback(
    async (node) => {
      if (accessibleOnly && node.type === 'staircase') {
        setError('Cannot start at a staircase when Wheelchair / Reduced Mobility (ADA) mode is enabled.');
        return;
      }
      setError(null);
      setStartNode(node.id);
      showToast(`Start location set to ${node.label} (${node.floor})`);
      if (route) {
        await calculateRoute(node.id, targetNode, accessibleOnly, false);
      }
    },
    [accessibleOnly, showToast, route, calculateRoute, targetNode]
  );

  const inspectRoom = useCallback(
    async (room) => {
      setStartNode(room.id);
      setTargetNode('AUTO');
      setActiveTab('map');
      if (room.floor) setActiveFloor(room.floor);
      await calculateRoute(room.id, 'AUTO', accessibleOnly, true, { type: 'route', id: 'primary' });
    },
    [accessibleOnly, calculateRoute]
  );

  const setRouteSelection = useCallback((viewType = 'primary') => {
    setRouteView(viewType);
    setActiveSelection({ type: 'route', id: viewType });
  }, []);

  const setHazardSelection = useCallback((toolId) => {
    setHazardTool(toolId);
    setActiveSelection((prev) => {
      if (prev?.type === 'hazard' && prev?.id === toolId) {
        return null;
      }
      return { type: 'hazard', id: toolId };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setActiveSelection(null);
  }, []);

  // Derive floor list cleanly from graph data
  const availableFloors =
    graph.floors && graph.floors.length > 0
      ? graph.floors
      : Array.from(new Set(graph.nodes.map((n) => n.floor))).sort(
          (a, b) => (FLOOR_ORDER[a] ?? 99) - (FLOOR_ORDER[b] ?? 99)
        );

  const displayedRoute =
    routeView === 'backup' && route?.backup_route ? route.backup_route : route;

  const value = {
    activeTab,
    setActiveTab,
    graph,
    stats,
    startNode,
    setStartNode,
    targetNode,
    setTargetNode,
    accessibleOnly,
    toggleAccessible,
    hazardTool,
    setHazardTool,
    activeSelection,
    setActiveSelection,
    setRouteSelection,
    setHazardSelection,
    clearSelection,
    blueprintOpacity,
    setBlueprintOpacity,
    route,
    setRoute,
    routeView,
    setRouteView,
    displayedRoute,
    activeFloor,
    setActiveFloor,
    availableFloors,
    loading,
    error,
    setError,
    statusToast,
    showToast,
    loadData,
    calculateRoute,
    applyCorridorHazard,
    resetAllSimulation,
    setStartLocation,
    inspectRoom,
  };

  return (
    <EvacuationContext.Provider value={value}>
      {children}
    </EvacuationContext.Provider>
  );
}

export function useEvacuation() {
  const context = useContext(EvacuationContext);
  if (!context) {
    throw new Error('useEvacuation must be used within an EvacuationProvider');
  }
  return context;
}
