import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';
import { getAtRiskUsers } from '@/lib/analytics';
import { sendChannelNotification } from '@/lib/notifications';

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

    const atRisk = await getAtRiskUsers(context.companyId);
    const candidates = atRisk.users.filter((u) => u.daysInactive >= config.reengagementInactiveDays);

    const cooldownMs = config.reengagementCooldownDays * 24 * 60 * 60 * 1000;
    const now = new Date();
    let sentCount = 0;
    for (const user of candidates) {
      const latest = await prisma.notificationDelivery.findFirst({
        where: {
          companyId: context.companyId,
          notificationType: 'REENGAGEMENT',
          userId: user.userId,
          status: 'sent',
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      });
      if (latest && now.getTime() - latest.sentAt.getTime() < cooldownMs) continue;

      const message = `Friendly nudge: <@${user.whopUserId}> has been inactive for ${user.daysInactive} days. Consider jumping back into tracking today.`;
      const result = await sendChannelNotification({
        type: 'REENGAGEMENT',
        companyId: context.companyId,
        channelId: config.defaultChannelId,
        challengeId: undefined,
        userId: user.userId,
        message,
        dedupeParts: ['reengagement', context.companyId, user.userId, now.toISOString().slice(0, 10)],
      });
      if (result.sent) sentCount += 1;
    }

    return NextResponse.json({ success: true, sentCount, candidateCount: candidates.length });
  } catch (error) {
    console.error('Error running reengagement job:', error);
    return NextResponse.json({ error: 'Failed to run reengagement job' }, { status: 401 });
  }
}
