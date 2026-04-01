import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';
import { getAtRiskUsers } from '@/lib/analytics';

export async function GET() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

    if (!context.companyId) {
      return NextResponse.json({ error: 'Missing company context.' }, { status: 400 });
    }

    const data = await getAtRiskUsers(context.companyId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching at-risk users:', error);
    return NextResponse.json({ error: 'Failed to fetch at-risk users' }, { status: 401 });
  }
}
