import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { deserializeWeighInText } from '@/lib/weighIn';

// Shares mock store with submit route behavior in root path deployments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any;
const rootMockSubmissions: Record<string, any[]> = globalThis.__mockSubmissions ?? {};
if (!globalThis.__mockSubmissions) {
  globalThis.__mockSubmissions = rootMockSubmissions;
}

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);

    const submissions = (rootMockSubmissions[userId] || [])
      .filter((entry) => entry.sectionKey === 'weigh-in')
      .sort((a, b) => String(a.weekStartISO).localeCompare(String(b.weekStartISO)));

    const points = submissions
      .map((entry) => {
        const parsed = deserializeWeighInText(entry.text || '');
        if (parsed.weightValue === null) return null;
        return {
          weekStartISO: entry.weekStartISO,
          weightValue: parsed.weightValue,
          weightUnit: parsed.weightUnit,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ points });
  } catch (error) {
    console.error('Error fetching weight trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight trend' },
      { status: 401 }
    );
  }
}
