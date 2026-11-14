import React from 'react';
import { HAZARD_TOOLS } from '../../constants/hazardConfig';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function HazardToolbar() {
  const { hazardTool, setHazardTool } = useEvacuation();
  const currentTool = HAZARD_TOOLS.find((t) => t.id === hazardTool);

  return (
    <div className="mb-4 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1.5">
          Hazard Brush:
        </span>
        {HAZARD_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSelected = hazardTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setHazardTool(tool.id)}
              title={tool.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? tool.activeClass
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-slate-500 px-1">
        {currentTool?.desc} — click any corridor edge
      </span>
    </div>
  );
}
