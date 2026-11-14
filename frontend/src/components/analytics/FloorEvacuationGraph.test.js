import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FloorEvacuationGraph from './FloorEvacuationGraph';
import * as api from '../../services/api';

jest.mock('../../services/api');

describe('FloorEvacuationGraph Component', () => {
  const mockGraphData = {
    selected_floor: 'Floor 2',
    selected_entrance: { id: 'GF-E-MAIN', label: 'Main Entrance & Exit (SE)', floor: 'Ground' },
    available_floors: ['Ground', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'],
    available_entrances: [
      { id: 'GF-E-MAIN', label: 'Main Entrance & Exit (SE)', floor: 'Ground' },
      { id: 'GF-E-WEST', label: 'West Perimeter Exit', floor: 'Ground' },
      { id: 'GF-E-NORTH', label: 'North Perimeter Exit', floor: 'Ground' },
    ],
    accessible_mode: false,
    summary: {
      total_rooms: 2,
      reachable_rooms: 2,
      unreachable_rooms: 0,
      reachable_percent: 100,
      avg_rset_seconds: 40,
      avg_rset_formatted: '40 sec',
      shortest_room: { id: 'F2-201', label: 'Room 201', distance: 30, formatted_time: '35 sec' },
      longest_room: { id: 'F2-202', label: 'Room 202', distance: 45, formatted_time: '45 sec' },
      active_hazards_on_floor: 0,
    },
    rooms: [
      {
        id: 'F2-201',
        label: 'Lecture Hall (201)',
        floor: 'Floor 2',
        distance: 30,
        time_seconds: 35,
        formatted_time: '35 sec',
        path: ['F2-201', 'F2-C-WEST', 'F2-S-SE', 'GF-E-MAIN'],
        hazards_crossed: 0,
        reachable: true,
      },
      {
        id: 'F2-202',
        label: 'Lab (202)',
        floor: 'Floor 2',
        distance: 45,
        time_seconds: 45,
        formatted_time: '45 sec',
        path: ['F2-202', 'F2-C-EAST', 'F2-S-SE', 'GF-E-MAIN'],
        hazards_crossed: 0,
        reachable: true,
      },
    ],
    bottlenecks: {
      hubs: [{ id: 'F2-S-SE', label: 'South-East Stairs', route_count: 2, load_percent: 100 }],
      corridors: [],
    },
    nodes: [
      { id: 'F2-201', label: 'Lecture Hall (201)', floor: 'Floor 2', type: 'classroom', x: 20, y: 30, reachable: true },
      { id: 'F2-202', label: 'Lab (202)', floor: 'Floor 2', type: 'classroom', x: 40, y: 30, reachable: true },
      { id: 'F2-C-WEST', label: 'West Corridor', floor: 'Floor 2', type: 'corridor', x: 20, y: 50, reachable: true },
      { id: 'F2-S-SE', label: 'South-East Stairs', floor: 'Floor 2', type: 'staircase', x: 70, y: 60, reachable: true },
      { id: 'GF-E-MAIN', label: 'Main Entrance & Exit (SE)', floor: 'Ground', type: 'exit', x: 80, y: 70, reachable: true, is_target_entrance: true },
    ],
    edges: [
      { source: 'F2-201', target: 'F2-C-WEST', weight: 10, is_evacuation_path: true, route_count: 1 },
      { source: 'F2-202', target: 'F2-C-EAST', weight: 12, is_evacuation_path: true, route_count: 1 },
      { source: 'F2-S-SE', target: 'GF-E-MAIN', weight: 10, is_vertical_connector: true, is_evacuation_path: true, route_count: 2 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getFloorEvacuationGraph.mockResolvedValue({ data: mockGraphData });
  });

  test('renders floor selector and entrance selector buttons', async () => {
    render(<FloorEvacuationGraph initialGraphData={mockGraphData} />);

    expect(screen.getByText('Floor-Wise & Entrance-Wise Evacuation Graph Analysis')).toBeInTheDocument();
    expect(screen.getByText('Select Building Floor')).toBeInTheDocument();
    expect(screen.getByText('Select Target Evacuation Entrance / Exit')).toBeInTheDocument();

    // Verify all floors are present
    ['Ground', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'].forEach((f) => {
      expect(screen.getAllByRole('button', { name: new RegExp(f, 'i') }).length).toBeGreaterThan(0);
    });

    // Verify entrance buttons
    expect(screen.getByRole('button', { name: /Main Entrance & Exit/i })).toBeInTheDocument();
  });

  test('updates graph when changing selected floor and returning to initial floor', async () => {
    api.getFloorEvacuationGraph.mockImplementation(async (floor, entrance) => ({
      data: { ...mockGraphData, selected_floor: floor, selected_entrance: { id: entrance } },
    }));

    render(<FloorEvacuationGraph initialGraphData={mockGraphData} />);

    // Switch to Floor 3
    const floor3Btn = screen.getByRole('button', { name: 'Floor 3' });
    await act(async () => {
      fireEvent.click(floor3Btn);
    });

    await waitFor(() => {
      expect(api.getFloorEvacuationGraph).toHaveBeenCalledWith('Floor 3', 'GF-E-MAIN', false);
    });

    // Switch back to Floor 2 (the initial floor)
    const floor2Btn = screen.getByRole('button', { name: 'Floor 2' });
    await act(async () => {
      fireEvent.click(floor2Btn);
    });

    await waitFor(() => {
      expect(api.getFloorEvacuationGraph).toHaveBeenCalledWith('Floor 2', 'GF-E-MAIN', false);
    });
  });

  test('updates graph when changing selected entrance', async () => {
    render(<FloorEvacuationGraph initialGraphData={mockGraphData} />);

    const westEntranceBtn = screen.getByRole('button', { name: /West Perimeter Exit/i });
    await act(async () => {
      fireEvent.click(westEntranceBtn);
    });

    await waitFor(() => {
      expect(api.getFloorEvacuationGraph).toHaveBeenCalledWith('Floor 2', 'GF-E-WEST', false);
    });
  });

  test('displays summary reachability and room egress rows', () => {
    render(<FloorEvacuationGraph initialGraphData={mockGraphData} />);

    expect(screen.getByText('100% Floor Reachability')).toBeInTheDocument();
    expect(screen.getByText('40 sec')).toBeInTheDocument();
    expect(screen.getAllByText('South-East Stairs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lecture Hall (201)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lab (202)').length).toBeGreaterThan(0);
  });
});
