import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flame,
  AlertOctagon,
  Radio,
  CheckCircle2,
  Bell,
  Activity,
  History,
  Send,
  RefreshCw,
  Cpu,
  ChevronDown,
  ChevronUp,
  X,
  PlusCircle,
} from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import * as api from '../../services/api';
import { registerPushSubscription } from '../../utils/pushNotification';

export default function EmergencyControlPanel() {
  const {
    emergency,
    emergencyStatus,
    isSimulationMode,
    setIsSimulationMode,
    activeGuidedUsers,
    availableFloors,
    loadData,
    showToast,
    pushSubscribed,
    setPushSubscribed,
  } = useEvacuation();

  // Activation Form State
  const [emergencyType, setEmergencyType] = useState('fire');
  const [building, setBuilding] = useState('Main Academic Block');
  const [floor, setFloor] = useState('Floor 2');
  const [location, setLocation] = useState('F2-201');
  const [severity, setSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Stats State
  const [notifStats, setNotifStats] = useState({});
  const [historyList, setHistoryList] = useState([]);
  const [sensorReadings, setSensorReadings] = useState([]);
  const [liveStatusData, setLiveStatusData] = useState({
    available_exits: [],
    blocked_exits: [],
    active_hazards: [],
    active_guided_users: 0,
  });

  // Sensor Test Tool State
  const [sensorType, setSensorType] = useState('temperature');
  const [sensorValue, setSensorValue] = useState('85.0');
  const [sensorId, setSensorId] = useState('TEMP-F2-01');

  // Manual Report Modal State
  const [reportModal, setReportModal] = useState(false);
  const [reportType, setReportType] = useState('fire');
  const [reportFloor, setReportFloor] = useState('Floor 2');
  const [reportLocation, setReportLocation] = useState('F2-201');
  const [reportDesc, setReportDesc] = useState('');
  const [reporterName, setReporterName] = useState('Security Officer 1');

  // Manual Corridor Blocker State
  const [corridorU, setCorridorU] = useState('');
  const [corridorV, setCorridorV] = useState('');
  const [corridorHazardType, setCorridorHazardType] = useState('fire');

  // Confirmation Modals State
  const [confirmModal, setConfirmModal] = useState(null); // 'activate' | 'resolve' | null

  // Expandable History Audit Logs
  const [expandedLogId, setExpandedLogId] = useState(null);

  const refreshDashboardData = async () => {
    try {
      const [statsRes, histRes, sensRes, statusRes] = await Promise.all([
        api.getNotificationStats().catch(() => ({ data: {} })),
        api.getEmergencyHistory().catch(() => ({ data: { history: [] } })),
        api.getSensorReadings().catch(() => ({ data: { readings: [] } })),
        api.getEmergencyStatus().catch(() => ({ data: {} })),
      ]);
      setNotifStats(statsRes.data || {});
      setHistoryList(histRes.data?.history || []);
      setSensorReadings(sensRes.data?.readings || []);
      if (statusRes.data) {
        setLiveStatusData({
          available_exits: statusRes.data.available_exits || [],
          blocked_exits: statusRes.data.blocked_exits || [],
          active_hazards: statusRes.data.active_hazards || [],
          active_guided_users: statusRes.data.active_guided_users || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    refreshDashboardData();
    if (process.env.NODE_ENV !== 'test') {
      const interval = setInterval(refreshDashboardData, 8000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleActivateConfirmed = async () => {
    setIsSubmitting(true);
    setConfirmModal(null);
    try {
      await api.activateEmergency({
        emergency_type: emergencyType,
        building,
        floor,
        location,
        severity,
        description: description || `${emergencyType.toUpperCase()} reported on ${floor}, ${location}`,
        is_simulation: isSimulationMode,
      });
      await loadData();
      await refreshDashboardData();
      showToast('Emergency successfully activated. Broadcast sent.');
    } catch (e) {
      showToast(e.message || 'Failed to activate emergency.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveConfirmed = async () => {
    if (!emergency?.id) return;
    setIsSubmitting(true);
    setConfirmModal(null);
    try {
      await api.resolveEmergency({
        emergency_id: emergency.id,
        notes: 'Officially resolved by safety officer through control dashboard.',
      });
      await loadData();
      await refreshDashboardData();
      showToast('Emergency resolved. All clear notification dispatched.');
    } catch (e) {
      showToast(e.message || 'Failed to resolve emergency.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyReport = async (confirmed) => {
    if (!emergency?.id) return;
    setIsSubmitting(true);
    try {
      await api.verifyEmergency({
        emergency_id: emergency.id,
        confirmed: Boolean(confirmed),
        notes: confirmed
          ? 'Emergency verified by on-duty safety officer. Evacuation ordered.'
          : 'Dismissed as false alarm by safety officer.',
        admin_user: 'safety_officer',
      });
      await loadData();
      await refreshDashboardData();
      showToast(
        confirmed
          ? 'Incident verified! Evacuation activated across affected zones.'
          : 'Report dismissed as false alarm.'
      );
    } catch (e) {
      showToast(e.message || 'Failed to verify emergency.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportLocation.trim()) {
      showToast('Please specify the affected room or corridor.');
      return;
    }
    setIsSubmitting(true);
    setReportModal(false);
    try {
      await api.reportEmergency({
        emergency_type: reportType,
        building: 'Main Academic Block',
        floor: reportFloor,
        location: reportLocation.trim(),
        description: reportDesc || `Manual report by ${reporterName}`,
        reporter: reporterName || 'staff',
        severity: 'high',
        is_simulation: isSimulationMode,
      });
      await loadData();
      await refreshDashboardData();
      showToast('Incident report submitted. Awaiting safety officer verification.');
    } catch (e) {
      showToast(e.message || 'Failed to submit incident report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateHazardSpread = async () => {
    if (!emergency?.id) {
      showToast('No active emergency to spread hazard from.');
      return;
    }
    try {
      await api.updateEmergency({
        emergency_id: emergency.id,
        blocked_corridors: [['F2-C-N', 'F2-C-NE-1']],
        severity: 'critical',
        description: 'Hazard spread: corridor F2-C-N to F2-C-NE-1 is now impassable.',
      });
      await loadData();
      await refreshDashboardData();
      showToast('Simulated hazard spread: routes dynamically updating!');
    } catch (e) {
      showToast(e.message || 'Failed to update hazard.');
    }
  };

  const handleManualCorridorBlock = async () => {
    if (!corridorU.trim() || !corridorV.trim()) {
      showToast('Please specify both corridor endpoint node IDs (u and v).');
      return;
    }
    try {
      if (emergency?.id) {
        await api.updateEmergency({
          emergency_id: emergency.id,
          additional_hazards: [
            { u: corridorU.trim(), v: corridorV.trim(), type: corridorHazardType },
          ],
        });
      } else {
        await api.simulateBlockage(corridorU.trim(), corridorV.trim(), corridorHazardType);
      }
      setCorridorU('');
      setCorridorV('');
      await loadData();
      await refreshDashboardData();
      showToast(`Corridor ${corridorU} ↔ ${corridorV} marked as hazardous.`);
    } catch (e) {
      showToast(e.message || 'Failed to block corridor.');
    }
  };

  const handleClearCorridor = async (u, v) => {
    try {
      if (emergency?.id) {
        await api.updateEmergency({
          emergency_id: emergency.id,
          cleared_corridors: [[u, v]],
        });
      } else {
        await api.simulateBlockage(u, v, 'clear');
      }
      await loadData();
      await refreshDashboardData();
      showToast(`Corridor ${u} ↔ ${v} cleared and restored to safe.`);
    } catch (e) {
      showToast(e.message || 'Failed to clear corridor.');
    }
  };

  const handleSendSensorReading = async () => {
    try {
      const res = await api.sendSensorData({
        sensor_id: sensorId,
        sensor_type: sensorType,
        value: parseFloat(sensorValue),
        building,
        floor,
        location,
        is_simulation: isSimulationMode,
      });
      await refreshDashboardData();
      await loadData();
      const status = res.data?.status;
      if (status === 'triggered') {
        showToast('Sensor reading above threshold! Emergency response triggered.');
      } else if (status === 'rate_limited') {
        showToast('Sensor trigger rate-limited (deduplication active).');
      } else {
        showToast('Sensor telemetry recorded: within normal limits.');
      }
    } catch (e) {
      showToast(e.message || 'Sensor request failed.');
    }
  };

  const handleRegisterDevicePush = async () => {
    try {
      await registerPushSubscription(isSimulationMode, 'safety_officer');
      setPushSubscribed(true);
      await refreshDashboardData();
      showToast('This device registered for emergency push notifications.');
    } catch (e) {
      showToast(e.message || 'Push permission was denied.');
    }
  };

  const handleSendTestPush = async () => {
    try {
      const res = await api.sendTestNotification({
        title: '[SIMULATION] EVACROUTE TEST BROADCAST',
        message: 'Campus emergency notification delivery test. Voice navigation system operational.',
      });
      await refreshDashboardData();
      showToast(`Test broadcast sent to ${res.data?.sent_count || 0} subscriber(s).`);
    } catch (e) {
      showToast(e.message || 'Test broadcast failed.');
    }
  };

  const isEmergencyActive = emergencyStatus === 'emergency_active';
  const isEmergencyPending =
    emergencyStatus === 'emergency_reported' || emergencyStatus === 'emergency_verification';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar with Mode Switcher & Quick Manual Report Trigger */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={28} className="text-red-500 shrink-0" />
            <h2 className="text-2xl font-bold tracking-tight">Safety Officer Emergency Dashboard</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time emergency activation, physical sensor telemetry, push dispatch, and hazard management.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setReportModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow flex items-center gap-1.5"
            title="Manual incident report from security personnel or staff"
          >
            <Radio size={14} /> Report Incident
          </button>

          {/* Mode Selector Toggle: Simulation Mode vs Live Mode */}
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => setIsSimulationMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSimulationMode
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulation / Demo Mode
            </button>
            <button
              onClick={() => setIsSimulationMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isSimulationMode
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live College Mode
            </button>
          </div>
        </div>
      </div>

      {/* Pending Incident Verification Banner (Req 1.A.3 & 1.C) */}
      {isEmergencyPending && emergency && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-2 border-amber-500 rounded-2xl p-5 text-white shadow-xl animate-in zoom-in-95">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                  <AlertOctagon size={14} /> PENDING SAFETY OFFICER VERIFICATION
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {emergency.id}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-2">
                {emergency.type?.replace('_', ' ').toUpperCase()} Incident at {emergency.building}, {emergency.floor} ({emergency.location})
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Reported by: <strong className="text-amber-300">{emergency.source}</strong> · Severity: <strong>{emergency.severity?.toUpperCase()}</strong>
                {emergency.description ? ` · Notes: "${emergency.description}"` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => handleVerifyReport(true)}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Flame size={14} /> Confirm & Activate Evacuation
              </button>
              <button
                onClick={() => handleVerifyReport(false)}
                disabled={isSubmitting}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                Dismiss (False Alarm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Radio size={18} className="text-amber-400" /> Manual Incident Report (Staff / Security)
              </h3>
              <button
                onClick={() => setReportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Emergency Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="fire">Fire Incident</option>
                  <option value="smoke">Heavy Smoke Dispersion</option>
                  <option value="gas_leakage">Hazardous Gas Leakage</option>
                  <option value="structural_damage">Structural Damage / Debris</option>
                  <option value="blocked_route">Blocked Evacuation Corridor</option>
                  <option value="general">General Campus Emergency</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Affected Floor</label>
                  <select
                    value={reportFloor}
                    onChange={(e) => setReportFloor(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {availableFloors.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Location / Room</label>
                  <input
                    type="text"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    placeholder="e.g. F2-201, West Stair"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Reporter Identity</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g. Security Officer 1"
                  className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe observed smoke, fire, or hazards..."
                  className="w-full text-xs font-semibold p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-800 pt-3">
              <button
                onClick={() => setReportModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
              >
                Submit Emergency Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertOctagon size={28} />
              <h3 className="text-lg font-bold">
                {confirmModal === 'activate' ? 'Confirm Emergency Activation' : 'Confirm Emergency Resolution'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {confirmModal === 'activate'
                ? `Are you sure you want to activate a ${severity.toUpperCase()} ${emergencyType.toUpperCase()} emergency for ${building}, ${floor} (${location})? This will broadcast emergency alerts to all registered user devices and initiate evacuation guidance.`
                : 'Are you sure you want to mark this emergency as RESOLVED? This will clear all hazards and send an All-Clear broadcast to all occupants.'}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              {confirmModal === 'activate' ? (
                <button
                  onClick={handleActivateConfirmed}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
                >
                  {isSubmitting ? 'Activating...' : 'Yes, Activate Emergency'}
                </button>
              ) : (
                <button
                  onClick={handleResolveConfirmed}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
                >
                  {isSubmitting ? 'Resolving...' : 'Yes, Resolve (All Clear)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Status and Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Emergency Status
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isEmergencyActive
                  ? 'bg-red-600 animate-ping'
                  : isEmergencyPending
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-lg font-bold text-slate-900 capitalize">
              {emergencyStatus.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isEmergencyActive
              ? `Type: ${emergency?.type} (${emergency?.floor})`
              : isEmergencyPending
              ? 'Pending Officer Verification'
              : 'Building status normal'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Push Subscribers
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {notifStats.total || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {notifStats.test_subscribers || 0} test devices · {notifStats.live_subscribers || 0} live
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Broadcasts Sent
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {notifStats.total_sent || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Failures: {notifStats.total_failed || 0}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Active Guided Users
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">
            {liveStatusData.active_guided_users ?? activeGuidedUsers ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live occupants following guidance</p>
        </div>
      </div>

      {/* Emergency Control Center & Sensor Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Activation & Live Action Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Activation Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Radio size={18} className="text-red-600" /> Emergency Activation Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Emergency Type
                </label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fire">Fire Emergency</option>
                  <option value="smoke">Heavy Smoke Dispersion</option>
                  <option value="gas_leakage">Hazardous Gas Leakage</option>
                  <option value="structural_damage">Structural Damage / Debris</option>
                  <option value="blocked_route">Blocked Evacuation Corridor</option>
                  <option value="general">General Campus Emergency</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="critical">Critical (Immediate Evacuation)</option>
                  <option value="high">High (Urgent Egress)</option>
                  <option value="medium">Medium (Precautionary)</option>
                  <option value="low">Low (Advisory Notice)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Building & Floor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                    placeholder="Building"
                  />
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {availableFloors.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Exact Location / Room / Node
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. F2-201, Chemistry Lab, Corridor 3"
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Incident Description & Safety Advisory
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief situational notes for campus occupants and voice instructions..."
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {!isEmergencyActive ? (
                  <button
                    onClick={() => setConfirmModal('activate')}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <Flame size={15} /> Activate Emergency Response
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmModal('resolve')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle2 size={15} /> Resolve Emergency (All Clear)
                    </button>

                    <button
                      onClick={handleSimulateHazardSpread}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <Flame size={14} /> Simulate Fire Spreading
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendTestPush}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Send size={13} /> Test Notification
                </button>
                {!pushSubscribed && (
                  <button
                    onClick={handleRegisterDevicePush}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow"
                  >
                    <Bell size={13} /> Register My Device
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Monitoring: Exits Status & Blocked Corridors (Req 7.B) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CheckCircle2 size={18} className="text-emerald-600" /> Live Campus Exits & Corridor Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Exits Status */}
              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Building Exits ({liveStatusData.available_exits?.length || 0} Safe)
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(liveStatusData.available_exits || [])
                    .concat(liveStatusData.blocked_exits || [])
                    .map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800">
                          {ex.label || ex.id} ({ex.floor})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ex.is_safe ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ex.is_safe ? 'Safe' : 'Blocked'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Active Hazards & Blocked Corridors */}
              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Active Hazard Corridors ({liveStatusData.active_hazards?.length || 0})
                </span>
                {!liveStatusData.active_hazards || liveStatusData.active_hazards.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No active corridor hazards.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {liveStatusData.active_hazards.map((hz, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">
                            {hz.u} ↔ {hz.v}
                          </span>
                          <span className="text-slate-400 block text-[10px] capitalize">
                            Type: {hz.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleClearCorridor(hz.u, hz.v)}
                          className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold px-2 py-1 rounded text-[10px] border transition-colors"
                          title="Mark corridor safe"
                        >
                          Mark Safe
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Corridor Blocker Control */}
            <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row items-center gap-3">
              <span className="text-xs font-bold text-slate-600 shrink-0">Block / Set Hazard:</span>
              <input
                type="text"
                placeholder="Node U (e.g. F2-C-N)"
                value={corridorU}
                onChange={(e) => setCorridorU(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg flex-1"
              />
              <input
                type="text"
                placeholder="Node V (e.g. F2-C-NE-1)"
                value={corridorV}
                onChange={(e) => setCorridorV(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg flex-1"
              />
              <select
                value={corridorHazardType}
                onChange={(e) => setCorridorHazardType(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="fire">Fire</option>
                <option value="smoke">Smoke</option>
                <option value="gas_leakage">Gas Leak</option>
                <option value="structural_damage">Structural Damage</option>
                <option value="blocked_route">Blocked</option>
              </select>
              <button
                onClick={handleManualCorridorBlock}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1"
              >
                <PlusCircle size={13} /> Apply Hazard
              </button>
            </div>
          </div>

          {/* Audit Log and Emergency History (Req 7.C) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Emergency Incident History & Audit Trail
              </h3>
              <button
                onClick={refreshDashboardData}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                title="Refresh History"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {historyList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No past emergency events recorded in audit log.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Activated At</th>
                      <th className="py-2.5 px-3">Resolved At</th>
                      <th className="py-2.5 px-3 text-right">Audit Trail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyList.map((item) => {
                      const isExpanded = expandedLogId === item.id;
                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                              {item.id}
                            </td>
                            <td className="py-2 px-3 capitalize font-bold text-slate-700">
                              {item.type}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {item.floor}, {item.location}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.source}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {item.created_at ? new Date(item.created_at).toLocaleTimeString() : '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {item.resolved_at ? new Date(item.resolved_at).toLocaleTimeString() : 'Active'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] inline-flex items-center gap-0.5"
                              >
                                {isExpanded ? 'Hide Logs' : 'View Actions'}{' '}
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/80 p-3">
                                <div className="space-y-1 text-[11px]">
                                  <span className="font-bold text-slate-700 block uppercase tracking-wider mb-1">
                                    Administrative Actions Log ({item.actions_log?.length || 0} events):
                                  </span>
                                  {(!item.actions_log || item.actions_log.length === 0) ? (
                                    <p className="text-slate-400">No detailed actions recorded.</p>
                                  ) : (
                                    item.actions_log.map((act, aIdx) => (
                                      <div key={aIdx} className="flex items-start gap-2 text-slate-600">
                                        <span className="font-mono text-slate-400 shrink-0">
                                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : '—'}
                                        </span>
                                        <span className="font-bold text-slate-800 shrink-0">
                                          [{act.action}]
                                        </span>
                                        <span className="text-slate-500 shrink-0">({act.actor}):</span>
                                        <span className="text-slate-700">{act.details}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Physical Sensor Testing & Telemetry Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Cpu size={18} className="text-purple-600" /> Physical IoT Sensor Integration
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Test authenticated sensor telemetry ingestion and false-alarm protection with calibrated thresholds.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sensor ID</label>
                <input
                  type="text"
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                  className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Sensor Type</label>
                <select
                  value={sensorType}
                  onChange={(e) => {
                    setSensorType(e.target.value);
                    if (e.target.value === 'temperature') setSensorValue('85.0');
                    else if (e.target.value === 'smoke') setSensorValue('75.0');
                    else if (e.target.value === 'gas') setSensorValue('65.0');
                  }}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="temperature">Temperature (°C - Thresh: 57°)</option>
                  <option value="smoke">Smoke Detector (% - Thresh: 35%)</option>
                  <option value="gas">Hazardous Gas Sensor (ppm - Thresh: 50)</option>
                  <option value="structural">Structural Vibration Sensor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Telemetry Value</label>
                <input
                  type="number"
                  step="0.5"
                  value={sensorValue}
                  onChange={(e) => setSensorValue(e.target.value)}
                  className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleSendSensorReading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition-colors flex justify-center items-center gap-1.5"
              >
                <Activity size={14} /> Submit Sensor Reading
              </button>
            </div>
          </div>

          {/* Recent Sensor Readings Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Recent Sensor Telemetry
            </h4>
            {sensorReadings.length === 0 ? (
              <p className="text-xs text-slate-400">No sensor events recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {sensorReadings.slice(0, 5).map((r, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{r.sensor_id}</span>
                      <span className="text-slate-400 block">
                        {r.sensor_type}: {r.value}
                      </span>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        r.exceeds_threshold
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {r.exceeds_threshold ? 'Triggered' : 'Normal'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
