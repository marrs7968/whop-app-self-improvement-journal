export function startOfWeekSunday(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=Sun
  const diff = day; // days since Sunday
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0,0,0,0);
  return x;
}

export function endOfWeekSaturday(start: Date) {
  const e = new Date(start);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23,59,59,999);
  return e;
}

export function formatRangeUTC(start: Date, end: Date) {
  const fmt = (dt: Date) =>
    dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function getWeekRange(weekStartISO: string) {
  const weekStart = new Date(weekStartISO);
  const weekEnd = endOfWeekSaturday(weekStart);
  return {
    start: weekStart,
    end: weekEnd,
    formatted: formatRangeUTC(weekStart, weekEnd)
  };
}

export function getNextWeek(weekStartISO: string): string {
  const weekStart = new Date(weekStartISO);
  weekStart.setUTCDate(weekStart.getUTCDate() + 7);
  return weekStart.toISOString().split('T')[0];
}

export function getPreviousWeek(weekStartISO: string): string {
  const weekStart = new Date(weekStartISO);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  return weekStart.toISOString().split('T')[0];
}

export function getCurrentWeekStart(): string {
  return startOfWeekSunday(new Date()).toISOString().split('T')[0];
}

export function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || '';
}

export function getDayAbbreviation(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] || '';
}

