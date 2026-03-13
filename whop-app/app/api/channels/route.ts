import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { listChannels } from '@/lib/whop';
import { whopSdk } from '@/lib/whop-sdk';
import { resolveTenantContext } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceIdFromQuery = searchParams.get('experienceId') || undefined;

    let companyId: string | undefined;
    let experienceId = experienceIdFromQuery;

    try {
      const headersList = await headers();
      const tokenPayload = await whopSdk.verifyUserToken(headersList);
      const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
      companyId = context.companyId;
      experienceId = experienceId || context.experienceId;
    } catch (tokenError) {
      console.error('Could not resolve token context for channel discovery:', tokenError);
    }

    const channels = await listChannels({ companyId, experienceId });
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

