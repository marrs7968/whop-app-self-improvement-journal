import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { deserializeWeighInText } from '@/lib/weighIn';

export async function GET() {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

    const submissions = await prisma.submission.findMany({
      where: {
        userId: context.scopedUserId,
        sectionKey: 'weigh-in',
      },
      select: {
        weekStartISO: true,
        text: true,
      },
      orderBy: {
        weekStartISO: 'asc',
      },
    });

    const points = submissions
      .map((submission) => {
        const parsed = deserializeWeighInText(submission.text);
        if (parsed.weightValue === null) return null;
        return {
          weekStartISO: submission.weekStartISO,
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
