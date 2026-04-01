import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { getInteractionTrend } from '@/lib/analytics';

export async function GET() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context.' }, { status: 400 });
    }

    const data = await getInteractionTrend(context.companyId, 12);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching interaction trends:', error);
    return NextResponse.json({ error: 'Failed to fetch interaction trends' }, { status: 401 });
  }
}
