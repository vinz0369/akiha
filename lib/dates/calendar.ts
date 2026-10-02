import { addLocalDays } from "@/lib/dates/vietnam";

export type CalendarSlot = {
  localDate: string;
  day: number;
  inMonth: boolean;
};

export function calendarMonthGrid(year: number, month: number): CalendarSlot[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const gridStart = addLocalDays(first, -mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const localDate = addLocalDays(gridStart, index);
    return {
      localDate,
      day: Number(localDate.slice(-2)),
      inMonth: localDate.startsWith(`${year}-${String(month).padStart(2, "0")}-`),
    };
  });
}
