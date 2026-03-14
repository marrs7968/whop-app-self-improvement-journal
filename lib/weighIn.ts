export type WeightUnit = 'lb' | 'kg';

const WEIGH_IN_PREFIX = '__WEIGH_IN_V1__';

export interface WeighInData {
  notes: string;
  weightValue: number | null;
  weightUnit: WeightUnit;
}

export function serializeWeighInData(data: WeighInData): string {
  return `${WEIGH_IN_PREFIX}${JSON.stringify(data)}`;
}

export function deserializeWeighInText(text: string | null | undefined): WeighInData {
  const raw = text || '';
  if (!raw.startsWith(WEIGH_IN_PREFIX)) {
    return {
      notes: raw,
      weightValue: null,
      weightUnit: 'lb',
    };
  }

  try {
    const payload = JSON.parse(raw.slice(WEIGH_IN_PREFIX.length)) as Partial<WeighInData>;
    return {
      notes: typeof payload.notes === 'string' ? payload.notes : '',
      weightValue: typeof payload.weightValue === 'number' ? payload.weightValue : null,
      weightUnit: payload.weightUnit === 'kg' ? 'kg' : 'lb',
    };
  } catch {
    return {
      notes: '',
      weightValue: null,
      weightUnit: 'lb',
    };
  }
}

export function formatWeighInChatMessage(params: {
  submittedAt: Date;
  notes: string;
  weightValue: number | null;
  weightUnit: WeightUnit;
}): string {
  const dateLine = `${params.submittedAt.toLocaleDateString()} - ${params.submittedAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  const weightLine =
    params.weightValue !== null
      ? `${params.weightValue} ${params.weightUnit}`
      : `N/A ${params.weightUnit}`;
  const notes = params.notes?.trim() || 'No additional notes.';

  return `${dateLine}\n${weightLine}\n\n==========================\n${notes}`;
}
