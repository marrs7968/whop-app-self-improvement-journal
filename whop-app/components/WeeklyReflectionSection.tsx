'use client';

import { useState, useEffect } from 'react';
import { SectionCard } from './SectionCard';
import { ChannelSelector } from './ChannelSelector';
import { MediaUploader } from './MediaUploader';
import { getSectionConfig } from '@/lib/sections';

interface WeeklyReflectionSectionProps {
  weekStartISO: string;
  userId: string;
  draft?: {
    text?: string;
    mediaIds: string[];
    channelId?: string;
  };
  canSubmit: boolean;
  submitDisabledReason?: string;
  onSaveDraft: (data: { text?: string; mediaIds: string[]; channelId?: string }) => void;
  onSubmit: (data: { text?: string; mediaIds: string[]; channelId?: string }) => void;
}

export function WeeklyReflectionSection({ 
  weekStartISO, 
  userId, 
  draft, 
  canSubmit,
  submitDisabledReason,
  onSaveDraft, 
  onSubmit 
}: WeeklyReflectionSectionProps) {
  const [data, setData] = useState({
    text: '',
    mediaIds: [] as string[],
    channelId: ''
  });

  const sectionConfig = getSectionConfig('reflection');
  const promptTemplate = sectionConfig?.promptTemplate || '';

  // Initialize data from draft
  useEffect(() => {
    if (draft) {
      setData({
        text: draft.text || '',
        mediaIds: draft.mediaIds || [],
        channelId: draft.channelId || ''
      });
    }
  }, [draft]);

  const updateData = (updates: Partial<typeof data>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    onSaveDraft(newData);
  };

  const clearData = () => {
    const clearedData = {
      text: '',
      mediaIds: [],
      channelId: ''
    };
    setData(clearedData);
    onSaveDraft(clearedData);
  };

  const submitData = () => {
    onSubmit(data);
  };

  return (
    <SectionCard
      title="Weekly Reflection"
      onSubmit={submitData}
      onClear={clearData}
      disabledSubmit={!canSubmit}
      submitDisabledReason={submitDisabledReason || "Available on weekends only"}
    >
      <div className="space-y-4">
        {/* Prompt Template */}
        {promptTemplate && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Reflection Questions:</h4>
            <div className="text-sm text-zinc-400 whitespace-pre-line">
              {promptTemplate}
            </div>
          </div>
        )}

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Your Reflection
          </label>
          <textarea
            value={data.text}
            onChange={(e) => updateData({ text: e.target.value })}
            placeholder="Reflect on your week using the questions above as a guide..."
            className="w-full h-40 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Media Upload */}
        <MediaUploader
          mediaIds={data.mediaIds}
          onChange={(mediaIds) => updateData({ mediaIds })}
        />

        {/* Channel Selector */}
        <ChannelSelector
          value={data.channelId}
          onChange={(channelId) => updateData({ channelId })}
        />
      </div>
    </SectionCard>
  );
}

