import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';
import { resolveTenantContext } from '@/lib/tenant-context';
import { ensureUser, parseMediaIds } from '@/lib/journal-store';
import { deserializeWeighInText, serializeWeighInData, type WeightUnit } from '@/lib/weighIn';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

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
        userId: context.scopedUserId,
        weekStartISO,
        ...(sectionKey ? { sectionKey } : {}),
        ...(dayIndexFilter !== undefined && !Number.isNaN(dayIndexFilter) ? { dayIndex: dayIndexFilter } : {}),
      },
      orderBy: [{ sectionKey: 'asc' }, { dayIndex: 'asc' }],
    });

    return NextResponse.json(
      drafts.map((draft) => {
        const parsed = draft.sectionKey === 'weigh-in' ? deserializeWeighInText(draft.text || '') : null;
        return {
          ...draft,
          ...(parsed
            ? {
                text: parsed.notes,
                weightValue: parsed.weightValue,
                weightUnit: parsed.weightUnit,
              }
            : {}),
          mediaIds: parseMediaIds(draft.mediaIds),
        };
      })
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

    await ensureUser({
      scopedUserId: context.scopedUserId,
      whopUserId: context.userId,
      companyId: context.companyId,
      experienceId: context.experienceId,
    });

    const normalizedDayIndex = typeof dayIndex === 'number' ? dayIndex : dayIndex ? parseInt(dayIndex, 10) : null;
    const existing = await prisma.draft.findFirst({
      where: {
        userId: context.scopedUserId,
        weekStartISO,
        sectionKey,
        dayIndex: normalizedDayIndex,
      },
      select: { id: true },
    });

    const normalizedWeight =
      typeof weightValue === 'number'
        ? weightValue
        : typeof weightValue === 'string' && weightValue.trim() !== ''
        ? parseFloat(weightValue)
        : null;
    const normalizedWeightUnit: WeightUnit = weightUnit === 'kg' ? 'kg' : 'lb';
    const notesText = typeof text === 'string' ? text : '';
    const storedText =
      sectionKey === 'weigh-in'
        ? serializeWeighInData({
            notes: notesText,
            weightValue: Number.isFinite(normalizedWeight as number) ? (normalizedWeight as number) : null,
            weightUnit: normalizedWeightUnit,
          })
        : notesText;

    const draftData = existing
      ? await prisma.draft.update({
          where: { id: existing.id },
          data: {
            text: storedText,
            mediaIds: JSON.stringify(mediaIds || []),
            channelId: channelId || null,
          },
        })
      : await prisma.draft.create({
          data: {
            userId: context.scopedUserId,
            companyId: context.companyId ?? null,
            experienceId: context.experienceId ?? null,
            weekStartISO,
            sectionKey,
            dayIndex: normalizedDayIndex,
            text: storedText,
            mediaIds: JSON.stringify(mediaIds || []),
            channelId: channelId || null,
          },
        });

    const parsed = sectionKey === 'weigh-in' ? deserializeWeighInText(draftData.text || '') : null;

    return NextResponse.json({
      ...draftData,
      ...(parsed
        ? {
            text: parsed.notes,
            weightValue: parsed.weightValue,
            weightUnit: parsed.weightUnit,
          }
        : {}),
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
    const tokenPayload = await whopSdk.verifyUserToken(headersList);
    const context = resolveTenantContext(tokenPayload as unknown as Record<string, unknown>);

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

    const dayIndexNum = dayIndex ? parseInt(dayIndex, 10) : null;
    await prisma.draft.deleteMany({
      where: {
        userId: context.scopedUserId,
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
