import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';

// Mock database for now (replace with Prisma when database is working)
const mockDrafts: Record<string, any[]> = {};

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    const { searchParams } = new URL(request.url);
    const weekStartISO = searchParams.get('weekStartISO');
    const sectionKey = searchParams.get('sectionKey');
    const dayIndex = searchParams.get('dayIndex');

    if (!weekStartISO) {
      return NextResponse.json(
        { error: 'weekStartISO is required' },
        { status: 400 }
      );
    }

    const userDrafts = mockDrafts[userId] || [];
    let filteredDrafts = userDrafts.filter(draft => draft.weekStartISO === weekStartISO);

    if (sectionKey) {
      filteredDrafts = filteredDrafts.filter(draft => draft.sectionKey === sectionKey);
    }

    if (dayIndex !== null) {
      const dayIndexNum = parseInt(dayIndex);
      filteredDrafts = filteredDrafts.filter(draft => draft.dayIndex === dayIndexNum);
    }

    return NextResponse.json(filteredDrafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 401 }
    );
  }
}

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

    if (!mockDrafts[userId]) {
      mockDrafts[userId] = [];
    }

    // Find existing draft
    const existingDraftIndex = mockDrafts[userId].findIndex(
      draft => draft.weekStartISO === weekStartISO && 
               draft.sectionKey === sectionKey && 
               draft.dayIndex === dayIndex
    );

    const draftData = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      weekStartISO,
      sectionKey,
      dayIndex: dayIndex || null,
      text: text || '',
      mediaIds: JSON.stringify(mediaIds || []),
      channelId: channelId || null,
      updatedAt: new Date().toISOString()
    };

    if (existingDraftIndex >= 0) {
      mockDrafts[userId][existingDraftIndex] = draftData;
    } else {
      mockDrafts[userId].push(draftData);
    }

    return NextResponse.json(draftData);
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 401 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const headersList = await headers();
    const { userId } = await whopSdk.verifyUserToken(headersList);
    
    const { searchParams } = new URL(request.url);
    const weekStartISO = searchParams.get('weekStartISO');
    const sectionKey = searchParams.get('sectionKey');
    const dayIndex = searchParams.get('dayIndex');

    if (!weekStartISO || !sectionKey) {
      return NextResponse.json(
        { error: 'weekStartISO and sectionKey are required' },
        { status: 400 }
      );
    }

    if (!mockDrafts[userId]) {
      return NextResponse.json({ success: true });
    }

    const dayIndexNum = dayIndex ? parseInt(dayIndex) : null;
    
    mockDrafts[userId] = mockDrafts[userId].filter(
      draft => !(draft.weekStartISO === weekStartISO && 
                 draft.sectionKey === sectionKey && 
                 draft.dayIndex === dayIndexNum)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 401 }
    );
  }
}

