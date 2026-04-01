import { prisma } from '@/lib/prisma';

export function parseMediaIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function ensureUser(params: {
  scopedUserId: string;
  whopUserId: string;
  companyId?: string;
  experienceId?: string;
}) {
  const { scopedUserId, whopUserId, companyId, experienceId } = params;
  await prisma.user.upsert({
    where: { id: scopedUserId },
    update: {
      whopUserId,
      companyId: companyId ?? null,
      experienceId: experienceId ?? null,
    },
    create: {
      id: scopedUserId,
      whopUserId,
      companyId: companyId ?? null,
      experienceId: experienceId ?? null,
    },
  });
}
