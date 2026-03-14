'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWeekRange, getNextWeek, getPreviousWeek } from '@/lib/dates';

interface WeekHeaderProps {
  userName: string;
  weekStartISO: string;
}

export function WeekHeader({ userName, weekStartISO }: WeekHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekRange = getWeekRange(weekStartISO);
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);

  const navigateToWeek = (weekStart: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('w', weekStart);
    router.push(`/journal?${params.toString()}`);
  };

  const goToPreviousWeek = () => {
    const prevWeek = getPreviousWeek(weekStartISO);
    navigateToWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = getNextWeek(weekStartISO);
    navigateToWeek(nextWeek);
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/quote?weekStartISO=${encodeURIComponent(weekStartISO)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!isMounted) return;
        if (payload?.quote && payload?.author) {
          setQuote({ quote: String(payload.quote), author: String(payload.author) });
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
      }
    }

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [weekStartISO]);

  return (
    <div className="bg-[#b7ccb8]/40 border border-[#d8e4d8]/70 rounded-2xl p-6 mb-6 shadow-[0_0_0_2px_rgba(183,204,184,0.5),0_18px_44px_rgba(0,0,0,0.38)] space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || 'Self-improvement Journal'}
          </h1>
          <p className="text-white/80 mt-1">
            Welcome back, <span className="text-[#edf4ee] font-semibold">{userName}</span>
          </p>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            {weekRange.formatted}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-[#4f6b5a] border border-[#d8e4d8]/75 hover:bg-[#5f7f69] text-white rounded-lg transition-all shadow-[0_6px_14px_rgba(20,46,34,0.45)] active:translate-y-px active:shadow-none"
              aria-label="Previous week"
            >
              ← Prev
            </button>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-[#4f6b5a] border border-[#d8e4d8]/75 hover:bg-[#5f7f69] text-white rounded-lg transition-all shadow-[0_6px_14px_rgba(20,46,34,0.45)] active:translate-y-px active:shadow-none"
              aria-label="Next week"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
      {quote && (
        <div className="bg-[#d5e4d7]/30 border border-[#d8e4d8]/75 rounded-lg px-3 py-2">
          <p className="text-xs italic text-white/95">
            "{quote.quote}" - {quote.author}
          </p>
        </div>
      )}
    </div>
  );
}


