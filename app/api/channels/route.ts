import { NextRequest, NextResponse } from 'next/server';
import { listChannels } from '@/lib/whop';

export async function GET(request: NextRequest) {
  try {
    const channels = await listChannels();
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

