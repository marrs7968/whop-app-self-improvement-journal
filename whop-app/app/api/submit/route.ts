import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { postToChannel } from '@/lib/whop';
import { canSubmitSection } from '@/lib/sections';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';

async function ensureUser(userId: string, whopUserId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      whopUserId,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    
    const body = await request.json();
    const { weekStartISO, sectionKey, dayIndex, text, mediaIds, channelId } = body;

    if (!weekStartISO || !sectionKey) {
      return NextResponse.json(
        { error: 'weekStartISO and sectionKey are required' },
        { status: 400 }
      );
    }

    // Check if submission is allowed based on rules
    if (!canSubmitSection(sectionKey as any)) {
      return NextResponse.json(
        { error: 'Submission not allowed at this time' },
        { status: 400 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel selection is required' },
        { status: 400 }
      );
    }

    // Post to Whop channel
    try {
      await postToChannel(channelId, text || '', mediaIds || []);
    } catch (error) {
      console.error('Error posting to channel:', error);
      return NextResponse.json(
        { error: 'Failed to post to channel' },
        { status: 500 }
      );
    }

    await ensureUser(context.scopedUserId, context.userId);

    const normalizedDayIndex = typeof dayIndex === 'number' ? dayIndex : dayIndex ? parseInt(dayIndex, 10) : null;
    const submissionData = await prisma.submission.create({
      data: {
        userId: context.scopedUserId,
        weekStartISO,
        sectionKey,
        dayIndex: normalizedDayIndex,
        text: text || '',
        mediaIds: JSON.stringify(mediaIds || []),
        channelId,
      },
    });

    // Clear matching draft after successful submit.
    await prisma.draft.deleteMany({
      where: {
        userId: context.scopedUserId,
        weekStartISO,
        sectionKey,
        dayIndex: normalizedDayIndex,
      },
    });

    return NextResponse.json({ 
      success: true, 
      submission: {
        ...submissionData,
        mediaIds: mediaIds || [],
      }
    });
  } catch (error) {
    console.error('Error submitting:', error);
    return NextResponse.json(
      { error: 'Failed to submit' },
      { status: 401 }
    );
  }
}

