import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { ensureUser } from '@/lib/journal-store';
import { CHALLENGE_TOPICS, inferCadenceFromTopic } from '@/lib/challenges';

export async function GET() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context' }, { status: 400 });
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        companyId: context.companyId,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            participants: true,
            proofs: true,
          },
        },
      },
      orderBy: [{ startsAt: 'desc' }],
    });

    return NextResponse.json({ challenges, topics: CHALLENGE_TOPICS });
  } catch (error) {
    console.error('Error listing challenges:', error);
    return NextResponse.json({ error: 'Failed to list challenges' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      topic,
      durationDays,
      startsAt,
      reminderHourUtc,
      channelId,
    } = body as {
      title?: string;
      topic?: string;
      durationDays?: number;
      startsAt?: string;
      reminderHourUtc?: number;
      channelId?: string;
    };

    if (!title || !topic || !durationDays || !channelId) {
      return NextResponse.json(
        { error: 'title, topic, durationDays, and channelId are required' },
        { status: 400 }
      );
    }

    if (!CHALLENGE_TOPICS.includes(topic as (typeof CHALLENGE_TOPICS)[number])) {
      return NextResponse.json({ error: 'Invalid challenge topic' }, { status: 400 });
    }

    const cadence = inferCadenceFromTopic(topic);
    const startDate = startsAt ? new Date(startsAt) : new Date();
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + durationDays);

    await ensureUser({
      scopedUserId: context.scopedUserId,
      whopUserId: context.userId,
      companyId: context.companyId,
      experienceId: context.experienceId,
    });

    const challenge = await prisma.challenge.create({
      data: {
        companyId: context.companyId,
        experienceId: context.experienceId ?? null,
        createdByUserId: context.scopedUserId,
        title,
        topic,
        cadence,
        durationDays,
        startsAt: startDate,
        endsAt: endDate,
        reminderHourUtc: cadence === 'DAILY' ? reminderHourUtc ?? 15 : null,
        channelId,
      },
    });

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 401 });
  }
}
