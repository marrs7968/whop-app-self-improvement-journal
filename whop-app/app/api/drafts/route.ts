import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';

function parseMediaIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      whopUserId: userId,
    },
  });
}

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

    const dayIndexFilter = dayIndex !== null ? parseInt(dayIndex, 10) : undefined;
    const drafts = await prisma.draft.findMany({
      where: {
        userId,
        weekStartISO,
        ...(sectionKey ? { sectionKey } : {}),
        ...(dayIndexFilter !== undefined && !Number.isNaN(dayIndexFilter) ? { dayIndex: dayIndexFilter } : {}),
      },
      orderBy: [{ sectionKey: 'asc' }, { dayIndex: 'asc' }],
    });

    return NextResponse.json(
      drafts.map((draft) => ({
        ...draft,
        mediaIds: parseMediaIds(draft.mediaIds),
      }))
    );
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

    await ensureUser(userId);

    const normalizedDayIndex = typeof dayIndex === 'number' ? dayIndex : dayIndex ? parseInt(dayIndex, 10) : null;

    const existing = await prisma.draft.findFirst({
      where: {
        userId,
        weekStartISO,
        sectionKey,
        dayIndex: normalizedDayIndex,
      },
      select: { id: true },
    });

    const draftData = existing
      ? await prisma.draft.update({
          where: { id: existing.id },
          data: {
            text: text || '',
            mediaIds: JSON.stringify(mediaIds || []),
            channelId: channelId || null,
          },
        })
      : await prisma.draft.create({
          data: {
            userId,
            weekStartISO,
            sectionKey,
            dayIndex: normalizedDayIndex,
            text: text || '',
            mediaIds: JSON.stringify(mediaIds || []),
            channelId: channelId || null,
          },
        });

    return NextResponse.json({
      ...draftData,
      mediaIds: parseMediaIds(draftData.mediaIds),
    });
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

    const dayIndexNum = dayIndex ? parseInt(dayIndex) : null;

    await prisma.draft.deleteMany({
      where: {
        userId,
        weekStartISO,
        sectionKey,
        dayIndex: dayIndexNum,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 401 }
    );
  }
}

