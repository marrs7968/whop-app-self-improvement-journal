import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';
import { getConsistencyLeaderboard } from '@/lib/analytics';
import { sendChannelNotification } from '@/lib/notifications';

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

export async function POST() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context' }, { status: 400 });
    }

    const config = await prisma.creatorDashboardConfig.upsert({
      where: { companyId: context.companyId },
      update: {},
      create: { companyId: context.companyId },
    });
    if (!config.defaultChannelId) {
      return NextResponse.json({ error: 'Set default channel in dashboard before running job.' }, { status: 400 });
    }

    const end = startOfMonth(new Date());
    const start = addMonths(end, -config.leaderboardIntervalMonths);
    const leaderboard = await getConsistencyLeaderboard({
      companyId: context.companyId,
      start,
      end,
      topN: config.leaderboardTopN,
    });

    if (!leaderboard.length) {
      return NextResponse.json({ success: true, sent: false, reason: 'No data for window' });
    }

    const lines = leaderboard.map((entry, idx) => {
      return `${idx + 1}. <@${entry.userId.split(':').slice(-1)[0]}> - ${entry.score} pts (active ${entry.activeDays}d, streak bonus ${entry.streakBonus}, coverage ${entry.categoryCoverageBonus})`;
    });
    const message = `Top ${leaderboard.length} most consistent users for this period:\n${lines.join('\n')}`;

    const result = await sendChannelNotification({
      type: 'CONSISTENCY_LEADERBOARD',
      companyId: context.companyId,
      channelId: config.defaultChannelId,
      message,
      dedupeParts: [
        'consistency',
        context.companyId,
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
      ],
    });

    return NextResponse.json({ success: true, sent: result.sent, topUsers: leaderboard });
  } catch (error) {
    console.error('Error running consistency leaderboard job:', error);
    return NextResponse.json({ error: 'Failed to run consistency leaderboard job' }, { status: 401 });
  }
}
