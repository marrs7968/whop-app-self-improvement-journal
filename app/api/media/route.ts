import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { getMediaMetadata } from '@/lib/whop';

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    await whopSdk.verifyUserToken(headersList);

    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string')
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ media: [] });
    }

    const media = await getMediaMetadata(ids);
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching media metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media metadata' },
      { status: 401 }
    );
  }
}
