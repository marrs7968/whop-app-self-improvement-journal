import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { ensureUser } from '@/lib/journal-store';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    const { id } = await params;

    await ensureUser({
      scopedUserId: context.scopedUserId,
      whopUserId: context.userId,
      companyId: context.companyId,
      experienceId: context.experienceId,
    });

    const participant = await prisma.challengeParticipant.upsert({
      where: {
        challengeId_userId: {
          challengeId: id,
          userId: context.scopedUserId,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        challengeId: id,
        userId: context.scopedUserId,
      },
    });

    return NextResponse.json({ participant });
  } catch (error) {
    console.error('Error joining challenge:', error);
    return NextResponse.json({ error: 'Failed to join challenge' }, { status: 401 });
  }
}
