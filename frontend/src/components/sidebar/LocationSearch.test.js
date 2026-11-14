import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationSearch from './LocationSearch';
import { useEvacuation } from '../../hooks/useEvacuation';
import * as api from '../../services/api';

jest.mock('../../hooks/useEvacuation');
jest.mock('../../services/api');

describe('LocationSearch Room Number Input', () => {
  const mockSetStartLocation = jest.fn();
  const mockSetActiveFloor = jest.fn();
  const mockCalculateRoute = jest.fn();
  const mockShowToast = jest.fn();

  const mockGraph = {
    nodes: [
      { id: 'GF-001', label: 'Admin Office (001)', floor: 'Ground', type: 'classroom', accessible: true },
      { id: 'F1-113', label: 'Seminar Hall (113)', floor: 'Floor 1', type: 'classroom', accessible: true },
      { id: 'F2-201', label: 'Lecture Hall (201)', floor: 'Floor 2', type: 'classroom', accessible: true },
      { id: 'GF-E-MAIN', label: 'Main Exit', floor: 'Ground', type: 'exit', accessible: true },
    ],
    edges: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useEvacuation.mockReturnValue({
      graph: mockGraph,
      startNode: 'GF-001',
      targetNode: 'AUTO',
      accessibleOnly: false,
      setStartLocation: mockSetStartLocation,
      setActiveFloor: mockSetActiveFloor,
      calculateRoute: mockCalculateRoute,
      showToast: mockShowToast,
    });
  });

  test('renders Room Number input field with placeholder and Find Room button', () => {
    render(<LocationSearch />);

    expect(screen.getByLabelText(/Enter Room Number/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter room number \(e\.g\. 101\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Room/i })).toBeInTheDocument();
  });

  test('shows validation error when room number input is empty', async () => {
    render(<LocationSearch />);

    const findBtn = screen.getByRole('button', { name: /Find Room/i });
    fireEvent.click(findBtn);

    expect(await screen.findByText(/Please enter a room number/i)).toBeInTheDocument();
    expect(mockCalculateRoute).not.toHaveBeenCalled();
  });

  test('shows error when entered room does not exist', async () => {
    api.resolveRoom.mockRejectedValue(new Error('Room not found'));

    render(<LocationSearch />);

    const input = screen.getByPlaceholderText(/Enter room number \(e\.g\. 101\)/i);
    fireEvent.change(input, { target: { value: '999' } });

    const findBtn = screen.getByRole('button', { name: /Find Room/i });
    fireEvent.click(findBtn);

    expect(await screen.findByText(/Room "999" was not found in building graph/i)).toBeInTheDocument();
    expect(mockCalculateRoute).not.toHaveBeenCalled();
  });

  test('does not falsely match substring on single digit or partial number (e.g. 5)', async () => {
    api.resolveRoom.mockRejectedValue(new Error('Room not found'));

    render(<LocationSearch />);

    const input = screen.getByPlaceholderText(/Enter room number \(e\.g\. 101\)/i);
    fireEvent.change(input, { target: { value: '5' } });

    const findBtn = screen.getByRole('button', { name: /Find Room/i });
    fireEvent.click(findBtn);

    expect(await screen.findByText(/Room "5" was not found in building graph/i)).toBeInTheDocument();
    expect(mockCalculateRoute).not.toHaveBeenCalled();
  });

  test('finds valid room, resolves node, switches floor, and calculates route', async () => {
    api.resolveRoom.mockResolvedValue({
      data: {
        status: 'success',
        room: { id: 'F2-201', label: 'Lecture Hall (201)', floor: 'Floor 2', type: 'classroom', accessible: true },
      },
    });

    render(<LocationSearch />);

    const input = screen.getByPlaceholderText(/Enter room number \(e\.g\. 101\)/i);
    fireEvent.change(input, { target: { value: '201' } });

    const findBtn = screen.getByRole('button', { name: /Find Room/i });
    fireEvent.click(findBtn);

    await waitFor(() => {
      expect(mockSetStartLocation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'F2-201', floor: 'Floor 2' })
      );
      expect(mockSetActiveFloor).toHaveBeenCalledWith('Floor 2');
      expect(mockCalculateRoute).toHaveBeenCalledWith('F2-201', 'AUTO', false, true);
    });
  });

  test('resolves room via Enter key press', async () => {
    api.resolveRoom.mockResolvedValue({
      data: {
        status: 'success',
        room: { id: 'F1-113', label: 'Seminar Hall (113)', floor: 'Floor 1', type: 'classroom', accessible: true },
      },
    });

    render(<LocationSearch />);

    const input = screen.getByPlaceholderText(/Enter room number \(e\.g\. 101\)/i);
    fireEvent.change(input, { target: { value: '113' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockSetStartLocation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'F1-113' })
      );
    });
  });
});
