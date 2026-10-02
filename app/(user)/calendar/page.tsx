import Link from "next/link";

import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ArrowLeftIcon, ArrowRightIcon, HeartIcon, ImageIcon } from "@/components/ui/icons";
import { CalendarGrid } from "@/features/calendar/calendar-grid";
import { MomentRealtimeRefresh } from "@/features/moments/moment-realtime-refresh";
import { getCalendarMonth } from "@/features/calendar/get-calendar-month";
import { getVietnamParts, toLocalDate } from "@/lib/dates/vietnam";

type CalendarPageProps = { searchParams: Promise<{ year?: string; month?: string }> };

function shiftedMonth(year: number, month: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const current = getVietnamParts(new Date());
  const requestedYear = Number(params.year ?? current.year);
  const requestedMonth = Number(params.month ?? current.month);
  const requestedKey = requestedYear * 12 + requestedMonth;
  const currentKey = current.year * 12 + current.month;
  const valid = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2200
    && Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
    && requestedKey <= currentKey;
  const year = valid ? requestedYear : current.year;
  const month = valid ? requestedMonth : current.month;
  const calendar = await getCalendarMonth(year, month);
  const previous = shiftedMonth(year, month, -1);
  const next = shiftedMonth(year, month, 1);
  const isCurrentMonth = year === current.year && month === current.month;
  const monthTitle = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <MobileAppShell>
      <MomentRealtimeRefresh />
      <main className="app-page">
        <header className="app-section-header flex items-center justify-between gap-3">
          <Link aria-label="Tháng trước" className="icon-button" href={`?year=${previous.year}&month=${previous.month}`}>
            <ArrowLeftIcon className="size-5" /><LinkFeedback label="Đang mở tháng trước…" />
          </Link>
          <div className="text-center">
            <p className="eyebrow">Album của hai đứa</p>
            <h1 className="app-tab-title mt-1 capitalize">{monthTitle}</h1>
          </div>
          {isCurrentMonth ? <span className="size-11" /> : (
            <Link aria-label="Tháng sau" className="icon-button" href={`?year=${next.year}&month=${next.month}`}>
              <ArrowRightIcon className="size-5" /><LinkFeedback label="Đang mở tháng sau…" />
            </Link>
          )}
        </header>

        <section className="surface-card mt-5 rounded-[28px] p-3 sm:p-4">
          <CalendarGrid days={calendar.days} month={month} today={toLocalDate(new Date())} year={year} />
        </section>

        <section aria-label="Tổng kết tháng" className="mt-4 grid grid-cols-2 gap-3">
          {([
            ["Tổng khoảnh khắc", calendar.summary.moments, ImageIcon],
            ["Ngày có ảnh", calendar.summary.days, HeartIcon],
            ["Ảnh của bạn", calendar.summary.viewer_moments, ImageIcon],
            ["Ảnh người thương", calendar.summary.partner_moments, HeartIcon],
          ] as const).map(([label, value, Icon], index) => (
            <div className={`metric-card metric-card-${index + 1} p-4`} key={String(label)}>
              <span className="metric-icon"><Icon className="size-5" /></span>
              <p className="mt-3 text-2xl font-black tabular-nums">{String(value)}</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">{String(label)}</p>
            </div>
          ))}
        </section>
      </main>
    </MobileAppShell>
  );
}
