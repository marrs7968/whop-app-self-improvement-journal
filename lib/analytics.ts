import { prisma } from '@/lib/prisma';

type InteractionSeriesKey = 'daily-rent' | 'reflection' | 'weigh-in';

export interface RetentionMetrics {
  activePrev: number;
  activeCurrent: number;
  retainedCount: number;
  retentionRate: number;
  monthStartISO: string;
  prevMonthStartISO: string;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekBucketISO(date: Date): string {
  const day = date.getUTCDay();
  const sundayOffset = day;
  const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sundayOffset));
  return formatDateISO(weekStart);
}

export async function getRetentionMetrics(companyId: string, now = new Date()): Promise<RetentionMetrics> {
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = addMonths(currentMonthStart, -1);
  const nextMonthStart = addMonths(currentMonthStart, 1);

  const prevUsers = await prisma.submission.findMany({
    where: {
      companyId,
      submittedAt: {
        gte: prevMonthStart,
        lt: currentMonthStart,
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const currentUsers = await prisma.submission.findMany({
    where: {
      companyId,
      submittedAt: {
        gte: currentMonthStart,
        lt: nextMonthStart,
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const prevSet = new Set(prevUsers.map((u) => u.userId));
  const currentSet = new Set(currentUsers.map((u) => u.userId));
  let retainedCount = 0;
  for (const userId of currentSet) {
    if (prevSet.has(userId)) retainedCount += 1;
  }

  const activePrev = prevSet.size;
  const activeCurrent = currentSet.size;
  const retentionRate = activePrev > 0 ? retainedCount / activePrev : 0;

  return {
    activePrev,
    activeCurrent,
    retainedCount,
    retentionRate,
    monthStartISO: formatDateISO(currentMonthStart),
    prevMonthStartISO: formatDateISO(prevMonthStart),
  };
}

export async function getInteractionTrend(companyId: string, weeks = 12, now = new Date()) {
  const end = startOfDayUtc(now);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - weeks * 7);

  const submissions = await prisma.submission.findMany({
    where: {
      companyId,
      submittedAt: {
        gte: start,
        lte: now,
      },
      sectionKey: {
        in: ['daily-rent', 'reflection', 'weigh-in'],
      },
    },
    select: {
      sectionKey: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  const buckets = new Map<string, Record<InteractionSeriesKey, number>>();
  for (const submission of submissions) {
    const bucket = getWeekBucketISO(submission.submittedAt);
    const current = buckets.get(bucket) || { 'daily-rent': 0, reflection: 0, 'weigh-in': 0 };
    if (submission.sectionKey === 'daily-rent' || submission.sectionKey === 'reflection' || submission.sectionKey === 'weigh-in') {
      current[submission.sectionKey] += 1;
    }
    buckets.set(bucket, current);
  }

  const series = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStartISO, counts]) => ({
      weekStartISO,
      dailyRent: counts['daily-rent'],
      reflection: counts.reflection,
      weighIn: counts['weigh-in'],
    }));

  return { series };
}

export async function getAtRiskUsers(companyId: string, now = new Date()) {
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, whopUserId: true },
  });

  const latestSubmissionByUser = await prisma.submission.groupBy({
    by: ['userId'],
    where: { companyId },
    _max: { submittedAt: true },
  });

  const latestMap = new Map(latestSubmissionByUser.map((entry) => [entry.userId, entry._max.submittedAt]));
  const dayMs = 24 * 60 * 60 * 1000;

  const atRisk: Array<{
    userId: string;
    whopUserId: string;
    name: string | null;
    lastActivityAt: string | null;
    daysInactive: number;
    riskLevel: 'medium' | 'high';
  }> = [];

  for (const user of users) {
    const latest = latestMap.get(user.id);
    if (!latest) {
      atRisk.push({
        userId: user.id,
        whopUserId: user.whopUserId,
        name: user.name || null,
        lastActivityAt: null,
        daysInactive: 9999,
        riskLevel: 'high',
      });
      continue;
    }

    const daysInactive = Math.floor((now.getTime() - latest.getTime()) / dayMs);
    if (daysInactive < 14) continue;
    atRisk.push({
      userId: user.id,
      whopUserId: user.whopUserId,
      name: user.name || null,
      lastActivityAt: latest.toISOString(),
      daysInactive,
      riskLevel: daysInactive >= 21 ? 'high' : 'medium',
    });
  }

  atRisk.sort((a, b) => b.daysInactive - a.daysInactive);

  return { users: atRisk };
}

export async function getConsistencyLeaderboard(params: {
  companyId: string;
  start: Date;
  end: Date;
  topN: number;
}) {
  const { companyId, start, end, topN } = params;
  const submissions = await prisma.submission.findMany({
    where: {
      companyId,
      submittedAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      userId: true,
      sectionKey: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  const byUser = new Map<string, { activeDays: Set<string>; categories: Set<string>; dates: string[] }>();
  for (const submission of submissions) {
    const entry = byUser.get(submission.userId) || { activeDays: new Set(), categories: new Set(), dates: [] };
    entry.activeDays.add(formatDateISO(submission.submittedAt));
    entry.categories.add(submission.sectionKey);
    entry.dates.push(formatDateISO(submission.submittedAt));
    byUser.set(submission.userId, entry);
  }

  const scored = Array.from(byUser.entries()).map(([userId, entry]) => {
    const uniqueDates = Array.from(new Set(entry.dates)).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;
    for (const dateISO of uniqueDates) {
      const curr = new Date(`${dateISO}T00:00:00.000Z`);
      if (!prevDate) {
        currentStreak = 1;
      } else {
        const diffDays = Math.floor((curr.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
        currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      prevDate = curr;
    }

    const activeDays = entry.activeDays.size;
    const categoryCoverageBonus = entry.categories.size;
    const streakBonus = Math.floor(maxStreak / 7);
    const score = activeDays + streakBonus + categoryCoverageBonus;

    return { userId, score, activeDays, streakBonus, categoryCoverageBonus };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
