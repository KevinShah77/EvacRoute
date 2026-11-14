import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  Wind,
  Hammer,
  Bell,
  ArrowRight,
  X,
  Volume2,
} from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import { registerPushSubscription } from '../../utils/pushNotification';

export default function EmergencyAlert() {
  const {
    emergency,
    emergencyStatus,
    setActiveTab,
    startVoiceGuidance,
    route,
    calculateRoute,
    startNode,
    accessibleOnly,
    showToast,
    pushSubscribed,
    setPushSubscribed,
  } = useEvacuation();

  const [dismissed, setDismissed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  if (!emergency || emergencyStatus === 'normal' || dismissed) {
    return null;
  }

  const isCritical = emergency.severity === 'critical';
  const isSimulation = emergency.is_simulation;

  const getEmergencyIcon = () => {
    switch (emergency.type) {
      case 'fire':
        return <Flame size={22} className="animate-pulse" />;
      case 'smoke':
        return <Wind size={22} />;
      case 'structural_damage':
        return <Hammer size={22} />;
      default:
        return <AlertTriangle size={22} className="animate-bounce" />;
    }
  };

  const handleOpenEmergencyMap = async () => {
    setActiveTab('emergency-map');
    let currentRoute = route;
    if (!currentRoute) {
      currentRoute = await calculateRoute(startNode, 'AUTO', accessibleOnly, true);
    }
    if (currentRoute) {
      startVoiceGuidance(currentRoute);
    }
  };

  const handleEnablePush = async () => {
    setSubscribing(true);
    try {
      await registerPushSubscription(true, 'student');
      setPushSubscribed(true);
      showToast('Push notifications successfully registered for emergency alerts.');
    } catch (e) {
      showToast(e.message || 'Notification permission was denied.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div
      className={`border-b shadow-lg text-white px-5 py-3 transition-colors ${
        isCritical ? 'bg-red-700 border-red-800' : 'bg-amber-600 border-amber-700'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Alert Title & Details */}
        <div className="flex items-center gap-3">
          <div className="bg-black/25 p-2 rounded-xl shrink-0">{getEmergencyIcon()}</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wide text-xs bg-black/30 px-2 py-0.5 rounded-md">
                {isSimulation ? '[SIMULATION] ' : ''}EMERGENCY ALERT
              </span>
              <span className="font-bold text-sm">
                {emergency.type?.replace('_', ' ').toUpperCase()} DETECTED
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                Severity: {emergency.severity?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-white/90 mt-0.5">
              Location: <strong>{emergency.building}</strong> — <strong>{emergency.floor}</strong> ({emergency.location}). Avoid affected zone immediately.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {!pushSubscribed && (
            <button
              onClick={handleEnablePush}
              disabled={subscribing}
              className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Bell size={13} /> {subscribing ? 'Subscribing...' : 'Enable Phone Alerts'}
            </button>
          )}

          <button
            onClick={handleOpenEmergencyMap}
            className="bg-white text-slate-900 hover:bg-slate-100 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
          >
            <Volume2 size={14} className="text-emerald-600" /> Open Evacuation Map & Voice Guidance{' '}
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss Banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
