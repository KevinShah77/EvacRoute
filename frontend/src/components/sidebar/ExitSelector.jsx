import React from 'react';
import { useEvacuation } from '../../hooks/useEvacuation';

export default function ExitSelector() {
  const { graph, targetNode, setTargetNode } = useEvacuation();
  const exitNodes = graph.nodes.filter((n) => n.type === 'exit');

  return (
    <div>
      <label className="block text-xs text-slate-300 mb-1 font-medium">
        Emergency Exit Target
      </label>
      <select
        className="w-full bg-slate-700 p-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none text-sm text-white"
        value={targetNode}
        onChange={(e) => setTargetNode(e.target.value)}
      >
        <option value="AUTO">⚡ Auto-Select Nearest Safe Exit</option>
        {exitNodes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label} ({n.floor})
          </option>
        ))}
      </select>
    </div>
  );
}
