import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';
import * as api from './services/api';

jest.mock('./services/api');

describe('EvacRoute App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getGraph.mockResolvedValue({
      data: {
        nodes: [
          { id: 'F2-201', label: 'Room 201', floor: 'Floor 2', x: 20, y: 30, type: 'classroom' },
          { id: 'GF-E-MAIN', label: 'Main Exit', floor: 'Ground', x: 50, y: 90, type: 'exit' },
        ],
        edges: [
          { source: 'F2-201', target: 'GF-E-MAIN', weight: 15.0, hazard: null },
        ],
        blocked: [],
        hazards: [],
        floors: ['Ground', 'Floor 1', 'Floor 2'],
      },
    });

    api.getAnalytics.mockResolvedValue({
      data: {
        total_vertices: 2,
        total_edges: 1,
        total_exits: 1,
        total_elevators: 0,
        blocked_pathways: 0,
        active_hazards: 0,
        hazard_counts: { fire: 0, smoke: 0, debris: 0 },
        floors: ['Ground', 'Floor 1', 'Floor 2'],
        analytics: {
          summary: {
            total_rooms: 1,
            reachable_rooms: 1,
            trapped_rooms: 0,
            avg_rset_seconds: 40,
            avg_rset_formatted: '40 sec',
            max_rset_seconds: 40,
            max_rset_formatted: '40 sec',
            slowest_room_label: 'Room 201 (Floor 2)',
          },
          room_evacuation_times: [],
          exit_utilization: [],
          bottleneck_hubs: [],
          bottleneck_corridors: [],
        },
      },
    });
  });

  test('renders EvacRoute heading and sidebar elements', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('EvacRoute')).toBeInTheDocument();
    expect(screen.getByText('Intelligent Evacuation Planner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /floor map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByText('Route Planner')).toBeInTheDocument();
    expect(screen.getByText('Interactive Floor Map')).toBeInTheDocument();
  });
});
