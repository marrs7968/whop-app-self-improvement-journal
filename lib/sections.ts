import { startOfWeekSunday, endOfWeekSaturday } from './dates';

export type SectionKey = "daily-rent" | "weigh-in" | "reflection";

export interface SectionConfig {
  key: SectionKey;
  title: string;
  hasDays?: boolean;      // true for Daily Rent (7 sub-sections)
  rules?: {
    canSubmit: (ctx: {
      now: Date;
      weekStart: Date;
      weekEnd: Date;
      weekday: number; // 0=Sun .. 6=Sat
    }) => boolean;
  };
  promptTemplate?: string; // for reflection
}

export const sections: SectionConfig[] = [
  {
    key: "daily-rent",
    title: "Daily Rent",
    hasDays: true
  },
  {
    key: "weigh-in",
    title: "Weekly Weigh-In",
    rules: {
      canSubmit: ({ weekday }) => {
        // Thursday (4) or after (Fri/Sat) — week ends on Sat
        return weekday >= 4;
      }
    }
  },
  {
    key: "reflection",
    title: "Weekly Reflection",
    promptTemplate:
`- What did I improve this week?
- Where did I fall short?
- What's my strategic correction moving forward?`
  }
];

export function getSectionConfig(key: SectionKey): SectionConfig | undefined {
  return sections.find(section => section.key === key);
}

export function canSubmitSection(
  sectionKey: SectionKey, 
  now: Date = new Date()
): boolean {
  const config = getSectionConfig(sectionKey);
  if (!config?.rules) return true;
  
  const weekday = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const weekStart = startOfWeekSunday(now);
  const weekEnd = endOfWeekSaturday(weekStart);
  
  return config.rules.canSubmit({
    now,
    weekStart,
    weekEnd,
    weekday
  });
}
