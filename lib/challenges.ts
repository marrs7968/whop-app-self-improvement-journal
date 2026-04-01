export const CHALLENGE_TOPICS = [
  'Fasting',
  'Daily Content Consistency',
  'Daily Reflection Consistency',
  'Writing Sprint',
  'Content Creation Sprint',
  'Daily Step Challenge',
  'Daily Skill Practice Challenge',
] as const;

export type ChallengeTopic = (typeof CHALLENGE_TOPICS)[number];
export type ChallengeCadenceType = 'DAILY' | 'SPRINT';

export function inferCadenceFromTopic(topic: string): ChallengeCadenceType {
  return topic.toLowerCase().includes('sprint') ? 'SPRINT' : 'DAILY';
}

export function getSprintMilestones(startsAt: Date, endsAt: Date): Date[] {
  const totalMs = Math.max(endsAt.getTime() - startsAt.getTime(), 1);
  const third = totalMs / 3;
  return [
    new Date(startsAt.getTime() + third),
    new Date(startsAt.getTime() + third * 2),
    new Date(endsAt.getTime()),
  ];
}

export function isDailyProofWindow(date: Date): string {
  return date.toISOString().slice(0, 10);
}
