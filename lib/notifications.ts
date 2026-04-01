import { prisma } from '@/lib/prisma';
import { postToChannel } from '@/lib/whop';
import type { NotificationType, NotificationTargetType } from '@/lib/generated/prisma';

function buildDedupeKey(parts: string[]): string {
  return parts.join(':');
}

export async function sendChannelNotification(params: {
  type: NotificationType;
  companyId: string;
  channelId: string;
  message: string;
  challengeId?: string;
  userId?: string;
  dedupeParts: string[];
}) {
  const dedupeKey = buildDedupeKey(params.dedupeParts);
  const existing = await prisma.notificationDelivery.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  if (existing) return { sent: false, deduped: true };

  try {
    await postToChannel(params.channelId, params.message, []);
    await prisma.notificationDelivery.create({
      data: {
        notificationType: params.type,
        companyId: params.companyId,
        challengeId: params.challengeId ?? null,
        targetType: 'CHANNEL' satisfies NotificationTargetType,
        targetId: params.channelId,
        userId: params.userId ?? null,
        dedupeKey,
        status: 'sent',
        payload: {
          message: params.message,
        },
      },
    });
    return { sent: true, deduped: false };
  } catch (error) {
    await prisma.notificationDelivery.create({
      data: {
        notificationType: params.type,
        companyId: params.companyId,
        challengeId: params.challengeId ?? null,
        targetType: 'CHANNEL' satisfies NotificationTargetType,
        targetId: params.channelId,
        userId: params.userId ?? null,
        dedupeKey,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown send error',
        payload: {
          message: params.message,
        },
      },
    });
    throw error;
  }
}
