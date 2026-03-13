'use client';

import { useState, useEffect } from 'react';
import { SectionCard } from './SectionCard';
import { ChannelSelector } from './ChannelSelector';
import { MediaUploader } from './MediaUploader';

interface WeeklyWeighInSectionProps {
  weekStartISO: string;
  userId: string;
  experienceId?: string;
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

export function WeeklyWeighInSection({ 
  weekStartISO, 
  userId, 
  experienceId,
  draft, 
  canSubmit,
  submitDisabledReason,
  onSaveDraft, 
  onSubmit 
}: WeeklyWeighInSectionProps) {
  const [data, setData] = useState({
    text: '',
    mediaIds: [] as string[],
    channelId: ''
  });

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
      title="Weekly Weigh-In"
      onSubmit={submitData}
      onClear={clearData}
      disabledSubmit={!canSubmit}
      submitDisabledReason={submitDisabledReason || "Available Thursday or later"}
    >
      <div className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-emerald-100/90 mb-2">
            Weight & Progress Update
          </label>
          <textarea
            value={data.text}
            onChange={(e) => updateData({ text: e.target.value })}
            placeholder="Share your weight, measurements, progress photos, or any other metrics..."
            className="w-full h-32 px-3 py-2 bg-zinc-800/90 border border-emerald-300/45 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 focus:border-emerald-200/80 resize-none transition-colors"
          />
        </div>

        {/* Media Upload */}
        <MediaUploader
          mediaIds={data.mediaIds}
          onChange={(mediaIds) => updateData({ mediaIds })}
        />

        {/* Channel Selector */}
        <ChannelSelector
          experienceId={experienceId}
          value={data.channelId}
          onChange={(channelId) => updateData({ channelId })}
        />
      </div>
    </SectionCard>
  );
}


