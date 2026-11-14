import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { APP_CONFIG } from '../config';
import { FLOOR_ORDER } from '../constants/floorConfig';
import { HAZARD_TOOLS } from '../constants/hazardConfig';
import { voiceAssistant } from '../services/voiceAssistant';
import { emergencyEventClient } from '../services/realtime/emergencyEvents';

const EvacuationContext = createContext(null);

export function EvacuationProvider({ children }) {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'emergency-map' | 'analytics' | 'admin'
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

  // EvacRoute 2.0 Emergency System State
  const [emergency, setEmergency] = useState(null);
  const [emergencyStatus, setEmergencyStatus] = useState('normal'); // 'normal' | 'emergency_reported' | 'emergency_verification' | 'emergency_active' | 'emergency_resolved'
  const [emergencyExits, setEmergencyExits] = useState([]);
  const [assemblyPoints, setAssemblyPoints] = useState([]);
  const [isSimulationMode, setIsSimulationMode] = useState(true); // Toggle between Simulation / Demo Mode and Live Mode
  const [activeGuidedUsers, setActiveGuidedUsers] = useState(0);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Voice Assistant State
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [autoAdvanceVoice, setAutoAdvanceVoice] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const prevRouteExitRef = useRef(null);
  const prevRoutePathRef = useRef([]);
  const autoAdvanceTimerRef = useRef(null);

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
        const emgPromise =
          (typeof api.getEmergencyStatus === 'function' ? api.getEmergencyStatus() : null) ||
          Promise.resolve({ data: {} });

        const [graphRes, statsRes, emgRes] = await Promise.all([
          api.getGraph(),
          api.getAnalytics(adaFlag),
          emgPromise.catch(() => ({ data: {} })),
        ]);
        setGraph(graphRes?.data || { nodes: [], edges: [], blocked: [], hazards: [], floors: [] });
        setStats(statsRes?.data || {});

        if (emgRes?.data) {
          const ed = emgRes.data;
          setEmergency(ed.emergency || null);
          setEmergencyStatus(ed.status || 'normal');
          setEmergencyExits(ed.available_exits || []);
          setAssemblyPoints(ed.assembly_points || []);
          if (typeof ed.active_guided_users === 'number') {
            setActiveGuidedUsers(ed.active_guided_users);
          }
          if (ed.has_active_emergency) {
            setActiveTab((prev) => (prev === 'map' ? 'emergency-map' : prev));
          }
        }
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
        if (res.data?.path) {
          prevRoutePathRef.current = res.data.path;
        }
        if (res.data?.target_exit?.id) {
          prevRouteExitRef.current = res.data.target_exit.id;
        }

        setActiveSelection((prev) => {
          if (selectionOverride) {
            if (selectionOverride.type === 'route') {
              setRouteView(selectionOverride.id);
            }
            return selectionOverride;
          }
          if (prev?.type === 'route' && prev?.id === 'backup' && res.data?.backup_route) {
            setRouteView('backup');
            return prev;
          }
          setRouteView('primary');
          return { type: 'route', id: 'primary' };
        });

        if (switchFloor) {
          const sNode = graph.nodes.find((n) => n.id === start);
          if (sNode?.floor) setActiveFloor(sNode.floor);
        }

        return res.data;
      } catch (err) {
        console.error('Route calculation failed:', err);
        setError(err.message || 'Failed to calculate evacuation route.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [startNode, targetNode, accessibleOnly, graph.nodes]
  );

  // Check URL parameters for active notification click behaviour
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const emgParam = urlParams.get('emergency');

    if (emgParam === 'active' || tabParam === 'emergency-map') {
      setActiveTab('emergency-map');
      // Auto calculate route from default start node
      calculateRoute(startNode, 'AUTO', accessibleOnly, true);
    }
  }, [calculateRoute, startNode, accessibleOnly]);

  // Voice Assistant Controls
  const startVoiceGuidance = useCallback(
    (targetRoute = route) => {
      if (!targetRoute || !targetRoute.steps || targetRoute.steps.length === 0) {
        showToast('No active evacuation route to navigate.');
        return;
      }

      setVoiceActive(true);
      setVoicePaused(false);
      setCurrentStepIndex(0);
      api.toggleGuideSession('start').catch(() => {});

      voiceAssistant.playAlertChime();

      const firstStep = targetRoute.steps[0];
      const sNode = graph.nodes.find((n) => n.id === startNode);
      const floorLabel = sNode?.floor || activeFloor;

      const introText =
        `Emergency evacuation guidance activated. Please remain calm. You are currently on ${floorLabel}. ` +
        voiceAssistant.formatStepSpokenText(firstStep, 0, targetRoute.steps.length);

      voiceAssistant.speak(introText, {
        priority: true,
        onStart: () => setVoiceSpeaking(true),
        onEnd: () => setVoiceSpeaking(false),
        onError: () => setVoiceSpeaking(false),
      });

      showToast('Voice navigation started');
    },
    [route, graph.nodes, startNode, activeFloor, showToast]
  );

  const stopVoiceGuidance = useCallback(() => {
    clearTimeout(autoAdvanceTimerRef.current);
    voiceAssistant.cancel();
    setVoiceActive(false);
    setVoiceSpeaking(false);
    setVoicePaused(false);
    setCurrentStepIndex(0);
    api.toggleGuideSession('stop').catch(() => {});
    showToast('Voice navigation stopped');
  }, [showToast]);

  const pauseVoiceGuidance = useCallback(() => {
    clearTimeout(autoAdvanceTimerRef.current);
    voiceAssistant.pause();
    setVoicePaused(true);
    setVoiceSpeaking(false);
  }, []);

  const resumeVoiceGuidance = useCallback(() => {
    voiceAssistant.resume();
    setVoicePaused(false);
    setVoiceSpeaking(true);
  }, []);

  const speakStep = useCallback(
    (stepIdx, targetRoute = route) => {
      clearTimeout(autoAdvanceTimerRef.current);
      if (!targetRoute?.steps || !targetRoute.steps[stepIdx]) return;
      const step = targetRoute.steps[stepIdx];
      const text = voiceAssistant.formatStepSpokenText(step, stepIdx, targetRoute.steps.length);
      voiceAssistant.speak(text, {
        priority: true,
        onStart: () => setVoiceSpeaking(true),
        onEnd: () => {
          setVoiceSpeaking(false);
          // Automatic announcement of next direction if autoAdvance is enabled
          if (autoAdvanceVoice && stepIdx < (targetRoute.steps?.length || 0) - 1) {
            autoAdvanceTimerRef.current = setTimeout(() => {
              const nextIdx = stepIdx + 1;
              setCurrentStepIndex(nextIdx);
              const nextStep = targetRoute.steps[nextIdx];
              if (nextStep?.floor && nextStep.floor !== activeFloor) {
                setActiveFloor(nextStep.floor);
              }
              speakStep(nextIdx, targetRoute);
            }, 3500);
          }
        },
        onError: () => setVoiceSpeaking(false),
      });
    },
    [route, autoAdvanceVoice, activeFloor]
  );

  const repeatVoiceInstruction = useCallback(() => {
    speakStep(currentStepIndex);
  }, [currentStepIndex, speakStep]);

  const nextVoiceStep = useCallback(() => {
    const stepsLen = route?.steps?.length || 0;
    if (currentStepIndex < stepsLen - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextStep = route.steps[nextIdx];
      if (nextStep?.floor && nextStep.floor !== activeFloor) {
        setActiveFloor(nextStep.floor);
      }
      speakStep(nextIdx);
    } else {
      voiceAssistant.speak('You have completed your evacuation route to the safe area.', {
        priority: true,
        onStart: () => setVoiceSpeaking(true),
        onEnd: () => setVoiceSpeaking(false),
      });
    }
  }, [currentStepIndex, route, activeFloor, speakStep]);

  const prevVoiceStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      speakStep(prevIdx);
    }
  }, [currentStepIndex, speakStep]);

  // Real-Time SSE Event Handling
  useEffect(() => {
    const unsubscribe = emergencyEventClient.subscribe((payload) => {
      const { event, data } = payload;
      if (!data) return;

      if (event === 'initial_state') {
        setEmergency(data.emergency || null);
        setEmergencyStatus(data.status || 'normal');
        setEmergencyExits(data.available_exits || []);
        setAssemblyPoints(data.assembly_points || []);
      } else if (event === 'emergency_activated') {
        const emg = data.emergency;
        setEmergency(emg);
        setEmergencyStatus('emergency_active');
        setActiveTab('emergency-map');
        showToast(`EMERGENCY ALERT: ${emg?.type?.toUpperCase()} on ${emg?.floor}`);

        loadData(accessibleOnly);
        calculateRoute(startNode, 'AUTO', accessibleOnly, true).then((newRoute) => {
          if (newRoute) {
            startVoiceGuidance(newRoute);
          }
        });
      } else if (event === 'emergency_updated') {
        const emg = data.emergency;
        setEmergency(emg);
        loadData(accessibleOnly);

        // Dynamic route recalculation when hazards change
        calculateRoute(startNode, 'AUTO', accessibleOnly, false).then((updatedRoute) => {
          if (!updatedRoute) return;

          if (updatedRoute.distance === -1) {
            voiceAssistant.cancel();
            voiceAssistant.speak(
              'Attention. All evacuation routes are currently blocked by spreading hazards. Please shelter in place, keep all doors closed, and wait for emergency response personnel.',
              { priority: true }
            );
            showToast('All evacuation routes compromised. Shelter in place!');
            return;
          }

          if (voiceActive) {
            const oldPath = prevRoutePathRef.current || [];
            const newPath = updatedRoute.path || [];
            const pathChanged = JSON.stringify(oldPath) !== JSON.stringify(newPath);

            const newExitId = updatedRoute.target_exit?.id;
            const oldExitId = prevRouteExitRef.current;
            const exitChanged = oldExitId && newExitId && oldExitId !== newExitId;

            if (exitChanged || pathChanged) {
              const exitLabel = updatedRoute.target_exit?.label || newExitId || 'safe exit';
              voiceAssistant.cancel();
              const warningMsg = `Attention. The previous route is no longer safe due to spreading hazards. Follow the updated route towards ${exitLabel}.`;
              voiceAssistant.speak(warningMsg, {
                priority: true,
                onEnd: () => {
                  setCurrentStepIndex(0);
                  speakStep(0, updatedRoute);
                },
              });
              showToast('Evacuation route updated due to hazard changes');
            } else {
              speakStep(currentStepIndex, updatedRoute);
            }
            prevRouteExitRef.current = newExitId;
            prevRoutePathRef.current = newPath;
          }
        });
      } else if (event === 'emergency_resolved') {
        setEmergency(null);
        setEmergencyStatus('emergency_resolved');
        loadData(accessibleOnly);
        voiceAssistant.cancel();
        setVoiceActive(false);
        voiceAssistant.speak(
          'Attention. The emergency has been resolved by college safety authorities. Normal activity may resume.',
          { priority: true }
        );
        showToast('Emergency resolved. All clear.');
      } else if (event === 'emergency_reported') {
        setEmergency(data.emergency);
        setEmergencyStatus('emergency_reported');
        showToast(`Emergency reported: ${data.emergency?.type} (${data.emergency?.location})`);
      }
    });

    return () => unsubscribe();
  }, [
    accessibleOnly,
    calculateRoute,
    currentStepIndex,
    loadData,
    showToast,
    speakStep,
    startNode,
    startVoiceGuidance,
    voiceActive,
  ]);

  // Track previous route exit to detect exit alterations
  useEffect(() => {
    if (route?.target_exit?.id) {
      prevRouteExitRef.current = route.target_exit.id;
    }
  }, [route]);

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
      if (emergency?.id) {
        await api.resolveEmergency({ emergency_id: emergency.id, notes: 'Simulation reset' }).catch(() => {});
      }
      voiceAssistant.cancel();
      setVoiceActive(false);
      setError(null);
      setRoute(null);
      setActiveSelection(null);
      await loadData(accessibleOnly);
      showToast('Simulation reset: all hazards, emergencies, and routes cleared');
    } catch (err) {
      console.error('Failed to reset simulation:', err);
      setError(err.message || 'Failed to reset simulation.');
    }
  }, [loadData, accessibleOnly, showToast, emergency]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setActiveSelection(null);
    stopVoiceGuidance();
  }, [stopVoiceGuidance]);

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
    setActiveSelection((prev) => {
      if (prev?.type === 'route') {
        setRoute(null);
      }
      return null;
    });
  }, []);

  // Floor list
  const derivedFloors = Array.from(new Set((graph.nodes || []).map((n) => n.floor)))
    .filter(Boolean)
    .sort((a, b) => (FLOOR_ORDER[a] ?? 99) - (FLOOR_ORDER[b] ?? 99));

  const availableFloors =
    Array.isArray(graph.floors) && graph.floors.length > 0
      ? graph.floors
      : derivedFloors.length > 0
      ? derivedFloors
      : Object.keys(FLOOR_ORDER);

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
    clearRoute,
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

    // Emergency 2.0 System exports
    emergency,
    setEmergency,
    emergencyStatus,
    setEmergencyStatus,
    emergencyExits,
    assemblyPoints,
    isSimulationMode,
    setIsSimulationMode,
    activeGuidedUsers,
    setActiveGuidedUsers,
    pushSubscribed,
    setPushSubscribed,
    pushPermission,
    setPushPermission,

    // Voice Assistant exports
    voiceActive,
    voiceSpeaking,
    voicePaused,
    autoAdvanceVoice,
    setAutoAdvanceVoice,
    currentStepIndex,
    setCurrentStepIndex,
    startVoiceGuidance,
    stopVoiceGuidance,
    pauseVoiceGuidance,
    resumeVoiceGuidance,
    repeatVoiceInstruction,
    nextVoiceStep,
    prevVoiceStep,
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
