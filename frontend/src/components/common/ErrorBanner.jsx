import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-6 py-2.5 flex items-center justify-between gap-2 text-sm font-medium">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-amber-600 shrink-0" />
        <span>{error}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-900 p-1 rounded transition-colors"
          title="Dismiss alert"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
