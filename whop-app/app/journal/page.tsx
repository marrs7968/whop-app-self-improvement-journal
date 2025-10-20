'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WeekHeader } from '@/components/WeekHeader';
import { DailyRentSection } from '@/components/DailyRentSection';
import { WeeklyWeighInSection } from '@/components/WeeklyWeighInSection';
import { WeeklyReflectionSection } from '@/components/WeeklyReflectionSection';
import { getCurrentWeekStart } from '@/lib/dates';
import { canSubmitSection } from '@/lib/sections';

function JournalPageContent() {
  const searchParams = useSearchParams();
  const weekStartISO = searchParams.get('w') || getCurrentWeekStart();
  
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

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

  const dailyRentDrafts = Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    text: '',
    mediaIds: [],
    channelId: ''
  }));

  const weighInDraft = { text: '', mediaIds: [], channelId: '' };
  const reflectionDraft = { text: '', mediaIds: [], channelId: '' };

  const now = new Date();
  const canSubmitWeighIn = canSubmitSection('weigh-in', now);
  const canSubmitReflection = canSubmitSection('reflection', now);

  const handleSaveDraft = async (sectionKey: string, dayIndex: number | null, data: any) => {
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartISO,
          sectionKey,
          dayIndex,
          ...data
        })
      });
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleSubmit = async (sectionKey: string, dayIndex: number | null, data: any) => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartISO,
          sectionKey,
          dayIndex,
          ...data
        })
      });

      if (response.ok) {
        alert('Submitted successfully!');
      } else {
        const error = await response.json();
        alert(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Submission failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WeekHeader 
          userName={userName} 
          weekStartISO={weekStartISO} 
        />
        
        <div className="space-y-8">
          <DailyRentSection
            weekStartISO={weekStartISO}
            userId={userId}
            drafts={dailyRentDrafts}
            onSaveDraft={(dayIndex, data) => handleSaveDraft('daily-rent', dayIndex, data)}
            onSubmit={(dayIndex, data) => handleSubmit('daily-rent', dayIndex, data)}
          />

          <WeeklyWeighInSection
            weekStartISO={weekStartISO}
            userId={userId}
            draft={weighInDraft}
            canSubmit={canSubmitWeighIn}
            submitDisabledReason={!canSubmitWeighIn ? "Available Thursday or later" : undefined}
            onSaveDraft={(data) => handleSaveDraft('weigh-in', null, data)}
            onSubmit={(data) => handleSubmit('weigh-in', null, data)}
          />

          <WeeklyReflectionSection
            weekStartISO={weekStartISO}
            userId={userId}
            draft={reflectionDraft}
            canSubmit={canSubmitReflection}
            submitDisabledReason={!canSubmitReflection ? "Available on weekends only" : undefined}
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
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <JournalPageContent />
    </Suspense>
  );
}
