import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ArrowUpDown,
  Accessibility,
  CheckCircle2,
} from 'lucide-react';

export default function StepIcon({ type, size = 16 }) {
  switch (type) {
    case 'stairs_down':
      return <ArrowDown size={size} className="text-amber-600" />;
    case 'stairs_up':
      return <ArrowUp size={size} className="text-amber-600" />;
    case 'elevator':
      return <ArrowUpDown size={size} className="text-purple-600" />;
    case 'ramp':
      return <Accessibility size={size} className="text-teal-600" />;
    case 'exit':
      return <CheckCircle2 size={size} className="text-green-600" />;
    default:
      return <ArrowRight size={size} className="text-blue-600" />;
  }
}
