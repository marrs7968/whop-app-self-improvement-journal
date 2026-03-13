interface TokenPayloadLike {
  [key: string]: unknown;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readPath(obj: TokenPayloadLike | undefined, path: string): unknown {
  if (!obj) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function firstString(obj: TokenPayloadLike | undefined, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = asNonEmptyString(readPath(obj, path));
    if (value) return value;
  }
  return undefined;
}

export interface TenantContext {
  userId: string;
  companyId?: string;
  experienceId?: string;
  scopedUserId: string;
}

export function getScopedUserId(userId: string, companyId?: string, experienceId?: string): string {
  const companyPart = companyId || 'company-unknown';
  const experiencePart = experienceId || 'experience-unknown';
  return `${companyPart}:${experiencePart}:${userId}`;
}

export function resolveTenantContext(payload: TokenPayloadLike): TenantContext {
  const userId =
    firstString(payload, ['userId', 'user_id', 'id']) ||
    'unknown-user';

  const companyId = firstString(payload, [
    'companyId',
    'company_id',
    'bizId',
    'businessId',
    'organizationId',
    'company.id',
    'business.id',
    'organization.id',
    'experience.companyId',
    'experience.company_id',
  ]);

  const experienceId = firstString(payload, [
    'experienceId',
    'experience_id',
    'experience.id',
    'app.experienceId',
    'app.experience_id',
  ]);

  return {
    userId,
    companyId,
    experienceId,
    scopedUserId: getScopedUserId(userId, companyId, experienceId),
  };
}
