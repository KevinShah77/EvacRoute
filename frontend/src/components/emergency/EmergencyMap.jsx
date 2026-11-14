import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Search,
  CheckCircle2,
  Layers,
  Flag,
} from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import VoiceNavigationPanel from '../voice/VoiceNavigationPanel';
import FloorMap from '../map/FloorMap';
import * as api from '../../services/api';

export default function EmergencyMap() {
  const {
    emergency,
    route,
    setStartLocation,
    activeFloor,
    setActiveFloor,
    availableFloors,
    calculateRoute,
    accessibleOnly,
    showToast,
    isSimulationMode,
  } = useEvacuation();

  const [roomQuery, setRoomQuery] = useState('');
  const [roomErr, setRoomErr] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleRoomLookup = async () => {
    const q = roomQuery.trim();
    if (!q) {
      setRoomErr('Please enter your room number.');
      return;
    }
    setSearching(true);
    setRoomErr(null);

    try {
      const res = await api.resolveRoom(q);
      const room = res.data?.room;
      if (room) {
        await setStartLocation(room);
        if (room.floor) {
          setActiveFloor(room.floor);
        }
        await calculateRoute(room.id, 'AUTO', accessibleOnly, true);
        showToast(`Occupant location set to ${room.label}`);
        setRoomQuery('');
      } else {
        setRoomErr(`Room "${q}" not found. Select your room manually.`);
      }
    } catch (e) {
      setRoomErr(`Room "${q}" not found in building graph.`);
    } finally {
      setSearching(false);
    }
  };

  const targetExit = route?.target_exit;
  const targetAssembly = route?.assembly_point;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Emergency Status & Voice Guidance Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border border-red-500/40 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1.5 shadow-sm">
                <ShieldAlert size={14} />{' '}
                {isSimulationMode ? 'SIMULATED EMERGENCY ACTIVE' : 'ACTIVE EMERGENCY RESPONSE'}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {emergency?.id || 'EMG-BROADCAST'}
              </span>
              <span className="text-xs bg-red-900/60 text-red-300 font-semibold px-2 py-0.5 rounded">
                Severity: {emergency?.severity?.toUpperCase() || 'HIGH'}
              </span>
            </div>

            <h2 className="text-xl lg:text-2xl font-black text-white mt-2 flex items-center gap-2">
              Tactical Evacuation Floor Map
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 mt-0.5">
              Live hazard-aware routing active. Follow the green route to safely egress towards designated exits and outdoor assembly points.
            </p>
          </div>

          {/* Quick Exit & Assembly Status */}
          <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl flex items-center gap-4 text-xs shrink-0">
            <div>
              <span className="text-slate-400 block font-medium">Assigned Exit:</span>
              {route?.distance === -1 ? (
                <span className="font-bold text-red-400 flex items-center gap-1">
                  <ShieldAlert size={13} /> Blocked · Shelter in Place
                </span>
              ) : (
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {targetExit?.label || 'Calculating Safe Exit...'}
                </span>
              )}
            </div>
            {targetAssembly && route?.distance !== -1 && (
              <div className="border-l border-slate-700 pl-4">
                <span className="text-slate-400 block font-medium">Assembly Point:</span>
                <span className="font-bold text-teal-300 flex items-center gap-1">
                  <Flag size={13} /> {targetAssembly.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Assistant Google Maps Style Guidance Panel */}
      <VoiceNavigationPanel />

      {/* Location Declaration & Fast Floor Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Room Number Fast Input */}
        <div className="w-full md:w-auto flex-1 max-w-md">
          <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
            <MapPin size={13} className="text-blue-600" /> Enter Your Exact Room Number:
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={roomQuery}
                onChange={(e) => setRoomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRoomLookup()}
                placeholder="e.g. 201, 101, F2-201"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleRoomLookup}
              disabled={searching}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
            >
              <Search size={13} /> {searching ? 'Locating...' : 'Set Location'}
            </button>
          </div>
          {roomErr && <p className="text-[11px] text-red-600 font-semibold mt-1">{roomErr}</p>}
        </div>

        {/* Floor Quick Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Layers size={13} /> Floor:
          </span>
          {availableFloors.map((floor) => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeFloor === floor
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Tactical Floor Map */}
      <FloorMap />

      {/* Legend & Safety Disclaimer Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Tactical Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shadow" /> Active Danger Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Slow/Smoke Zone
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Recommended Route
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" /> Blocked Corridor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Your Location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-400 inline-block" /> Safe Assembly Point
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Emergency response assistance platform · In case of immediate peril, follow official personnel.
        </p>
      </div>
    </div>
  );
}
