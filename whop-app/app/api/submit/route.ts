import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { postToChannel } from '@/lib/whop';
import { canSubmitSection } from '@/lib/sections';

// Mock database for submissions (replace with Prisma when database is working)
const mockSubmissions: Record<string, any[]> = {};

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
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

    // Create submission record
    const submissionData = {
      id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      weekStartISO,
      sectionKey,
      dayIndex: dayIndex || null,
      text: text || '',
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
      submission: submissionData 
    });
  } catch (error) {
    console.error('Error submitting:', error);
    return NextResponse.json(
      { error: 'Failed to submit' },
      { status: 401 }
    );
  }
}

