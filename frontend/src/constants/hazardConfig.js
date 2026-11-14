import { Flame, Wind, Hammer, Eraser } from 'lucide-react';

/**
 * Hazard tool selector options and visual styles.
 */
export const HAZARD_TOOLS = [
  {
    id: 'fire',
    label: 'Fire (Block)',
    desc: '100% impassable',
    icon: Flame,
    activeClass: 'bg-red-600 text-white border-red-600',
    color: '#ef4444',
  },
  {
    id: 'smoke',
    label: 'Smoke (Slow)',
    desc: 'Passable if forced · 50% speed',
    icon: Wind,
    activeClass: 'bg-slate-700 text-white border-slate-700',
    color: '#64748b',
  },
  {
    id: 'debris',
    label: 'Structural',
    desc: '40% speed · Blocks ADA',
    icon: Hammer,
    activeClass: 'bg-orange-600 text-white border-orange-600',
    color: '#ea580c',
  },
  {
    id: 'clear',
    label: 'Clear',
    desc: 'Restore corridor',
    icon: Eraser,
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    color: '#10b981',
  },
];

/**
 * Standard baseline counts for building hazards.
 */
export const DEFAULT_HAZARD_COUNTS = { fire: 0, smoke: 0, debris: 0 };

