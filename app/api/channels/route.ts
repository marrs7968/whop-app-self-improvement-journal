import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { listChannels } from '@/lib/whop';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceIdFromQuery = searchParams.get('experienceId') || undefined;

    let companyId: string | undefined;
    let experienceId = experienceIdFromQuery;

    try {
      const headersList = await headers();
      const tokenPayload = await whopSdk.verifyUserToken(headersList);

      companyId =
        (tokenPayload as any).companyId ??
        (tokenPayload as any).company_id ??
        (tokenPayload as any).bizId ??
        (tokenPayload as any).businessId ??
        undefined;

      experienceId =
        experienceId ||
        (tokenPayload as any).experienceId ||
        (tokenPayload as any).experience_id ||
        undefined;
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
