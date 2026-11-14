import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useEvacuation } from './EvacuationContext';
import { APP_CONFIG } from '../config';

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const { displayedRoute, graph, setActiveFloor } = useEvacuation();

  const [simState, setSimState] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'completed'
  const [simSpeed, setSimSpeed] = useState(APP_CONFIG.DEFAULT_SIM_SPEED);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simStepProgress, setSimStepProgress] = useState(0);
  const stepIndexRef = useRef(0);
  const progressRef = useRef(0);
  const lastSimFloorRef = useRef(null);

  const resetSimulationPlayback = useCallback(() => {
    setSimState('idle');
    setSimStepIndex(0);
    setSimStepProgress(0);
    stepIndexRef.current = 0;
    progressRef.current = 0;
    lastSimFloorRef.current = null;
  }, []);

  // When displayed route changes or distance is invalid, reset simulation playback
  useEffect(() => {
    resetSimulationPlayback();
  }, [displayedRoute?.path, resetSimulationPlayback]);

  // Frame tick animation loop
  useEffect(() => {
    if (simState !== 'playing') return;
    const steps = displayedRoute?.steps;
    if (!steps || steps.length === 0) {
      setSimState('idle');
      return;
    }

    let rafId;
    let lastTs = performance.now();

    const tick = (now) => {
      const dtSec = (now - lastTs) / 1000;
      lastTs = now;

      const currentIdx = stepIndexRef.current;
      const currentStep = steps[currentIdx];
      if (!currentStep) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const realDuration = Math.max(currentStep.time_seconds || 4, 3);
      const simDuration = Math.max(realDuration / simSpeed, 0.55);
      const nextProg = progressRef.current + dtSec / simDuration;

      if (nextProg >= 1) {
        if (currentIdx + 1 < steps.length) {
          stepIndexRef.current = currentIdx + 1;
          progressRef.current = 0;
          setSimStepIndex(currentIdx + 1);
          setSimStepProgress(0);
          rafId = requestAnimationFrame(tick);
        } else {
          progressRef.current = 1;
          setSimStepProgress(1);
          setSimState('completed');
        }
      } else {
        progressRef.current = nextProg;
        setSimStepProgress(nextProg);
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [simState, simSpeed, displayedRoute]);

  // Floor switching sync during multi-floor egress
  useEffect(() => {
    if (simState !== 'playing' && simState !== 'completed') return;
    const steps = displayedRoute?.steps;
    if (!steps || !steps[simStepIndex]) return;

    const currentStep = steps[simStepIndex];
    const targetSimFloor =
      currentStep.floor !== currentStep.to_floor && simStepProgress >= 0.5
        ? currentStep.to_floor
        : currentStep.floor;

    if (targetSimFloor && lastSimFloorRef.current !== targetSimFloor) {
      lastSimFloorRef.current = targetSimFloor;
      setActiveFloor(targetSimFloor);
    }
  }, [simState, simStepIndex, simStepProgress, displayedRoute, setActiveFloor]);

  const toggleSimulation = useCallback(() => {
    if (!displayedRoute || !displayedRoute.steps?.length || displayedRoute.distance <= 0) return;

    if (simState === 'playing') {
      setSimState('paused');
      return;
    }

    if (simState === 'completed' || simState === 'idle') {
      setSimStepIndex(0);
      setSimStepProgress(0);
      stepIndexRef.current = 0;
      progressRef.current = 0;
      const firstFloor = displayedRoute.steps[0]?.floor;
      if (firstFloor) {
        lastSimFloorRef.current = firstFloor;
        setActiveFloor(firstFloor);
      }
    }
    setSimState('playing');
  }, [displayedRoute, simState, setActiveFloor]);

  // Compute animated avatar position and status
  const avatar = (() => {
    if (simState === 'idle') return null;
    const steps = displayedRoute?.steps;
    if (!steps || steps.length === 0) return null;

    const step = steps[simStepIndex];
    if (!step) return null;

    const fromNode = graph.nodes.find((n) => n.id === step.from);
    const toNode = graph.nodes.find((n) => n.id === step.to);
    if (!fromNode || !toNode) return null;

    const isVertical = step.floor !== step.to_floor;
    let floor = step.floor;
    let x = fromNode.x;
    let y = fromNode.y;
    let transitionStatus = null;

    if (isVertical) {
      if (simStepProgress < 0.5) {
        floor = step.floor;
        x = fromNode.x;
        y = fromNode.y;
        transitionStatus =
          step.type === 'elevator' ? `Lift → ${step.to_floor}` : `Stairs → ${step.to_floor}`;
      } else {
        floor = step.to_floor;
        x = toNode.x;
        y = toNode.y;
      }
    } else {
      x = fromNode.x + (toNode.x - fromNode.x) * simStepProgress;
      y = fromNode.y + (toNode.y - fromNode.y) * simStepProgress;
    }

    const completedTime = steps
      .slice(0, simStepIndex)
      .reduce((acc, s) => acc + (s.time_seconds || 0), 0);
    const elapsedSeconds = Math.round(
      completedTime + (step.time_seconds || 0) * simStepProgress
    );

    return {
      floor,
      x,
      y,
      step,
      elapsedSeconds,
      transitionStatus,
      isFinished: simState === 'completed',
    };
  })();

  const value = {
    simState,
    simSpeed,
    setSimSpeed,
    simStepIndex,
    simStepProgress,
    avatar,
    toggleSimulation,
    resetSimulationPlayback,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
