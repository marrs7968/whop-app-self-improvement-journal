import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { getRetentionMetrics } from '@/lib/analytics';

export async function GET() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context.' }, { status: 400 });
    }

    const metrics = await getRetentionMetrics(context.companyId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch retention metrics' }, { status: 401 });
  }
}
