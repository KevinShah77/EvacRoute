import React from 'react';
import { render, screen } from '@testing-library/react';
import FloorMap from './FloorMap';
import { useEvacuation } from '../../hooks/useEvacuation';
import { useSimulation } from '../../hooks/useSimulation';

jest.mock('../../hooks/useEvacuation');
jest.mock('../../hooks/useSimulation');

describe('FloorMap Route-Specific and Hazard Brush Visualization', () => {
  const mockGraph = {
    nodes: [
      { id: 'F1-113', label: 'Room 113', floor: 'Floor 1', type: 'classroom', x: 20, y: 30 },
      { id: 'F1-C-EAST', label: 'East Corridor', floor: 'Floor 1', type: 'corridor', x: 40, y: 30 },
      { id: 'F1-S-SE', label: 'SE Stairs', floor: 'Floor 1', type: 'staircase', x: 60, y: 30 },
      { id: 'F1-LIFT-S', label: 'Lift', floor: 'Floor 1', type: 'elevator', x: 50, y: 50 },
    ],
    edges: [
      { source: 'F1-113', target: 'F1-C-EAST', weight: 10, hazard: null },
      { source: 'F1-C-EAST', target: 'F1-S-SE', weight: 15, hazard: 'fire' },
      { source: 'F1-C-EAST', target: 'F1-LIFT-S', weight: 12, hazard: null },
    ],
  };

  const mockRoutePrimary = {
    distance: 25,
    path: ['F1-113', 'F1-C-EAST', 'F1-S-SE'],
    edges: [['F1-113', 'F1-C-EAST'], ['F1-C-EAST', 'F1-S-SE']],
    steps: [
      { step: 1, from: 'F1-113', to: 'F1-C-EAST', floor: 'Floor 1', to_floor: 'Floor 1' },
      { step: 2, from: 'F1-C-EAST', to: 'F1-S-SE', floor: 'Floor 1', to_floor: 'Floor 1' },
    ],
    backup_route: {
      distance: 30,
      path: ['F1-113', 'F1-C-EAST', 'F1-LIFT-S'],
      edges: [['F1-113', 'F1-C-EAST'], ['F1-C-EAST', 'F1-LIFT-S']],
      steps: [
        { step: 1, from: 'F1-113', to: 'F1-C-EAST', floor: 'Floor 1', to_floor: 'Floor 1' },
        { step: 2, from: 'F1-C-EAST', to: 'F1-LIFT-S', floor: 'Floor 1', to_floor: 'Floor 1' },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSimulation.mockReturnValue({ avatar: null });
  });

  test('before selecting a route (activeSelection = null), default map renders without route flow lines', () => {
    useEvacuation.mockReturnValue({
      graph: mockGraph,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoutePrimary,
      routeView: 'primary',
      displayedRoute: mockRoutePrimary,
      activeSelection: null, // No active selection
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    // Node labels are visible
    expect(screen.getByText('START: Room 113')).toBeInTheDocument();
    // No animated directional flow lines should be rendered
    const flowLines = container.querySelectorAll('.evac-flow-primary, .evac-flow-backup');
    expect(flowLines.length).toBe(0);
  });

  test('when Primary Route is selected, displays only Primary flow lines and hides backup overlays', () => {
    useEvacuation.mockReturnValue({
      graph: mockGraph,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoutePrimary,
      routeView: 'primary',
      displayedRoute: mockRoutePrimary,
      activeSelection: { type: 'route', id: 'primary' },
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    const primaryFlow = container.querySelectorAll('.evac-flow-primary');
    const backupFlow = container.querySelectorAll('.evac-flow-backup');
    expect(primaryFlow.length).toBeGreaterThan(0);
    expect(backupFlow.length).toBe(0);
  });

  test('when Backup Route is selected, displays only Backup flow lines and hides primary overlays', () => {
    useEvacuation.mockReturnValue({
      graph: mockGraph,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoutePrimary,
      routeView: 'backup',
      displayedRoute: mockRoutePrimary.backup_route,
      activeSelection: { type: 'route', id: 'backup' },
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    const primaryFlow = container.querySelectorAll('.evac-flow-primary');
    const backupFlow = container.querySelectorAll('.evac-flow-backup');
    expect(primaryFlow.length).toBe(0);
    expect(backupFlow.length).toBeGreaterThan(0);
  });

  test('when Hazard Brush is selected, route flow lines are hidden and hazard edge is distinguishable', () => {
    useEvacuation.mockReturnValue({
      graph: mockGraph,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoutePrimary,
      routeView: 'primary',
      displayedRoute: mockRoutePrimary,
      activeSelection: { type: 'hazard', id: 'fire' },
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    // No route flow lines
    const flowLines = container.querySelectorAll('.evac-flow-primary, .evac-flow-backup');
    expect(flowLines.length).toBe(0);

    // Selected fire hazard label is distinguishable
    expect(screen.getAllByText(/FIRE/i).length).toBeGreaterThan(0);
  });
});
