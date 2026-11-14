import React from 'react';
import { Accessibility } from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function AdaToggle() {
  const { accessibleOnly, toggleAccessible } = useEvacuation();

  return (
    <button
      type="button"
      onClick={toggleAccessible}
      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
        accessibleOnly
          ? 'bg-purple-900/40 border-purple-400 text-purple-100'
          : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
      }`}
    >
      <Accessibility
        size={20}
        className={`shrink-0 mt-0.5 ${accessibleOnly ? 'text-purple-300' : 'text-slate-400'}`}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Wheelchair / ADA Mode</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
              accessibleOnly
                ? 'bg-purple-500 text-white'
                : 'bg-slate-600 text-slate-300'
            }`}
          >
            {accessibleOnly ? 'ON' : 'OFF'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
          Avoids stairs & debris; routes via lift & ramps.
        </p>
      </div>
    </button>
  );
}
