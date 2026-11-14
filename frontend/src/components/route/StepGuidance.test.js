import React from 'react';
import { render, screen } from '@testing-library/react';
import StepGuidance from './StepGuidance';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

jest.mock('../../hooks/useEvacuation', () => ({
  useEvacuation: jest.fn(),
}));

jest.mock('../../hooks/useSimulation', () => ({
  useSimulation: jest.fn(),
}));

describe('StepGuidance Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders zero-distance step when occupant is already at the exit', () => {
    const mockRoute = {
      distance: 0,
      path: ['GF-E-MAIN'],
      target_exit: { id: 'GF-E-MAIN', label: 'Main Entrance & Exit' },
      steps: [
        {
          step: 1,
          from: 'GF-E-MAIN',
          to: 'GF-E-MAIN',
          from_label: 'Main Entrance & Exit',
          to_label: 'Main Entrance & Exit',
          floor: 'Ground',
          to_floor: 'Ground',
          distance: 0,
          time_seconds: 0,
          type: 'exit',
          instruction: 'You are already at Main Entrance & Exit.',
        },
      ],
    };

    useEvacuation.mockReturnValue({
      route: mockRoute,
      displayedRoute: mockRoute,
      routeView: 'primary',
      setActiveFloor: jest.fn(),
      setRouteView: jest.fn(),
    });

    useSimulation.mockReturnValue({
      simState: 'idle',
      simStepIndex: 0,
      resetSimulationPlayback: jest.fn(),
    });

    render(<StepGuidance />);

    expect(screen.getByText('Turn-by-Turn Evacuation Guidance')).toBeInTheDocument();
    expect(screen.getByText('You are already at Main Entrance & Exit.')).toBeInTheDocument();
  });

  test('returns null when route distance is negative (blocked/unreachable)', () => {
    const blockedRoute = {
      distance: -1,
      path: [],
      steps: [],
    };

    useEvacuation.mockReturnValue({
      route: blockedRoute,
      displayedRoute: blockedRoute,
      routeView: 'primary',
      setActiveFloor: jest.fn(),
      setRouteView: jest.fn(),
    });

    useSimulation.mockReturnValue({
      simState: 'idle',
      simStepIndex: 0,
      resetSimulationPlayback: jest.fn(),
    });

    const { container } = render(<StepGuidance />);
    expect(container.firstChild).toBeNull();
  });
});
