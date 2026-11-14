import React from 'react';

export default function MapLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Exit
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Stairs
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Evac Lift
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Ramp
      </span>
      <span className="flex items-center gap-1.5 ml-auto">
        <span className="w-4 h-0.5 bg-blue-600 inline-block" /> Primary
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" /> Backup
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500 inline-block" /> Fire
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-1 bg-slate-500/60 inline-block rounded" /> Smoke
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dotted border-orange-600 inline-block" /> Structural
      </span>
    </div>
  );
}
