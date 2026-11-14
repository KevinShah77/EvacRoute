import React from 'react';
import { X } from 'lucide-react';
import { HAZARD_TOOLS } from '../../constants/hazardConfig';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function HazardToolbar() {
  const {
    hazardTool,
    setHazardSelection,
    activeSelection,
    clearSelection,
  } = useEvacuation();

  const isHazardMode = activeSelection?.type === 'hazard';
  const currentTool = HAZARD_TOOLS.find((t) => t.id === hazardTool);

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1.5">
          Hazard Brush:
        </span>
        {HAZARD_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSelected = isHazardMode && activeSelection?.id === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setHazardSelection(tool.id)}
              title={tool.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? `${tool.activeClass} ring-2 ring-offset-1 ring-slate-400 shadow-sm`
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tool.label}</span>
            </button>
          );
        })}

        {activeSelection && (
          <button
            onClick={clearSelection}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 border border-slate-200"
            title="Clear active selection and restore default floor map visualization"
          >
            <X size={12} />
            <span>Clear Selection</span>
          </button>
        )}
      </div>
      <span className="text-[11px] text-slate-500 px-1">
        {isHazardMode
          ? `Focusing on ${currentTool?.label || 'Hazard'} brush — click corridor to apply`
          : activeSelection?.type === 'route'
          ? 'Route visualization active — click a brush to focus hazard'
          : `${currentTool?.desc} — select a brush or click corridor`}
      </span>
    </div>
  );
}
