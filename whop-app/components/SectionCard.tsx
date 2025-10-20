'use client';

import { useState } from 'react';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onClear: () => void;
  disabledSubmit?: boolean;
  submitDisabledReason?: string;
  className?: string;
}

export function SectionCard({
  title,
  children,
  onSubmit,
  onClear,
  disabledSubmit = false,
  submitDisabledReason,
  className = ''
}: SectionCardProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    if (showClearConfirm) {
      onClear();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
        
        {disabledSubmit && submitDisabledReason && (
          <div className="text-sm text-amber-400 bg-amber-900/20 px-3 py-1 rounded-lg">
            {submitDisabledReason}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {children}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors"
        >
          {showClearConfirm ? 'Confirm Clear' : 'Clear'}
        </button>

        {showClearConfirm && (
          <button
            type="button"
            onClick={cancelClear}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors ml-2"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabledSubmit}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

