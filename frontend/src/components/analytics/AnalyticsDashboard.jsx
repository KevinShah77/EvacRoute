import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  Flame,
  Wind,
  Hammer,
  Activity,
  Navigation,
} from 'lucide-react';
import { DEFAULT_HAZARD_COUNTS } from '../../constants/hazardConfig';
import FloorEvacuationGraph from './FloorEvacuationGraph';

const DYNAMIC_PALETTE = ['#2563eb', '#0d9488', '#16a34a', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function AnalyticsDashboard({ stats, accessibleOnly, onInspectRoom }) {
  const analytics = stats?.analytics;
  if (!analytics) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        Loading safety officer analytics...
      </div>
    );
  }

  const {
    room_evacuation_times = [],
    exit_utilization = [],
    bottleneck_hubs = [],
    bottleneck_corridors = [],
  } = analytics;

  const summary = analytics.summary || {
    total_rooms: 0,
    reachable_rooms: 0,
    trapped_rooms: 0,
    avg_rset_seconds: 0,
    avg_rset_formatted: '0 sec',
    max_rset_seconds: 0,
    max_rset_formatted: '0 sec',
    slowest_room_label: 'N/A',
  };

  const hazardCounts = stats.hazard_counts || DEFAULT_HAZARD_COUNTS;

  const roomChartData = room_evacuation_times.map((r) => ({
    name: r.label,
    floor: r.floor,
    time_seconds: r.reachable ? r.time_seconds : 0,
    distance: r.reachable ? r.distance : 0,
    formatted_time: r.formatted_time,
    assigned_exit: r.assigned_exit,
    reachable: r.reachable,
    hazards_crossed: r.hazards_crossed,
  }));

  const pieData = exit_utilization.filter((e) => e.rooms > 0);

  const getExitColor = (id, idx) => {
    if (id === 'TRAPPED') return '#ef4444';
    return DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
            Safety Officer Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Real-time egress bottleneck detection, RSET distribution, and exit load across{' '}
            {summary.total_rooms} occupied rooms
            {accessibleOnly ? ' (Wheelchair / ADA Mode)' : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <Flame size={14} /> Fire: {hazardCounts.fire}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
            <Wind size={14} /> Smoke: {hazardCounts.smoke}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
            <Hammer size={14} /> Structural: {hazardCounts.debris}
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`rounded-2xl p-5 border shadow-sm ${
            summary.trapped_rooms > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Room Reachability</span>
            {summary.trapped_rooms > 0 ? (
              <AlertTriangle size={16} className="text-red-600" />
            ) : (
              <ShieldCheck size={16} className="text-green-600" />
            )}
          </div>
          <div className="text-3xl font-black mt-2 text-slate-900">
            {summary.reachable_rooms} / {summary.total_rooms}
          </div>
          <p
            className={`text-xs mt-1.5 font-medium ${
              summary.trapped_rooms > 0 ? 'text-red-700' : 'text-green-700'
            }`}
          >
            {summary.trapped_rooms > 0
              ? `${summary.trapped_rooms} room(s) currently trapped!`
              : '100% of rooms have safe egress'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Average Building RSET</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="text-3xl font-black mt-2 text-blue-600">
            {summary.avg_rset_formatted}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Mean escape time across safe rooms
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Worst-Case RSET</span>
            <Activity size={16} className="text-amber-600" />
          </div>
          <div className="text-3xl font-black mt-2 text-amber-600">
            {summary.max_rset_formatted}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 truncate" title={summary.slowest_room_label}>
            Slowest: {summary.slowest_room_label}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Peak Bottleneck Load</span>
            <AlertTriangle size={16} className="text-purple-600" />
          </div>
          <div className="text-3xl font-black mt-2 text-slate-900">
            {bottleneck_hubs[0] ? `${bottleneck_hubs[0].load_percent}%` : '0%'}
          </div>
          <p
            className="text-xs text-slate-500 mt-1.5 truncate"
            title={bottleneck_hubs[0]?.name}
          >
            {bottleneck_hubs[0]
              ? `${bottleneck_hubs[0].name} (${bottleneck_hubs[0].route_count} rooms)`
              : 'No transit data'}
          </p>
        </div>
      </div>

      {/* Dynamic Floor-Wise & Entrance-Wise Evacuation Network Graph */}
      <FloorEvacuationGraph
        accessibleOnly={accessibleOnly}
        onInspectRoom={onInspectRoom}
        initialFloors={stats?.floors}
        initialEntrances={stats?.available_entrances}
        initialGraphData={stats?.floor_evacuation_graph}
      />

      {/* Charts Grid Row 1: RSET per Room + Exit Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Evacuation Time (RSET) per Room
            </h3>
            <p className="text-xs text-slate-500">
              Estimated escape duration in seconds (includes stair speed penalties & hazard delays)
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomChartData} margin={{ top: 8, right: 16, left: 0, bottom: 38 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  angle={-35}
                  textAnchor="end"
                  interval="preserveStartEnd"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  unit="s"
                />
                <Tooltip
                  formatter={(value, name, props) => {
                    const p = props?.payload;
                    if (!p || !p.reachable) return ['Trapped / Blocked', 'Status'];
                    return [`${p.formatted_time || `${value}s`} (${p.distance}m)`, 'RSET'];
                  }}
                  labelFormatter={(label, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${label} · ${p.floor} ➔ ${p.assigned_exit}` : label;
                  }}
                />
                <Bar
                  dataKey="time_seconds"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Exit Load Distribution</h3>
            <p className="text-xs text-slate-500">Share of rooms assigned to each exit</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="rooms"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={getExitColor(entry.id, index)}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} rooms`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Bottleneck Hubs & Corridors Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Critical Transit Hubs (Junctions)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Most heavily traversed hubs across all room evacuation routes
          </p>
          <div className="space-y-2">
            {bottleneck_hubs.map((hub, idx) => (
              <div
                key={hub.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{hub.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{hub.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-700 font-mono">
                    {hub.load_percent}% load
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {hub.route_count} room paths
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Top Traversed Corridors
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Corridors at risk of congestion during simultaneous evacuation
          </p>
          <div className="space-y-2">
            {bottleneck_corridors.map((c, idx) => (
              <div
                key={`${c.u}-${c.v}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{c.corridor}</div>
                    {c.hazard && (
                      <span className="text-[10px] text-amber-600 font-semibold uppercase">
                        ⚠ {c.hazard}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-700 font-mono">
                    {c.load_percent}% load
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {c.route_count} room paths
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: All Occupied Rooms Evacuation Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Room-by-Room Egress Breakdown
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Click any room to focus and simulate its exact path on the floor plan
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Room / Origin</th>
                <th className="py-2.5 px-3">Floor</th>
                <th className="py-2.5 px-3">Assigned Exit</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Estimated RSET</th>
                <th className="py-2.5 px-3">Hazards Crossed</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {room_evacuation_times.map((room) => (
                <tr
                  key={room.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !room.reachable ? 'bg-red-50/60 text-red-900' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {room.label}
                  </td>
                  <td className="py-2 px-3">{room.floor}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        room.reachable
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {room.assigned_exit}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono">
                    {room.reachable ? `${room.distance}m` : '—'}
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold">
                    {room.formatted_time}
                  </td>
                  <td className="py-2 px-3">
                    {room.hazards_crossed > 0 ? (
                      <span className="text-amber-600 font-bold">
                        ⚠ {room.hazards_crossed} hazard(s)
                      </span>
                    ) : (
                      <span className="text-green-600">Clear</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {room.reachable && (
                      <button
                        onClick={() => onInspectRoom && onInspectRoom(room)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        <Navigation size={12} /> Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
