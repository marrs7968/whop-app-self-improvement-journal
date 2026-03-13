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
    <div className={`bg-zinc-900/80 border border-emerald-500/25 rounded-2xl p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_20px_50px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-emerald-50">{title}</h3>
        
        {disabledSubmit && submitDisabledReason && (
          <div className="text-sm text-amber-200 bg-amber-900/20 border border-amber-300/35 px-3 py-1 rounded-lg">
            {submitDisabledReason}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {children}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-emerald-500/20">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-zinc-950/70 border border-emerald-400/45 hover:border-emerald-300 text-emerald-100/90 rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.35)] active:translate-y-px active:shadow-none"
        >
          {showClearConfirm ? 'Confirm Clear' : 'Clear'}
        </button>

        {showClearConfirm && (
          <button
            type="button"
            onClick={cancelClear}
            className="px-4 py-2 bg-zinc-950/70 border border-emerald-300/35 hover:border-emerald-200 text-emerald-100/80 rounded-lg transition-all shadow-[0_4px_12px_rgba(0,0,0,0.35)] active:translate-y-px active:shadow-none ml-2"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabledSubmit}
          className="px-6 py-2 bg-emerald-700/30 border border-emerald-300/70 hover:bg-emerald-600/35 hover:border-emerald-200 text-emerald-100 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  );
}


