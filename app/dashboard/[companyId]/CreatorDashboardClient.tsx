'use client';

import { useEffect, useMemo, useState } from 'react';
import { CHALLENGE_TOPICS } from '@/lib/challenges';

interface RetentionPayload {
  activePrev: number;
  activeCurrent: number;
  retainedCount: number;
  retentionRate: number;
}

interface TrendPoint {
  weekStartISO: string;
  dailyRent: number;
  reflection: number;
  weighIn: number;
}

interface AtRiskUser {
  userId: string;
  whopUserId: string;
  name: string | null;
  lastActivityAt: string | null;
  daysInactive: number;
  riskLevel: 'medium' | 'high';
}

interface ChallengeItem {
  id: string;
  title: string;
  topic: string;
  cadence: 'DAILY' | 'SPRINT';
  durationDays: number;
  channelId: string;
  startsAt: string;
  endsAt: string;
  _count: {
    participants: number;
    proofs: number;
  };
}

interface ChallengeFormState {
  title: string;
  topic: string;
  durationDays: number;
  reminderHourUtc: number;
  channelId: string;
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function CreatorDashboardClient() {
  const [retention, setRetention] = useState<RetentionPayload | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [atRiskUsers, setAtRiskUsers] = useState<AtRiskUser[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [config, setConfig] = useState({
    defaultChannelId: '',
    reengagementInactiveDays: 14,
    reengagementCooldownDays: 7,
    leaderboardIntervalMonths: 2,
    leaderboardTopN: 3,
  });
  const [loading, setLoading] = useState(true);
  const [challengeForm, setChallengeForm] = useState<ChallengeFormState>({
    title: '',
    topic: CHALLENGE_TOPICS[0],
    durationDays: 30,
    reminderHourUtc: 15,
    channelId: '',
  });

  const refresh = async () => {
    const [retentionRes, trendsRes, riskRes, challengeRes, configRes] = await Promise.all([
      fetch('/api/dashboard/retention'),
      fetch('/api/dashboard/interaction-trends'),
      fetch('/api/dashboard/at-risk-users'),
      fetch('/api/challenges'),
      fetch('/api/dashboard/config'),
    ]);
    if (retentionRes.ok) setRetention(await retentionRes.json());
    if (trendsRes.ok) setTrends(((await trendsRes.json()) as { series: TrendPoint[] }).series || []);
    if (riskRes.ok) setAtRiskUsers(((await riskRes.json()) as { users: AtRiskUser[] }).users || []);
    if (challengeRes.ok) setChallenges(((await challengeRes.json()) as { challenges: ChallengeItem[] }).challenges || []);
    if (configRes.ok) {
      const payload = (await configRes.json()) as { config: typeof config };
      setConfig({
        defaultChannelId: payload.config.defaultChannelId || '',
        reengagementInactiveDays: payload.config.reengagementInactiveDays ?? 14,
        reengagementCooldownDays: payload.config.reengagementCooldownDays ?? 7,
        leaderboardIntervalMonths: payload.config.leaderboardIntervalMonths ?? 2,
        leaderboardTopN: payload.config.leaderboardTopN ?? 3,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const chart = useMemo(() => {
    const width = 680;
    const height = 260;
    const padLeft = 52;
    const padRight = 18;
    const padTop = 20;
    const padBottom = 46;
    const maxY = Math.max(1, ...trends.flatMap((point) => [point.dailyRent, point.reflection, point.weighIn]));
    const yTicks = 4;
    const getX = (idx: number) =>
      trends.length <= 1 ? (padLeft + (width - padRight)) / 2 : padLeft + (idx * (width - padLeft - padRight)) / (trends.length - 1);
    const getY = (value: number) => {
      const usable = height - padTop - padBottom;
      return height - padBottom - (value / maxY) * usable;
    };
    const line = (key: keyof TrendPoint) =>
      trends.map((point, idx) => `${getX(idx)},${getY(point[key] as number)}`).join(' ');

    return { width, height, padLeft, padRight, padTop, padBottom, maxY, yTicks, getX, getY, line };
  }, [trends]);

  const saveConfig = async () => {
    const res = await fetch('/api/dashboard/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) alert('Failed to save config');
  };

  const createChallenge = async () => {
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(challengeForm),
    });
    if (!res.ok) {
      const payload = await res.json();
      alert(payload.error || 'Failed to create challenge');
      return;
    }
    setChallengeForm((prev) => ({ ...prev, title: '' }));
    await refresh();
  };

  const runJob = async (path: string) => {
    const res = await fetch(path, { method: 'POST' });
    const payload = await res.json();
    if (!res.ok) {
      alert(payload.error || 'Job failed');
      return;
    }
    alert('Job executed successfully');
    await refresh();
  };

  if (loading) {
    return <div className="text-emerald-100/90">Loading creator dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
          <div className="text-xs text-emerald-200/70">Retention</div>
          <div className="text-2xl font-semibold text-emerald-100">{((retention?.retentionRate || 0) * 100).toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
          <div className="text-xs text-emerald-200/70">Active Prev Month</div>
          <div className="text-2xl font-semibold text-emerald-100">{retention?.activePrev || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
          <div className="text-xs text-emerald-200/70">Active Current Month</div>
          <div className="text-2xl font-semibold text-emerald-100">{retention?.activeCurrent || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
          <div className="text-xs text-emerald-200/70">Retained Users</div>
          <div className="text-2xl font-semibold text-emerald-100">{retention?.retainedCount || 0}</div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
        <h2 className="mb-3 text-lg font-semibold text-emerald-100">Interaction Trends (Last 12 Weeks)</h2>
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full h-64">
          <line x1={chart.padLeft} y1={chart.padTop} x2={chart.padLeft} y2={chart.height - chart.padBottom} stroke="rgba(214,228,216,0.9)" />
          <line
            x1={chart.padLeft}
            y1={chart.height - chart.padBottom}
            x2={chart.width - chart.padRight}
            y2={chart.height - chart.padBottom}
            stroke="rgba(214,228,216,0.9)"
          />
          {Array.from({ length: chart.yTicks + 1 }, (_, idx) => {
            const value = Math.round((chart.maxY * (chart.yTicks - idx)) / chart.yTicks);
            const y = chart.padTop + (idx * (chart.height - chart.padTop - chart.padBottom)) / chart.yTicks;
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={chart.padLeft}
                  y1={y}
                  x2={chart.width - chart.padRight}
                  y2={y}
                  stroke="rgba(214,228,216,0.15)"
                />
                <text x={chart.padLeft - 8} y={y + 3} textAnchor="end" className="fill-white/80 text-[10px]">
                  {value}
                </text>
              </g>
            );
          })}
          <polyline fill="none" stroke="#34d399" strokeWidth="2.5" points={chart.line('dailyRent')} />
          <polyline fill="none" stroke="#60a5fa" strokeWidth="2.5" points={chart.line('reflection')} />
          <polyline fill="none" stroke="#fbbf24" strokeWidth="2.5" points={chart.line('weighIn')} />
          {trends.map((point, idx) => (
            <text
              key={point.weekStartISO}
              x={chart.getX(idx)}
              y={chart.height - chart.padBottom + 14}
              textAnchor="middle"
              className="fill-white/75 text-[10px]"
            >
              {formatShortDate(point.weekStartISO)}
            </text>
          ))}
          <text x={12} y={14} className="fill-white/90 text-[10px]">
            Interaction count
          </text>
          <text x={(chart.padLeft + chart.width - chart.padRight) / 2} y={chart.height - 10} textAnchor="middle" className="fill-white/90 text-[10px]">
            Week start date
          </text>
        </svg>
        <div className="mt-2 flex gap-4 text-xs text-emerald-100/80">
          <span>Daily Log</span>
          <span>Weekly Reflection</span>
          <span>Weekly Weigh-In</span>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4">
        <h2 className="mb-3 text-lg font-semibold text-emerald-100">At-Risk Users</h2>
        <div className="space-y-2">
          {atRiskUsers.length === 0 && <p className="text-sm text-emerald-100/70">No users currently flagged as at-risk.</p>}
          {atRiskUsers.map((user) => (
            <div key={user.userId} className="rounded-lg border border-emerald-300/20 bg-zinc-800/60 px-3 py-2 text-sm text-emerald-100">
              <span className="font-medium">{user.name || user.whopUserId}</span> - {user.daysInactive} days inactive ({user.riskLevel})
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-emerald-100">Automation Settings</h2>
        <input
          value={config.defaultChannelId}
          onChange={(e) => setConfig((prev) => ({ ...prev, defaultChannelId: e.target.value }))}
          placeholder="Default channel ID"
          className="w-full rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100"
        />
        <button
          type="button"
          onClick={() => void saveConfig()}
          className="rounded-lg border border-emerald-300/50 bg-[#456f57] px-3 py-2 text-sm text-white"
        >
          Save Settings
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void runJob('/api/jobs/challenge-reminders')} className="rounded-lg border border-emerald-300/50 px-3 py-2 text-xs text-emerald-100">
            Run challenge reminders
          </button>
          <button type="button" onClick={() => void runJob('/api/jobs/reengagement')} className="rounded-lg border border-emerald-300/50 px-3 py-2 text-xs text-emerald-100">
            Run re-engagement
          </button>
          <button type="button" onClick={() => void runJob('/api/jobs/consistency-leaderboard')} className="rounded-lg border border-emerald-300/50 px-3 py-2 text-xs text-emerald-100">
            Run consistency leaderboard
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-300/30 bg-zinc-900/70 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-emerald-100">Challenge Builder</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={challengeForm.title}
            onChange={(e) => setChallengeForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Challenge title"
            className="rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100"
          />
          <select
            value={challengeForm.topic}
            onChange={(e) => setChallengeForm((prev) => ({ ...prev, topic: e.target.value }))}
            className="rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100"
          >
            {CHALLENGE_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={challengeForm.durationDays}
            onChange={(e) => setChallengeForm((prev) => ({ ...prev, durationDays: parseInt(e.target.value, 10) || 0 }))}
            placeholder="Duration days"
            className="rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100"
          />
          <input
            type="number"
            value={challengeForm.reminderHourUtc}
            onChange={(e) => setChallengeForm((prev) => ({ ...prev, reminderHourUtc: parseInt(e.target.value, 10) || 0 }))}
            placeholder="Daily reminder hour UTC"
            className="rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100"
          />
          <input
            value={challengeForm.channelId}
            onChange={(e) => setChallengeForm((prev) => ({ ...prev, channelId: e.target.value }))}
            placeholder="Challenge channel ID"
            className="rounded-lg border border-emerald-300/40 bg-zinc-800 px-3 py-2 text-sm text-emerald-100 md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={() => void createChallenge()}
          className="rounded-lg border border-emerald-300/50 bg-[#456f57] px-3 py-2 text-sm text-white"
        >
          Create Challenge
        </button>
        <div className="space-y-2">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="rounded-lg border border-emerald-300/20 bg-zinc-800/60 px-3 py-2 text-sm text-emerald-100">
              <div className="font-medium">{challenge.title}</div>
              <div className="text-xs text-emerald-100/75">
                {challenge.topic} - {challenge.cadence} - {challenge.durationDays} days - participants {challenge._count.participants}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
