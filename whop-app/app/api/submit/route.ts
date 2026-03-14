import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { postToChannel } from '@/lib/whop';
import { canSubmitSection } from '@/lib/sections';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { deserializeWeighInText, formatWeighInChatMessage, serializeWeighInData, type WeightUnit } from '@/lib/weighIn';

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

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

    const { searchParams } = new URL(request.url);
    const weekStartISO = searchParams.get('weekStartISO');

    if (!weekStartISO) {
      return NextResponse.json(
        { error: 'weekStartISO is required' },
        { status: 400 }
      );
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: context.scopedUserId,
        weekStartISO,
      },
      select: {
        sectionKey: true,
        dayIndex: true,
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);
    
    const body = await request.json();
    const { weekStartISO, sectionKey, dayIndex, text, mediaIds, channelId, weightValue, weightUnit } = body;

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

    const normalizedWeight =
      typeof weightValue === 'number'
        ? weightValue
        : typeof weightValue === 'string' && weightValue.trim() !== ''
        ? parseFloat(weightValue)
        : null;
    const normalizedWeightUnit: WeightUnit = weightUnit === 'kg' ? 'kg' : 'lb';
    const notes = text || '';
    const storedText =
      sectionKey === 'weigh-in'
        ? serializeWeighInData({
            notes,
            weightValue: Number.isFinite(normalizedWeight as number) ? (normalizedWeight as number) : null,
            weightUnit: normalizedWeightUnit,
          })
        : notes;
    const chatText =
      sectionKey === 'weigh-in'
        ? formatWeighInChatMessage({
            submittedAt: new Date(),
            notes,
            weightValue: Number.isFinite(normalizedWeight as number) ? (normalizedWeight as number) : null,
            weightUnit: normalizedWeightUnit,
          })
        : notes;

    // Post to Whop channel
    try {
      await postToChannel(channelId, chatText || '', mediaIds || []);
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
        text: storedText,
        mediaIds: JSON.stringify(mediaIds || []),
        channelId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      submission: {
        ...submissionData,
        ...(sectionKey === 'weigh-in' ? deserializeWeighInText(submissionData.text || '') : {}),
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

