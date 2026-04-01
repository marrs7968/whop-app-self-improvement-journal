import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error loading dashboard config:', error);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 401 });
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
      defaultChannelId,
      reengagementInactiveDays,
      reengagementCooldownDays,
      leaderboardIntervalMonths,
      leaderboardTopN,
    } = body as {
      defaultChannelId?: string;
      reengagementInactiveDays?: number;
      reengagementCooldownDays?: number;
      leaderboardIntervalMonths?: number;
      leaderboardTopN?: number;
    };

    const config = await prisma.creatorDashboardConfig.upsert({
      where: { companyId: context.companyId },
      update: {
        defaultChannelId: defaultChannelId ?? null,
        reengagementInactiveDays: reengagementInactiveDays ?? undefined,
        reengagementCooldownDays: reengagementCooldownDays ?? undefined,
        leaderboardIntervalMonths: leaderboardIntervalMonths ?? undefined,
        leaderboardTopN: leaderboardTopN ?? undefined,
      },
      create: {
        companyId: context.companyId,
        defaultChannelId: defaultChannelId ?? null,
        reengagementInactiveDays: reengagementInactiveDays ?? 14,
        reengagementCooldownDays: reengagementCooldownDays ?? 7,
        leaderboardIntervalMonths: leaderboardIntervalMonths ?? 2,
        leaderboardTopN: leaderboardTopN ?? 3,
      },
    });
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating dashboard config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 401 });
  }
}
