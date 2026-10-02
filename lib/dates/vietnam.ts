export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function getVietnamParts(instant: Date): LocalParts {
  const values = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function toLocalDate(instant: Date): string {
  const { year, month, day } = getVietnamParts(instant);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addLocalDays(localDate: string, amount: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day + amount));
  return adjusted.toISOString().slice(0, 10);
}

export function isLateCheckinWindow(instant: Date): boolean {
  const { hour, minute, second } = getVietnamParts(instant);
  const secondsSinceMidnight = hour * 3600 + minute * 60 + second;
  return secondsSinceMidnight <= 2 * 3600;
}

export function formatLongLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
