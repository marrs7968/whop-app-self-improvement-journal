import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';
import { getSprintMilestones } from '@/lib/challenges';
import { sendChannelNotification } from '@/lib/notifications';

function sameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function POST() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context' }, { status: 400 });
    }

    const now = new Date();
    const challenges = await prisma.challenge.findMany({
      where: {
        companyId: context.companyId,
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        participants: {
          where: { isActive: true },
          select: { userId: true },
        },
      },
    });

    let sentCount = 0;
    for (const challenge of challenges) {
      const mentions = challenge.participants
        .map((participant) => `<@${participant.userId.split(':').slice(-1)[0]}>`)
        .join(' ');
      if (!mentions) continue;

      if (challenge.cadence === 'DAILY') {
        const reminderHour = challenge.reminderHourUtc ?? 15;
        if (now.getUTCHours() !== reminderHour) continue;
        const message = `${mentions}\nDaily reminder for **${challenge.title}**: submit your proof for today.`;
        const result = await sendChannelNotification({
          type: 'DAILY_CHALLENGE_REMINDER',
          companyId: context.companyId,
          channelId: challenge.channelId,
          challengeId: challenge.id,
          message,
          dedupeParts: ['daily-reminder', challenge.id, now.toISOString().slice(0, 10)],
        });
        if (result.sent) sentCount += 1;
      } else {
        const milestones = getSprintMilestones(challenge.startsAt, challenge.endsAt);
        const milestoneHit = milestones.find((milestone) => sameUtcDate(milestone, now));
        if (!milestoneHit) continue;
        const message = `${mentions}\nSprint checkpoint for **${challenge.title}** reached. Share your progress proof now.`;
        const result = await sendChannelNotification({
          type: 'SPRINT_MILESTONE_REMINDER',
          companyId: context.companyId,
          channelId: challenge.channelId,
          challengeId: challenge.id,
          message,
          dedupeParts: ['sprint-reminder', challenge.id, milestoneHit.toISOString().slice(0, 10)],
        });
        if (result.sent) sentCount += 1;
      }
    }

    return NextResponse.json({ success: true, sentCount, challengeCount: challenges.length });
  } catch (error) {
    console.error('Error running challenge reminder job:', error);
    return NextResponse.json({ error: 'Failed to run challenge reminder job' }, { status: 401 });
  }
}
