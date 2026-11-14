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

  test('when evacuation route is active, hides unselected corridors and dots while keeping primary route (emerald), backup route (amber), and hazards visible', () => {
    const mockGraphExtended = {
      nodes: [
        { id: 'F1-113', label: 'Room 113', floor: 'Floor 1', type: 'classroom', x: 20, y: 30 },
        { id: 'F1-C-EAST', label: 'East Corridor', floor: 'Floor 1', type: 'corridor', x: 40, y: 30 },
        { id: 'F1-S-SE', label: 'SE Stairs', floor: 'Floor 1', type: 'staircase', x: 60, y: 30 },
        { id: 'F1-LIFT-S', label: 'Lift', floor: 'Floor 1', type: 'elevator', x: 50, y: 50 },
        { id: 'F1-215', label: 'Room 215', floor: 'Floor 1', type: 'classroom', x: 10, y: 10 },
        { id: 'F1-C-NORTH', label: 'North Corridor', floor: 'Floor 1', type: 'corridor', x: 30, y: 10 },
        { id: 'F1-HAZ1', label: 'Hazard Alpha', floor: 'Floor 1', type: 'corridor', x: 80, y: 80 },
        { id: 'F1-HAZ2', label: 'Hazard Beta', floor: 'Floor 1', type: 'corridor', x: 85, y: 85 },
      ],
      edges: [
        { source: 'F1-113', target: 'F1-C-EAST', weight: 10, hazard: null },
        { source: 'F1-C-EAST', target: 'F1-S-SE', weight: 15, hazard: null },
        { source: 'F1-C-EAST', target: 'F1-LIFT-S', weight: 12, hazard: null },
        { source: 'F1-215', target: 'F1-C-NORTH', weight: 8, hazard: null },
        { source: 'F1-HAZ1', target: 'F1-HAZ2', weight: 6, hazard: 'smoke' },
      ],
    };

    useEvacuation.mockReturnValue({
      graph: mockGraphExtended,
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

    // Primary route nodes & backup nodes are visible
    expect(screen.getByText('START: Room 113')).toBeInTheDocument();
    expect(screen.getByText('SE Stairs')).toBeInTheDocument();
    expect(screen.getByText('Lift')).toBeInTheDocument();

    // Hazard edge & its endpoints remain visible
    expect(screen.getAllByText(/SMOKE/i).length).toBeGreaterThan(0);

    // Unselected room node (Room 215) must disappear completely
    expect(screen.queryByText('Room 215')).toBeNull();

    // Unselected edge (weight 8m) must disappear completely
    expect(screen.queryByText('8m')).toBeNull();

    // Primary route line has emerald green stroke
    const emeraldLines = container.querySelectorAll('line[stroke="#059669"]');
    expect(emeraldLines.length).toBeGreaterThan(0);

    // Backup route line has amber stroke
    const amberLines = container.querySelectorAll('line[stroke="#d97706"]');
    expect(amberLines.length).toBeGreaterThan(0);

    // Blueprint image remains rendered in background
    const bgImage = container.querySelector('image');
    expect(bgImage).toBeInTheDocument();
    expect(bgImage).toHaveAttribute('opacity', '0.85');
  });

  test('when no route is active (activeSelection = null), default map visualization is restored with all nodes and corridors', () => {
    const mockGraphExtended = {
      nodes: [
        { id: 'F1-113', label: 'Room 113', floor: 'Floor 1', type: 'classroom', x: 20, y: 30 },
        { id: 'F1-215', label: 'Room 215', floor: 'Floor 1', type: 'classroom', x: 10, y: 10 },
      ],
      edges: [
        { source: 'F1-113', target: 'F1-215', weight: 8, hazard: null },
      ],
    };

    useEvacuation.mockReturnValue({
      graph: mockGraphExtended,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: null,
      routeView: 'primary',
      displayedRoute: null,
      activeSelection: null,
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    render(<FloorMap />);

    // Both Room 113 and previously unselected Room 215 are rendered in default map view
    expect(screen.getByText('START: Room 113')).toBeInTheDocument();
    expect(screen.getByText('Room 215')).toBeInTheDocument();
    expect(screen.getByText('8m')).toBeInTheDocument();
  });

  test('Room 214 evacuation scenario: primary (emerald) and backup (amber) rendered, all other dots/lines disappear except hazards', () => {
    const mockFloor2Graph = {
      nodes: [
        { id: 'F2-214', label: 'Electronics HDL Lab (214)', floor: 'Floor 2', type: 'classroom', x: 25, y: 70 },
        { id: 'F2-C-WEST', label: 'West Corridor', floor: 'Floor 2', type: 'corridor', x: 35, y: 70 },
        { id: 'F2-S-SW', label: 'SW Stairs', floor: 'Floor 2', type: 'staircase', x: 35, y: 80 },
        { id: 'F2-C-SOUTH', label: 'South Corridor', floor: 'Floor 2', type: 'corridor', x: 50, y: 70 },
        { id: 'F2-S-SE', label: 'SE Stairs', floor: 'Floor 2', type: 'staircase', x: 65, y: 80 },
        { id: 'F2-217', label: 'Research Lab CET (217)', floor: 'Floor 2', type: 'classroom', x: 50, y: 20 },
        { id: 'F2-220', label: 'Library (220)', floor: 'Floor 2', type: 'classroom', x: 75, y: 25 },
        { id: 'F2-HAZ-A', label: 'Hazard Point A', floor: 'Floor 2', type: 'corridor', x: 80, y: 60 },
        { id: 'F2-HAZ-B', label: 'Hazard Point B', floor: 'Floor 2', type: 'corridor', x: 85, y: 60 },
      ],
      edges: [
        { source: 'F2-214', target: 'F2-C-WEST', weight: 12, hazard: null },
        { source: 'F2-C-WEST', target: 'F2-S-SW', weight: 10, hazard: null },
        { source: 'F2-C-WEST', target: 'F2-C-SOUTH', weight: 15, hazard: null },
        { source: 'F2-C-SOUTH', target: 'F2-S-SE', weight: 14, hazard: null },
        { source: 'F2-217', target: 'F2-220', weight: 20, hazard: null },
        { source: 'F2-HAZ-A', target: 'F2-HAZ-B', weight: 7, hazard: 'fire' },
      ],
    };

    const mockRoute214 = {
      distance: 22,
      path: ['F2-214', 'F2-C-WEST', 'F2-S-SW'],
      edges: [['F2-214', 'F2-C-WEST'], ['F2-C-WEST', 'F2-S-SW']],
      steps: [
        { step: 1, from: 'F2-214', to: 'F2-C-WEST', floor: 'Floor 2', to_floor: 'Floor 2' },
        { step: 2, from: 'F2-C-WEST', to: 'F2-S-SW', floor: 'Floor 2', to_floor: 'Floor 2' },
      ],
      backup_route: {
        distance: 41,
        path: ['F2-214', 'F2-C-WEST', 'F2-C-SOUTH', 'F2-S-SE'],
        edges: [['F2-214', 'F2-C-WEST'], ['F2-C-WEST', 'F2-C-SOUTH'], ['F2-C-SOUTH', 'F2-S-SE']],
        steps: [
          { step: 1, from: 'F2-214', to: 'F2-C-WEST', floor: 'Floor 2', to_floor: 'Floor 2' },
          { step: 2, from: 'F2-C-WEST', to: 'F2-C-SOUTH', floor: 'Floor 2', to_floor: 'Floor 2' },
          { step: 3, from: 'F2-C-SOUTH', to: 'F2-S-SE', floor: 'Floor 2', to_floor: 'Floor 2' },
        ],
      },
    };

    useEvacuation.mockReturnValue({
      graph: mockFloor2Graph,
      activeFloor: 'Floor 2',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoute214,
      routeView: 'primary',
      displayedRoute: mockRoute214,
      activeSelection: { type: 'route', id: 'primary' },
      availableFloors: ['Floor 2'],
      startNode: 'F2-214',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    // Start node and route endpoints are visible
    expect(screen.getByText('START: Electronics HDL Lab (214)')).toBeInTheDocument();
    expect(screen.getByText('SW Stairs')).toBeInTheDocument();
    expect(screen.getByText('SE Stairs')).toBeInTheDocument();

    // Fire hazard corridor remains visible
    expect(screen.getAllByText(/FIRE/i).length).toBeGreaterThan(0);

    // Unselected rooms (217, 220) and unselected edge (20m) disappear
    expect(screen.queryByText(/217/)).toBeNull();
    expect(screen.queryByText(/220/)).toBeNull();
    expect(screen.queryByText('20m')).toBeNull();

    // Primary route line in emerald green
    const emeraldLines = container.querySelectorAll('line[stroke="#059669"]');
    expect(emeraldLines.length).toBeGreaterThan(0);

    // Backup route line in amber
    const amberLines = container.querySelectorAll('line[stroke="#d97706"]');
    expect(amberLines.length).toBeGreaterThan(0);
  });

  test('inter-floor hazard edge keeps stair node visible on active floor', () => {
    const mockGraphWithInterFloorHazard = {
      nodes: [
        { id: 'F2-S-SW', label: 'SW Stairs', floor: 'Floor 2', type: 'staircase', x: 35, y: 80 },
        { id: 'F2-214', label: 'Room 214', floor: 'Floor 2', type: 'classroom', x: 25, y: 70 },
        { id: 'F1-S-SW', label: 'F1 Stairs', floor: 'Floor 1', type: 'staircase', x: 35, y: 80 },
      ],
      edges: [
        // Hazard connecting Floor 2 to Floor 1
        { source: 'F2-S-SW', target: 'F1-S-SW', weight: 10, hazard: 'debris' },
        { source: 'F2-214', target: 'F2-S-SW', weight: 12, hazard: null },
      ],
    };

    const mockRoutePrimary = {
      distance: 12,
      path: ['F2-214', 'F2-S-SW'],
      edges: [['F2-214', 'F2-S-SW']],
      steps: [{ step: 1, from: 'F2-214', to: 'F2-S-SW', floor: 'Floor 2', to_floor: 'Floor 2' }],
    };

    useEvacuation.mockReturnValue({
      graph: mockGraphWithInterFloorHazard,
      activeFloor: 'Floor 2',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: mockRoutePrimary,
      routeView: 'primary',
      displayedRoute: mockRoutePrimary,
      activeSelection: { type: 'route', id: 'primary' },
      availableFloors: ['Floor 2'],
      startNode: 'F2-214',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    render(<FloorMap />);

    // F2-S-SW has an incident hazard edge on inter-floor boundary and remains visible
    expect(screen.getByText('SW Stairs')).toBeInTheDocument();
  });

  test('hazard nodes display red stroke and fill in default map view', () => {
    const mockGraphHazard = {
      nodes: [
        { id: 'F1-HAZ1', label: 'Hazard Point', floor: 'Floor 1', type: 'corridor', x: 30, y: 30 },
        { id: 'F1-HAZ2', label: 'Hazard Target', floor: 'Floor 1', type: 'corridor', x: 40, y: 30 },
      ],
      edges: [
        { source: 'F1-HAZ1', target: 'F1-HAZ2', weight: 10, hazard: 'fire' },
      ],
    };

    useEvacuation.mockReturnValue({
      graph: mockGraphHazard,
      activeFloor: 'Floor 1',
      setActiveFloor: jest.fn(),
      blueprintOpacity: 0.85,
      route: null,
      routeView: 'primary',
      displayedRoute: null,
      activeSelection: null,
      availableFloors: ['Floor 1'],
      startNode: 'F1-113',
      applyCorridorHazard: jest.fn(),
      setStartLocation: jest.fn(),
    });

    const { container } = render(<FloorMap />);

    const redNodes = container.querySelectorAll('circle[fill="#ef4444"]');
    expect(redNodes.length).toBeGreaterThan(0);
  });
});
