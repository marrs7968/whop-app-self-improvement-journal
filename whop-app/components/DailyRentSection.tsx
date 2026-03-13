'use client';

import { useState, useEffect } from 'react';
import { SectionCard } from './SectionCard';
import { ChannelSelector } from './ChannelSelector';
import { MediaUploader } from './MediaUploader';
import { getDayName } from '@/lib/dates';

interface DailyRentSectionProps {
  weekStartISO: string;
  userId: string;
  experienceId?: string;
  submittedByDay: boolean[];
  drafts: Array<{
    dayIndex: number;
    text?: string;
    mediaIds: string[];
    channelId?: string;
  }>;
  onSaveDraft: (dayIndex: number, data: { text?: string; mediaIds: string[]; channelId?: string }) => void;
  onSubmit: (dayIndex: number, data: { text?: string; mediaIds: string[]; channelId?: string }) => Promise<boolean>;
}

export function DailyRentSection({ 
  weekStartISO, 
  userId, 
  experienceId,
  submittedByDay,
  drafts, 
  onSaveDraft, 
  onSubmit 
}: DailyRentSectionProps) {
  const [dayData, setDayData] = useState<Record<number, {
    text: string;
    mediaIds: string[];
    channelId: string;
  }>>({});
  // Initialize day data from drafts
  useEffect(() => {
    const initialData: Record<number, { text: string; mediaIds: string[]; channelId: string }> = {};
    
    // Initialize all 7 days
    for (let i = 0; i < 7; i++) {
      const draft = drafts.find(d => d.dayIndex === i);
      initialData[i] = {
        text: draft?.text || '',
        mediaIds: draft?.mediaIds || [],
        channelId: draft?.channelId || ''
      };
    }
    
    setDayData(initialData);
  }, [drafts]);

  const updateDayData = (dayIndex: number, updates: Partial<{ text: string; mediaIds: string[]; channelId: string }>) => {
    setDayData(prev => {
      const newData = {
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          ...updates
        }
      };
      
      // Auto-save draft
      onSaveDraft(dayIndex, newData[dayIndex]);
      
      return newData;
    });
  };

  const clearDay = (dayIndex: number) => {
    const clearedData = {
      text: '',
      mediaIds: [],
      channelId: ''
    };
    
    setDayData(prev => ({
      ...prev,
      [dayIndex]: clearedData
    }));
    
    onSaveDraft(dayIndex, clearedData);
  };

  const submitDay = async (dayIndex: number) => {
    const data = dayData[dayIndex];
    await onSubmit(dayIndex, data);
  };

  const getDateLabel = (dayIndex: number) => {
    const weekStart = new Date(`${weekStartISO}T00:00:00`);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);
    return `${getDayName(dayIndex)} ${dayDate.getMonth() + 1}/${dayDate.getDate()} - Log`;
  };

  return (
    <div className="space-y-6">
      {Array.from({ length: 7 }, (_, dayIndex) => (
        <SectionCard
          key={dayIndex}
          title={getDateLabel(dayIndex)}
          onSubmit={() => {
            void submitDay(dayIndex);
          }}
          onClear={() => clearDay(dayIndex)}
          disabledSubmit={Boolean(submittedByDay[dayIndex])}
          submitDisabledReason={
            submittedByDay[dayIndex]
              ? 'Already submitted for this day.'
              : undefined
          }
          className="mb-4"
        >
          <div className="space-y-4">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-emerald-100/90 mb-2">
                What did you accomplish today?
              </label>
              <textarea
                value={dayData[dayIndex]?.text || ''}
                onChange={(e) => updateDayData(dayIndex, { text: e.target.value })}
                placeholder="Share your daily progress, achievements, or reflections..."
                className="w-full h-24 px-3 py-2 bg-zinc-800/90 border border-emerald-300/45 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 focus:border-emerald-200/80 resize-none transition-colors"
              />
            </div>

            {/* Media Upload */}
            <MediaUploader
              mediaIds={dayData[dayIndex]?.mediaIds || []}
              onChange={(mediaIds) => updateDayData(dayIndex, { mediaIds })}
            />

            {/* Channel Selector */}
            <ChannelSelector
              experienceId={experienceId}
              value={dayData[dayIndex]?.channelId || ''}
              onChange={(channelId) => updateDayData(dayIndex, { channelId })}
            />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}


