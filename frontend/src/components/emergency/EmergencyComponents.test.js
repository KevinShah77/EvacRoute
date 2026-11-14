import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmergencyAlert from './EmergencyAlert';
import VoiceNavigationPanel from '../voice/VoiceNavigationPanel';
import EmergencyControlPanel from '../admin/EmergencyControlPanel';
import { useEvacuation } from '../../hooks/useEvacuation';
import * as api from '../../services/api';

jest.mock('../../hooks/useEvacuation', () => ({
  useEvacuation: jest.fn(),
}));

jest.mock('../../services/api');

describe('EvacRoute 2.0 Emergency UI Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EmergencyAlert Component', () => {
    const mockEmergency = {
      id: 'EMG-TEST-001',
      type: 'fire',
      severity: 'critical',
      building: 'Block A',
      floor: 'Floor 2',
      location: 'F2-201',
      is_simulation: true,
    };

    test('renders nothing when emergencyStatus is normal', () => {
      useEvacuation.mockReturnValue({
        emergency: null,
        emergencyStatus: 'normal',
      });

      const { container } = render(<EmergencyAlert />);
      expect(container.firstChild).toBeNull();
    });

    test('renders prominent alert banner with emergency type, floor, and location', () => {
      useEvacuation.mockReturnValue({
        emergency: mockEmergency,
        emergencyStatus: 'emergency_active',
        setActiveTab: jest.fn(),
        startVoiceGuidance: jest.fn(),
        route: null,
        calculateRoute: jest.fn().mockResolvedValue({ distance: 20 }),
        startNode: 'F2-201',
        accessibleOnly: false,
        showToast: jest.fn(),
        pushPermission: 'default',
        pushSubscribed: true,
        setPushSubscribed: jest.fn(),
      });

      render(<EmergencyAlert />);

      expect(screen.getByText(/EMERGENCY ALERT/i)).toBeInTheDocument();
      expect(screen.getByText(/FIRE DETECTED/i)).toBeInTheDocument();
      expect(screen.getByText(/Floor 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Block A/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Open Evacuation Map & Voice Guidance/i })
      ).toBeInTheDocument();
    });

    test('clicking Open Evacuation Map triggers tab change and guidance', async () => {
      const mockSetActiveTab = jest.fn();
      const mockStartVoiceGuidance = jest.fn();
      const mockCalculateRoute = jest.fn().mockResolvedValue({ distance: 20, steps: [] });

      useEvacuation.mockReturnValue({
        emergency: mockEmergency,
        emergencyStatus: 'emergency_active',
        setActiveTab: mockSetActiveTab,
        startVoiceGuidance: mockStartVoiceGuidance,
        route: null,
        calculateRoute: mockCalculateRoute,
        startNode: 'F2-201',
        accessibleOnly: false,
        showToast: jest.fn(),
        pushPermission: 'default',
        pushSubscribed: true,
        setPushSubscribed: jest.fn(),
      });

      render(<EmergencyAlert />);

      const openBtn = screen.getByRole('button', {
        name: /Open Evacuation Map & Voice Guidance/i,
      });
      fireEvent.click(openBtn);

      expect(mockSetActiveTab).toHaveBeenCalledWith('emergency-map');
      await waitFor(() => {
        expect(mockCalculateRoute).toHaveBeenCalled();
        expect(mockStartVoiceGuidance).toHaveBeenCalled();
      });
    });
  });

  describe('VoiceNavigationPanel Component', () => {
    const mockRoute = {
      distance: 35,
      steps: [
        {
          step: 1,
          from: 'F2-201',
          to: 'F2-C-N',
          from_label: 'Room 201',
          to_label: 'North Corridor',
          floor: 'Floor 2',
          distance: 10,
          type: 'walk',
          instruction: 'Exit Room 201 and walk 10m north toward North Corridor.',
        },
        {
          step: 2,
          from: 'F2-C-N',
          to: 'GF-E-MAIN',
          from_label: 'North Corridor',
          to_label: 'Main Exit',
          floor: 'Floor 2',
          distance: 25,
          type: 'exit',
          instruction: 'Proceed 25m to exit via Main Exit.',
        },
      ],
      target_exit: { id: 'GF-E-MAIN', label: 'Main Entrance & Exit' },
      assembly_point: {
        id: 'ASSEMBLY-MAIN',
        label: 'Safe Assembly Point 1 (East Lawn)',
        distance: 15,
      },
    };

    test('renders turn-by-turn guidance panel with current step instruction', () => {
      useEvacuation.mockReturnValue({
        route: mockRoute,
        voiceActive: false,
        voiceSpeaking: false,
        voicePaused: false,
        currentStepIndex: 0,
        startVoiceGuidance: jest.fn(),
        stopVoiceGuidance: jest.fn(),
        pauseVoiceGuidance: jest.fn(),
        resumeVoiceGuidance: jest.fn(),
        repeatVoiceInstruction: jest.fn(),
        nextVoiceStep: jest.fn(),
        prevVoiceStep: jest.fn(),
        activeFloor: 'Floor 2',
        emergency: null,
      });

      render(<VoiceNavigationPanel />);

      expect(screen.getByText(/Voice Evacuation Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Exit Room 201 and walk 10m north toward North Corridor/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Voice/i })).toBeInTheDocument();
    });

    test('handles step advancement and voice controls', () => {
      const mockNextStep = jest.fn();
      const mockStartVoice = jest.fn();

      useEvacuation.mockReturnValue({
        route: mockRoute,
        voiceActive: false,
        voiceSpeaking: false,
        voicePaused: false,
        currentStepIndex: 0,
        startVoiceGuidance: mockStartVoice,
        stopVoiceGuidance: jest.fn(),
        pauseVoiceGuidance: jest.fn(),
        resumeVoiceGuidance: jest.fn(),
        repeatVoiceInstruction: jest.fn(),
        nextVoiceStep: mockNextStep,
        prevVoiceStep: jest.fn(),
        activeFloor: 'Floor 2',
        emergency: null,
      });

      render(<VoiceNavigationPanel />);

      const nextBtn = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextBtn);
      expect(mockNextStep).toHaveBeenCalled();

      const startVoiceBtn = screen.getByRole('button', { name: /Start Voice/i });
      fireEvent.click(startVoiceBtn);
      expect(mockStartVoice).toHaveBeenCalled();
    });

    test('renders Shelter in Place guidance when route distance is -1 (all exits blocked)', () => {
      useEvacuation.mockReturnValue({
        route: { distance: -1, safety_warning: 'All exits compromised.' },
        voiceActive: false,
        voiceSpeaking: false,
        voicePaused: false,
        currentStepIndex: 0,
        startVoiceGuidance: jest.fn(),
        stopVoiceGuidance: jest.fn(),
        pauseVoiceGuidance: jest.fn(),
        resumeVoiceGuidance: jest.fn(),
        repeatVoiceInstruction: jest.fn(),
        nextVoiceStep: jest.fn(),
        prevVoiceStep: jest.fn(),
        activeFloor: 'Floor 2',
        emergency: { id: 'EMG-01' },
      });

      render(<VoiceNavigationPanel />);

      expect(screen.getByText(/CRITICAL SAFETY ALERT: SHELTER IN PLACE/i)).toBeInTheDocument();
      expect(screen.getByText(/No safe exit route currently available from this location/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. Seal Doors/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Speak Safety Instructions/i })).toBeInTheDocument();
    });
  });

  describe('EmergencyControlPanel Component', () => {
    beforeEach(() => {
      api.getNotificationStats.mockResolvedValue({
        data: { total: 5, test_subscribers: 2, live_subscribers: 3, total_sent: 10 },
      });
      api.getEmergencyHistory.mockResolvedValue({
        data: { history: [] },
      });
      api.getSensorReadings.mockResolvedValue({
        data: { readings: [] },
      });
      api.getEmergencyStatus.mockResolvedValue({
        data: {
          available_exits: [{ id: 'GF-E-MAIN', label: 'Main Exit', floor: 'Ground', is_safe: true }],
          blocked_exits: [],
          active_hazards: [{ u: 'F2-C-N', v: 'F2-C-NE-1', type: 'fire' }],
          active_guided_users: 3,
        },
      });
    });

    test('renders emergency activation controls and simulation mode toggle', async () => {
      useEvacuation.mockReturnValue({
        emergency: null,
        emergencyStatus: 'normal',
        isSimulationMode: true,
        setIsSimulationMode: jest.fn(),
        availableFloors: ['Ground', 'Floor 1', 'Floor 2'],
        graph: { nodes: [] },
        loadData: jest.fn(),
        showToast: jest.fn(),
        pushSubscribed: true,
        setPushSubscribed: jest.fn(),
      });

      await React.act(async () => {
        render(<EmergencyControlPanel />);
      });

      expect(screen.getByText(/Safety Officer Emergency Dashboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Simulation \/ Demo Mode/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Live College Mode/i })).toBeInTheDocument();
      expect(screen.getByText(/Emergency Activation Controls/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Activate Emergency Response/i })
      ).toBeInTheDocument();
    });

    test('renders pending verification queue when emergency is reported', async () => {
      api.verifyEmergency.mockResolvedValue({ data: { status: 'success' } });

      useEvacuation.mockReturnValue({
        emergency: {
          id: 'EMG-REP-123',
          type: 'gas_leakage',
          building: 'Main Block',
          floor: 'Floor 1',
          location: 'Chemistry Lab',
          source: 'manual:guard_1',
          severity: 'high',
          description: 'Strong smell of gas',
        },
        emergencyStatus: 'emergency_reported',
        isSimulationMode: true,
        setIsSimulationMode: jest.fn(),
        availableFloors: ['Floor 1', 'Floor 2'],
        graph: { nodes: [] },
        loadData: jest.fn(),
        showToast: jest.fn(),
        pushSubscribed: true,
        setPushSubscribed: jest.fn(),
      });

      await React.act(async () => {
        render(<EmergencyControlPanel />);
      });

      expect(screen.getByText(/PENDING SAFETY OFFICER VERIFICATION/i)).toBeInTheDocument();
      expect(screen.getByText(/GAS LEAKAGE Incident at Main Block, Floor 1/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /Confirm & Activate Evacuation/i });
      await React.act(async () => {
        fireEvent.click(confirmBtn);
      });

      expect(api.verifyEmergency).toHaveBeenCalledWith(
        expect.objectContaining({ emergency_id: 'EMG-REP-123', confirmed: true })
      );
    });
  });
});
