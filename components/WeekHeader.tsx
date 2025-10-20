'use client';

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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {process.env.NEXT_PUBLIC_APP_NAME || 'Crusadia Journal'}
          </h1>
          <p className="text-zinc-400 mt-1">
            Welcome back, <span className="text-green-400 font-medium">{userName}</span>
          </p>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            {weekRange.formatted}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              ← Prev
            </button>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors"
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

