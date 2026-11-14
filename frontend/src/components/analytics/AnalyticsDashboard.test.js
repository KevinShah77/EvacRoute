import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock FloorEvacuationGraph to prevent unhandled async lifecycle warnings in dashboard unit tests
jest.mock('./FloorEvacuationGraph', () => () => <div data-testid="floor-evacuation-graph-mock" />);

// Mock Recharts responsive container which needs DOM measurements
jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }) => <div style={{ width: 500, height: 300 }}>{children}</div>,
  };
});

describe('AnalyticsDashboard Component', () => {
  const mockStats = {
    hazard_counts: { fire: 1, smoke: 0, debris: 0 },
    analytics: {
      summary: {
        total_rooms: 2,
        reachable_rooms: 1,
        trapped_rooms: 1,
        avg_rset_seconds: 45,
        avg_rset_formatted: '45 sec',
        max_rset_seconds: 45,
        max_rset_formatted: '45 sec',
        slowest_room_label: 'Room 201 (Floor 2)',
      },
      room_evacuation_times: [
        {
          id: 'F2-201',
          label: 'Room 201',
          floor: 'Floor 2',
          distance: 25,
          time_seconds: 45,
          formatted_time: '45 sec',
          assigned_exit: 'Main Exit',
          reachable: true,
          hazards_crossed: 0,
        },
        {
          id: 'F2-202',
          label: 'Room 202',
          floor: 'Floor 2',
          distance: -1,
          time_seconds: 0,
          formatted_time: 'Trapped',
          assigned_exit: 'None',
          reachable: false,
          hazards_crossed: 0,
        },
      ],
      exit_utilization: [
        { id: 'GF-E-MAIN', name: 'Main Exit', rooms: 1, share_percent: 50, avg_rset_seconds: 45 },
        { id: 'TRAPPED', name: 'No Exit (Blocked)', rooms: 1, share_percent: 50, avg_rset_seconds: 0 },
      ],
      bottleneck_hubs: [
        { id: 'F2-HUB', name: 'Central Hall', type: 'corridor', load_percent: 50, route_count: 1 },
      ],
      bottleneck_corridors: [],
    },
  };

  test('renders safety officer header and KPI metrics', () => {
    render(<AnalyticsDashboard stats={mockStats} accessibleOnly={false} onInspectRoom={jest.fn()} />);

    expect(screen.getByText('Safety Officer Analytics')).toBeInTheDocument();
    expect(screen.getByText('Room Reachability')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText(/1 room\(s\) currently trapped!/i)).toBeInTheDocument();
    expect(screen.getByText('Average Building RSET')).toBeInTheDocument();
    expect(screen.getAllByText('45 sec').length).toBeGreaterThan(0);
  });

  test('renders room-by-room table and triggers inspect callback', () => {
    const onInspect = jest.fn();
    render(<AnalyticsDashboard stats={mockStats} accessibleOnly={false} onInspectRoom={onInspect} />);

    expect(screen.getByText('Room 201')).toBeInTheDocument();
    expect(screen.getByText('Room 202')).toBeInTheDocument();

    const inspectBtn = screen.getByRole('button', { name: /inspect/i });
    fireEvent.click(inspectBtn);
    expect(onInspect).toHaveBeenCalledWith(expect.objectContaining({ id: 'F2-201' }));
  });

  test('gracefully renders without crashing when summary is omitted', () => {
    const partialStats = {
      analytics: {
        room_evacuation_times: [],
        exit_utilization: [],
      },
    };
    render(<AnalyticsDashboard stats={partialStats} accessibleOnly={false} />);
    expect(screen.getByText('Safety Officer Analytics')).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
