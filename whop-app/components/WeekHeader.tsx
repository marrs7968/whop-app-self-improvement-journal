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
    <div className="bg-emerald-200/30 border border-emerald-100/80 rounded-2xl p-6 mb-6 shadow-[0_0_0_2px_rgba(167,243,208,0.35),0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-50">
            {process.env.NEXT_PUBLIC_APP_NAME || 'Self-improvement Journal'}
          </h1>
          <p className="text-emerald-100/70 mt-1">
            Welcome back, <span className="text-emerald-300 font-medium">{userName}</span>
          </p>
          {quote && (
            <p className="text-xs italic text-emerald-50/80 mt-3 max-w-md">
              "{quote.quote}" - {quote.author}
            </p>
          )}
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-emerald-50 mb-2">
            {weekRange.formatted}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-emerald-700 border border-emerald-200/70 hover:bg-emerald-600 text-emerald-50 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none"
              aria-label="Previous week"
            >
              ← Prev
            </button>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-emerald-700 border border-emerald-200/70 hover:bg-emerald-600 text-emerald-50 rounded-lg transition-all shadow-[0_6px_14px_rgba(6,78,59,0.4)] active:translate-y-px active:shadow-none"
              aria-label="Next week"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


