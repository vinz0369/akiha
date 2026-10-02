import { addLocalDays } from "@/lib/dates/vietnam";

function uniquePastDates(dates: Iterable<string>, today?: string): Set<string> {
  return new Set([...dates].filter((date) => !today || date <= today));
}

export function currentStreak(
  checkinDates: Iterable<string>,
  protectedDates: Iterable<string>,
  today: string,
): number {
  const active = uniquePastDates([...checkinDates, ...protectedDates], today);
  let cursor = active.has(today) ? today : addLocalDays(today, -1);
  if (!active.has(cursor)) return 0;

  let length = 0;
  while (active.has(cursor)) {
    length += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return length;
}

export function longestStreak(
  checkinDates: Iterable<string>,
  protectedDates: Iterable<string>,
): number {
  const sorted = [...uniquePastDates([...checkinDates, ...protectedDates])].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of sorted) {
    run = previous && addLocalDays(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return longest;
}

export function longestStreakInMonth(
  checkinDates: Iterable<string>,
  protectedDates: Iterable<string>,
  year: number,
  month: number,
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return longestStreak(
    [...checkinDates].filter((date) => date.startsWith(prefix)),
    [...protectedDates].filter((date) => date.startsWith(prefix)),
  );
}
