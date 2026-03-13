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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

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

  const handleSubmitClick = () => {
    if (disabledSubmit) return;
    if (showSubmitConfirm) {
      onSubmit();
      setShowSubmitConfirm(false);
      return;
    }
    setShowSubmitConfirm(true);
  };

  const cancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  return (
    <div className={`bg-emerald-200/30 border border-emerald-100/80 rounded-2xl p-6 shadow-[0_0_0_2px_rgba(167,243,208,0.35),0_20px_50px_rgba(0,0,0,0.35)] ${className}`}>
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

      <div className="flex items-center justify-between pt-4 border-t border-emerald-200/30">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-emerald-700 border border-emerald-200/70 hover:bg-emerald-600 text-emerald-50 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none"
        >
          {showClearConfirm ? 'Confirm Clear' : 'Clear'}
        </button>

        {showClearConfirm && (
          <button
            type="button"
            onClick={cancelClear}
            className="px-4 py-2 bg-emerald-800 border border-emerald-200/70 hover:bg-emerald-700 text-emerald-50 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none ml-2"
          >
            Cancel
          </button>
        )}

        <div className="flex items-center gap-2">
          {showSubmitConfirm && (
            <span className="text-xs text-emerald-50/90">Are you sure?</span>
          )}
          {showSubmitConfirm && (
            <button
              type="button"
              onClick={cancelSubmit}
              className="px-3 py-2 bg-emerald-800 border border-emerald-200/70 hover:bg-emerald-700 text-emerald-50 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={disabledSubmit}
            className="px-6 py-2 bg-emerald-700 border border-emerald-200/70 hover:bg-emerald-600 text-emerald-50 rounded-lg transition-all shadow-[0_8px_16px_rgba(6,78,59,0.45)] active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showSubmitConfirm ? 'Confirm Submit' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}


