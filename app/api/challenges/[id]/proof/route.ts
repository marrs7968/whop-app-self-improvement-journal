import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';

function proofDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    const { id } = await params;
    const body = await request.json();
    const { proofText, mediaIds } = body as { proofText?: string; mediaIds?: string[] };

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      select: { id: true, cadence: true, startsAt: true, endsAt: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const now = new Date();
    if (now < challenge.startsAt || now > challenge.endsAt) {
      return NextResponse.json({ error: 'Challenge is not currently active' }, { status: 400 });
    }

    if (challenge.cadence === 'DAILY') {
      const todayISO = proofDateISO(now);
      const todayStart = new Date(`${todayISO}T00:00:00.000Z`);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

      const already = await prisma.challengeProof.findFirst({
        where: {
          challengeId: id,
          userId: context.scopedUserId,
          submittedAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
        select: { id: true },
      });
      if (already) {
        return NextResponse.json({ error: 'Daily proof already submitted today' }, { status: 409 });
      }
    }

    const proof = await prisma.challengeProof.create({
      data: {
        challengeId: id,
        userId: context.scopedUserId,
        proofText: proofText || null,
        mediaIds: JSON.stringify(mediaIds || []),
      },
    });

    await prisma.challengeParticipant.updateMany({
      where: {
        challengeId: id,
        userId: context.scopedUserId,
      },
      data: {
        lastProofAt: now,
      },
    });

    return NextResponse.json({ proof });
  } catch (error) {
    console.error('Error submitting challenge proof:', error);
    return NextResponse.json({ error: 'Failed to submit challenge proof' }, { status: 401 });
  }
}
