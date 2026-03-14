'use client';

import { useState, useEffect } from 'react';
import { SectionCard } from './SectionCard';
import { ChannelSelector } from './ChannelSelector';
import { MediaUploader } from './MediaUploader';
import type { WeightUnit } from '@/lib/weighIn';

interface WeightPoint {
  weekStartISO: string;
  weightValue: number;
  weightUnit: WeightUnit;
}

interface WeeklyWeighInSectionProps {
  weekStartISO: string;
  userId: string;
  experienceId?: string;
  submitted: boolean;
  draft?: {
    text?: string;
    mediaIds: string[];
    channelId?: string;
    weightValue?: number | null;
    weightUnit?: WeightUnit;
  };
  canSubmit: boolean;
  submitDisabledReason?: string;
  onSaveDraft: (data: {
    text?: string;
    mediaIds: string[];
    channelId?: string;
    weightValue?: number | null;
    weightUnit?: WeightUnit;
  }) => void;
  onSubmit: (data: {
    text?: string;
    mediaIds: string[];
    channelId?: string;
    weightValue?: number | null;
    weightUnit?: WeightUnit;
  }) => Promise<boolean>;
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  if (from === 'lb' && to === 'kg') return value * 0.45359237;
  return value / 0.45359237;
}

function formatWeekLabel(weekStartISO: string): string {
  const date = new Date(`${weekStartISO}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function WeeklyWeighInSection({ 
  weekStartISO, 
  userId,
  experienceId,
  submitted,
  draft, 
  canSubmit,
  submitDisabledReason,
  onSaveDraft, 
  onSubmit 
}: WeeklyWeighInSectionProps) {
  const [data, setData] = useState({
    text: '',
    mediaIds: [] as string[],
    channelId: '',
    weightValue: '' as string,
    weightUnit: 'lb' as WeightUnit,
  });
  const [trendExpanded, setTrendExpanded] = useState(false);
  const [weightPoints, setWeightPoints] = useState<WeightPoint[]>([]);

  useEffect(() => {
    async function fetchWeightPoints() {
      try {
        const response = await fetch('/api/weights');
        if (!response.ok) return;
        const payload = (await response.json()) as { points?: WeightPoint[] };
        setWeightPoints(Array.isArray(payload.points) ? payload.points : []);
      } catch (error) {
        console.error('Error fetching weight trend:', error);
      }
    }

    fetchWeightPoints();
  }, [weekStartISO, submitted, userId]);

  // Initialize data from draft
  useEffect(() => {
    if (draft) {
      setData({
        text: draft.text || '',
        mediaIds: draft.mediaIds || [],
        channelId: draft.channelId || '',
        weightValue: typeof draft.weightValue === 'number' ? String(draft.weightValue) : '',
        weightUnit: draft.weightUnit === 'kg' ? 'kg' : 'lb',
      });
    }
  }, [draft]);

  const updateData = (updates: Partial<typeof data>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    const numericWeight =
      newData.weightValue.trim() === '' ? null : parseFloat(newData.weightValue);
    onSaveDraft({
      text: newData.text,
      mediaIds: newData.mediaIds,
      channelId: newData.channelId,
      weightValue: Number.isFinite(numericWeight) ? numericWeight : null,
      weightUnit: newData.weightUnit,
    });
  };

  const clearData = () => {
    const clearedData = {
      text: '',
      mediaIds: [],
      channelId: '',
      weightValue: '',
      weightUnit: data.weightUnit,
    };
    setData(clearedData);
    onSaveDraft({
      text: '',
      mediaIds: [],
      channelId: '',
      weightValue: null,
      weightUnit: clearedData.weightUnit,
    });
  };

  const submitData = async () => {
    const numericWeight =
      data.weightValue.trim() === '' ? null : parseFloat(data.weightValue);
    await onSubmit({
      text: data.text,
      mediaIds: data.mediaIds,
      channelId: data.channelId,
      weightValue: Number.isFinite(numericWeight) ? numericWeight : null,
      weightUnit: data.weightUnit,
    });
  };

  const currentUnitPoints = weightPoints
    .map((point) => ({
      weekStartISO: point.weekStartISO,
      value: convertWeight(point.weightValue, point.weightUnit, data.weightUnit),
    }))
    .slice(-12);

  const latestPoint =
    data.weightValue.trim() !== '' && Number.isFinite(parseFloat(data.weightValue))
      ? {
          weekStartISO,
          value: parseFloat(data.weightValue),
        }
      : null;

  const graphPoints = [...currentUnitPoints];
  if (latestPoint) {
    const existingIdx = graphPoints.findIndex((p) => p.weekStartISO === weekStartISO);
    if (existingIdx >= 0) {
      graphPoints[existingIdx] = latestPoint;
    } else {
      graphPoints.push(latestPoint);
    }
  }

  const sortedGraphPoints = [...graphPoints].sort((a, b) =>
    a.weekStartISO.localeCompare(b.weekStartISO)
  );
  const maxValue = sortedGraphPoints.length
    ? Math.max(...sortedGraphPoints.map((p) => p.value))
    : 0;
  const minValue = sortedGraphPoints.length
    ? Math.min(...sortedGraphPoints.map((p) => p.value))
    : 0;
  const range = Math.max(maxValue - minValue, 1);
  const width = 560;
  const height = 230;
  const plotXMin = 56;
  const plotXMax = width - 18;
  const plotYMin = 16;
  const plotYMax = height - 56;
  const yTicks = 4;

  const getX = (index: number) =>
    sortedGraphPoints.length <= 1
      ? (plotXMin + plotXMax) / 2
      : plotXMin + (index * (plotXMax - plotXMin)) / (sortedGraphPoints.length - 1);

  const getY = (value: number) => {
    const normalizedY = (value - minValue) / range;
    return plotYMax - normalizedY * (plotYMax - plotYMin);
  };

  const polyline = sortedGraphPoints
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <SectionCard
      title="Weekly Weigh-In"
      onSubmit={() => {
        void submitData();
      }}
      onClear={clearData}
      disabledSubmit={!canSubmit || submitted}
      submitDisabledReason={
        submitted
          ? 'Already submitted for this week.'
          : (submitDisabledReason || 'Available Thursday or later')
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-emerald-100/90 mb-2">
              Weight
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={data.weightValue}
                onChange={(e) => updateData({ weightValue: e.target.value })}
                placeholder="145"
                className="w-32 px-3 py-2 bg-zinc-800/90 border border-emerald-300/45 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 focus:border-emerald-200/80 transition-colors"
              />
              <div className="inline-flex rounded-lg border border-emerald-300/55 overflow-hidden">
                <button
                  type="button"
                  onClick={() => updateData({ weightUnit: 'kg' })}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    data.weightUnit === 'kg'
                      ? 'bg-[#456f57] text-white'
                      : 'bg-zinc-800/90 text-emerald-200 hover:bg-zinc-700'
                  }`}
                >
                  kg
                </button>
                <button
                  type="button"
                  onClick={() => updateData({ weightUnit: 'lb' })}
                  className={`px-3 py-2 text-sm font-medium transition-colors border-l border-emerald-300/55 ${
                    data.weightUnit === 'lb'
                      ? 'bg-[#456f57] text-white'
                      : 'bg-zinc-800/90 text-emerald-200 hover:bg-zinc-700'
                  }`}
                >
                  lbs
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTrendExpanded((prev) => !prev)}
            className="justify-self-start md:justify-self-end px-3 py-2 rounded-lg border border-emerald-300/60 bg-zinc-800/90 text-emerald-100 text-sm hover:bg-zinc-700 transition-colors"
          >
            {trendExpanded ? 'Hide weight trend' : 'Show weight trend'}
          </button>
        </div>

        {trendExpanded && (
          <div className="rounded-xl border border-emerald-300/50 bg-zinc-900/70 p-3">
            {sortedGraphPoints.length >= 2 ? (
              <div className="space-y-2">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-44"
                  role="img"
                  aria-label="Weight trend chart"
                >
                  <line
                    x1={plotXMin}
                    y1={plotYMin}
                    x2={plotXMin}
                    y2={plotYMax}
                    stroke="rgba(214, 228, 216, 0.85)"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={plotXMin}
                    y1={plotYMax}
                    x2={plotXMax}
                    y2={plotYMax}
                    stroke="rgba(214, 228, 216, 0.85)"
                    strokeWidth="1.2"
                  />
                  {Array.from({ length: yTicks + 1 }, (_, index) => {
                    const y = plotYMin + (index * (plotYMax - plotYMin)) / yTicks;
                    const value = maxValue - (index * (maxValue - minValue)) / yTicks;
                    return (
                      <g key={`y-tick-${index}`}>
                        <line
                          x1={plotXMin}
                          y1={y}
                          x2={plotXMax}
                          y2={y}
                          stroke="rgba(214, 228, 216, 0.18)"
                          strokeWidth="1"
                        />
                        <text
                          x={plotXMin - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-white/80 text-[10px]"
                        >
                          {value.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}
                  <polyline
                    fill="none"
                    stroke="rgba(52, 211, 153, 0.9)"
                    strokeWidth="3"
                    points={polyline}
                  />
                  {sortedGraphPoints.map((point, index) => {
                    const x = getX(index);
                    const y = getY(point.value);
                    return <circle key={`${point.weekStartISO}-${index}`} cx={x} cy={y} r="3.5" fill="#bbf7d0" />;
                  })}
                  {sortedGraphPoints.map((point, index) => {
                    const x = getX(index);
                    return (
                      <text
                        key={`x-label-${point.weekStartISO}-${index}`}
                        x={x}
                        y={plotYMax + 14}
                        textAnchor="middle"
                        className="fill-white/75 text-[10px]"
                      >
                        {formatWeekLabel(point.weekStartISO)}
                      </text>
                    );
                  })}
                  <text
                    x={plotXMin - 2}
                    y={plotYMin - 4}
                    textAnchor="start"
                    className="fill-white/85 text-[10px]"
                  >
                    Weight ({data.weightUnit})
                  </text>
                  <text
                    x={(plotXMin + plotXMax) / 2}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-white/85 text-[10px]"
                  >
                    Week (M/D)
                  </text>
                </svg>
                <p className="text-xs text-emerald-100/80">
                  Showing up to last 12 weeks in {data.weightUnit}.
                </p>
              </div>
            ) : (
              <p className="text-sm text-emerald-100/80">
                Add at least two weekly weigh-ins to see a trend line.
              </p>
            )}
          </div>
        )}

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


