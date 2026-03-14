import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { postToChannel } from '@/lib/whop';
import { canSubmitSection } from '@/lib/sections';
import { deserializeWeighInText, formatWeighInChatMessage, serializeWeighInData, type WeightUnit } from '@/lib/weighIn';

// Mock database for submissions (replace with Prisma when database is working)
const mockSubmissions: Record<string, any[]> = {};
// Expose for the lightweight trend endpoint in root-path deployments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__mockSubmissions = mockSubmissions;

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);

    const { searchParams } = new URL(request.url);
    const weekStartISO = searchParams.get('weekStartISO');

    if (!weekStartISO) {
      return NextResponse.json(
        { error: 'weekStartISO is required' },
        { status: 400 }
      );
    }

    const submissions = (mockSubmissions[userId] || []).filter(
      (submission) => submission.weekStartISO === weekStartISO
    );

    return NextResponse.json(
      submissions.map((submission) => ({
        sectionKey: submission.sectionKey,
        dayIndex: submission.dayIndex ?? null,
      }))
    );
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
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
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

    // Create submission record
    const submissionData = {
      id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      weekStartISO,
      sectionKey,
      dayIndex: dayIndex || null,
      text: storedText,
      mediaIds: JSON.stringify(mediaIds || []),
      channelId,
      submittedAt: new Date().toISOString()
    };

    if (!mockSubmissions[userId]) {
      mockSubmissions[userId] = [];
    }
    mockSubmissions[userId].push(submissionData);

    return NextResponse.json({ 
      success: true, 
      submission: sectionKey === 'weigh-in'
        ? {
            ...submissionData,
            ...deserializeWeighInText(submissionData.text),
          }
        : submissionData
    });
  } catch (error) {
    console.error('Error submitting:', error);
    return NextResponse.json(
      { error: 'Failed to submit' },
      { status: 401 }
    );
  }
}


