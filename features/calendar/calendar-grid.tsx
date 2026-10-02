import Link from "next/link";

import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ImageIcon } from "@/components/ui/icons";
import type { CalendarDay } from "@/features/calendar/get-calendar-month";
import { calendarMonthGrid } from "@/lib/dates/calendar";
import { formatLongLocalDate } from "@/lib/dates/vietnam";

function safeBackground(url: string) {
  return `url("${url.replaceAll('"', "%22")}")`;
}

function PhotoStack({ day }: { day: CalendarDay }) {
  const visible = day.thumbnailUrls.slice(0, 3);
  if (!visible.length) return <ImageIcon className="size-5" />;
  return (
    <span aria-hidden="true" className="absolute inset-[7px]">
      {visible.map((url, index) => {
        const positions = visible.length === 1
          ? ["rotate-0"]
          : visible.length === 2
            ? ["-rotate-[5deg] translate-x-[-2px]", "rotate-[3deg] translate-x-[2px]"]
            : ["-rotate-[7deg] translate-x-[-3px]", "rotate-[5deg] translate-x-[3px]", "rotate-0"];
        return (
          <span
            className={`absolute inset-0 rounded-[10px] border-2 border-white bg-cover bg-center shadow-sm ${positions[index]}`}
            key={url}
            style={{ backgroundImage: safeBackground(url) }}
          />
        );
      })}
    </span>
  );
}

export function CalendarGrid({ year, month, today, days }: {
  year: number;
  month: number;
  today: string;
  days: CalendarDay[];
}) {
  const byDate = new Map(days.map((day) => [day.local_date, day]));
  const slots = calendarMonthGrid(year, month);

  return (
    <div>
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((weekday) => <div className="py-2" key={weekday}>{weekday}</div>)}
      </div>
      <div aria-label="Lịch album của hai đứa" className="grid grid-cols-7 gap-1.5" role="grid">
        {slots.map((slot) => {
          const day = byDate.get(slot.localDate);
          const isToday = slot.localDate === today;
          const label = day
            ? `${formatLongLocalDate(slot.localDate)}, ${day.moment_count} ảnh: bạn ${day.viewer_count}, người thương ${day.partner_count}`
            : `${formatLongLocalDate(slot.localDate)}, chưa có ảnh`;
          const cell = (
            <span
              aria-label={label}
              className={`relative block aspect-square rounded-[13px] border ${isToday ? "border-2 border-primary-strong" : "border-border/70"} ${slot.inMonth ? "" : "opacity-25"} ${day ? "bg-primary-soft text-primary-strong" : "bg-surface-subtle/65 text-muted"}`}
              role="gridcell"
            >
              <span className={`absolute left-1 top-0.5 z-10 rounded-full px-1 text-[10px] font-extrabold ${day?.thumbnailUrls.length ? "bg-ink/65 text-white" : ""}`}>{slot.day}</span>
              {day ? <PhotoStack day={day} /> : null}
              {day && day.moment_count > 3 ? <span className="absolute bottom-0.5 right-0.5 z-10 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-black text-white">+{day.moment_count - 3}</span> : null}
            </span>
          );
          return day && slot.inMonth ? (
            <Link aria-label={label} className="block rounded-[13px] focus-visible:outline-offset-2" href={`/days/${slot.localDate}?return=${year}-${String(month).padStart(2, "0")}`} key={slot.localDate}>
              {cell}<LinkFeedback label="Đang mở album ngày…" />
            </Link>
          ) : <span key={slot.localDate}>{cell}</span>;
        })}
      </div>
    </div>
  );
}
