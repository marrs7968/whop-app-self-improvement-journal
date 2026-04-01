'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WeekHeader } from '@/components/WeekHeader';
import { DailyRentSection } from '@/components/DailyRentSection';
import { WeeklyWeighInSection } from '@/components/WeeklyWeighInSection';
import { WeeklyReflectionSection } from '@/components/WeeklyReflectionSection';
import { getCurrentWeekStart } from '@/lib/dates';
import { canSubmitSection } from '@/lib/sections';

interface DraftPayload {
  sectionKey: string;
  dayIndex: number | null;
  text?: string;
  mediaIds?: string[];
  channelId?: string | null;
  weightValue?: number | null;
  weightUnit?: 'lb' | 'kg';
}

function JournalPageContent() {
  const searchParams = useSearchParams();
  const weekStartISO = searchParams.get('w') || getCurrentWeekStart();
  const experienceId = searchParams.get('experienceId') || '';

  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [dailyRentDrafts, setDailyRentDrafts] = useState(
    Array.from({ length: 7 }, (_, dayIndex) => ({
      dayIndex,
      text: '',
      mediaIds: [] as string[],
      channelId: '',
    }))
  );
  const [weighInDraft, setWeighInDraft] = useState({
    text: '',
    mediaIds: [] as string[],
    channelId: '',
    weightValue: null as number | null,
    weightUnit: 'lb' as 'lb' | 'kg',
  });
  const [reflectionDraft, setReflectionDraft] = useState({ text: '', mediaIds: [] as string[], channelId: '' });
  const [submittedDailyByDay, setSubmittedDailyByDay] = useState<boolean[]>(Array.from({ length: 7 }, () => false));
  const [submittedWeighIn, setSubmittedWeighIn] = useState(false);
  const [submittedReflection, setSubmittedReflection] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const user = await response.json();
          setUserName(user.name || user.username || 'User');
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, []);

  useEffect(() => {
    async function fetchDrafts() {
      try {
        const response = await fetch(`/api/drafts?weekStartISO=${encodeURIComponent(weekStartISO)}`);
        if (!response.ok) return;

        const drafts = (await response.json()) as DraftPayload[];
        const daily = Array.from({ length: 7 }, (_, dayIndex) => ({
          dayIndex,
          text: '',
          mediaIds: [] as string[],
          channelId: '',
        }));
        const weighIn = {
          text: '',
          mediaIds: [] as string[],
          channelId: '',
          weightValue: null as number | null,
          weightUnit: 'lb' as 'lb' | 'kg',
        };
        const reflection = { text: '', mediaIds: [] as string[], channelId: '' };

        for (const draft of drafts) {
          if (draft.sectionKey === 'daily-rent' && typeof draft.dayIndex === 'number' && draft.dayIndex >= 0 && draft.dayIndex < 7) {
            daily[draft.dayIndex] = {
              dayIndex: draft.dayIndex,
              text: draft.text || '',
              mediaIds: draft.mediaIds || [],
              channelId: draft.channelId || '',
            };
          } else if (draft.sectionKey === 'weigh-in') {
            weighIn.text = draft.text || '';
            weighIn.mediaIds = draft.mediaIds || [];
            weighIn.channelId = draft.channelId || '';
            weighIn.weightValue = typeof draft.weightValue === 'number' ? draft.weightValue : null;
            weighIn.weightUnit = draft.weightUnit === 'kg' ? 'kg' : 'lb';
          } else if (draft.sectionKey === 'reflection') {
            reflection.text = draft.text || '';
            reflection.mediaIds = draft.mediaIds || [];
            reflection.channelId = draft.channelId || '';
          }
        }

        setDailyRentDrafts(daily);
        setWeighInDraft(weighIn);
        setReflectionDraft(reflection);
      } catch (error) {
        console.error('Error fetching drafts:', error);
      }
    }

    fetchDrafts();
  }, [weekStartISO]);

  useEffect(() => {
    async function fetchSubmissionState() {
      try {
        const response = await fetch(`/api/submit?weekStartISO=${encodeURIComponent(weekStartISO)}`);
        if (!response.ok) return;

        const submissions = (await response.json()) as Array<{ sectionKey: string; dayIndex: number | null }>;
        const daily = Array.from({ length: 7 }, () => false);
        let weighIn = false;
        let reflection = false;

        for (const submission of submissions) {
          if (
            submission.sectionKey === 'daily-rent' &&
            typeof submission.dayIndex === 'number' &&
            submission.dayIndex >= 0 &&
            submission.dayIndex < 7
          ) {
            daily[submission.dayIndex] = true;
          } else if (submission.sectionKey === 'weigh-in') {
            weighIn = true;
          } else if (submission.sectionKey === 'reflection') {
            reflection = true;
          }
        }

        setSubmittedDailyByDay(daily);
        setSubmittedWeighIn(weighIn);
        setSubmittedReflection(reflection);
      } catch (error) {
        console.error('Error fetching submission state:', error);
      }
    }

    fetchSubmissionState();
  }, [weekStartISO]);

  const now = new Date();
  const canSubmitWeighIn = canSubmitSection('weigh-in', now);
  const canSubmitReflection = canSubmitSection('reflection', now);

  const handleSaveDraft = async (sectionKey: string, dayIndex: number | null, data: Record<string, unknown>) => {
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartISO,
          sectionKey,
          dayIndex,
          ...data,
        }),
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleSubmit = async (sectionKey: string, dayIndex: number | null, data: Record<string, unknown>): Promise<boolean> => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartISO,
          sectionKey,
          dayIndex,
          ...data,
        }),
      });

      if (response.ok) {
        alert('Submitted successfully!');
        if (sectionKey === 'daily-rent' && typeof dayIndex === 'number' && dayIndex >= 0 && dayIndex < 7) {
          setSubmittedDailyByDay((prev) => {
            const next = [...prev];
            next[dayIndex] = true;
            return next;
          });
        } else if (sectionKey === 'weigh-in') {
          setSubmittedWeighIn(true);
        } else if (sectionKey === 'reflection') {
          setSubmittedReflection(true);
        }
        return true;
      }

      const error = await response.json();
      alert(`Submission failed: ${error.error}`);
      return false;
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Submission failed. Please try again.');
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-xl text-emerald-100/90">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WeekHeader userName={userName} weekStartISO={weekStartISO} />

        <div className="space-y-8">
          <DailyRentSection
            weekStartISO={weekStartISO}
            userId={userId}
            experienceId={experienceId}
            submittedByDay={submittedDailyByDay}
            drafts={dailyRentDrafts}
            onSaveDraft={(dayIndex, data) => handleSaveDraft('daily-rent', dayIndex, data)}
            onSubmit={(dayIndex, data) => handleSubmit('daily-rent', dayIndex, data)}
          />

          <WeeklyWeighInSection
            weekStartISO={weekStartISO}
            userId={userId}
            experienceId={experienceId}
            submitted={submittedWeighIn}
            draft={weighInDraft}
            canSubmit={canSubmitWeighIn}
            submitDisabledReason={!canSubmitWeighIn ? 'Available Thursday or later' : undefined}
            onSaveDraft={(data) => handleSaveDraft('weigh-in', null, data)}
            onSubmit={(data) => handleSubmit('weigh-in', null, data)}
          />

          <WeeklyReflectionSection
            weekStartISO={weekStartISO}
            userId={userId}
            experienceId={experienceId}
            submitted={submittedReflection}
            draft={reflectionDraft}
            canSubmit={canSubmitReflection}
            submitDisabledReason={undefined}
            onSaveDraft={(data) => handleSaveDraft('reflection', null, data)}
            onSubmit={(data) => handleSubmit('reflection', null, data)}
          />
        </div>
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
          <div className="text-xl text-emerald-100/90">Loading...</div>
        </div>
      }
    >
      <JournalPageContent />
    </Suspense>
  );
}

