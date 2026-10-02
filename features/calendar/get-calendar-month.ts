import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const calendarMonthSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  days: z.array(z.object({
    local_date: z.iso.date(),
    moment_count: z.number().int().nonnegative(),
    viewer_count: z.number().int().nonnegative(),
    partner_count: z.number().int().nonnegative(),
    thumb_paths: z.array(z.string()),
  })),
  summary: z.object({
    moments: z.number().int().nonnegative(),
    days: z.number().int().nonnegative(),
    viewer_moments: z.number().int().nonnegative(),
    partner_moments: z.number().int().nonnegative(),
  }),
});

export type CalendarDay = z.infer<typeof calendarMonthSchema>["days"][number] & {
  thumbnailUrls: string[];
};

export async function getCalendarMonth(year: number, month: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_couple_calendar", { p_year: year, p_month: month });
  if (error) throw new Error(`Chưa thể tải lịch: ${error.message}`);
  const parsed = calendarMonthSchema.parse(data);
  const paths = [...new Set(parsed.days.flatMap((day) => day.thumb_paths))];
  const signedByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signingError } = await supabase.storage.from("moments").createSignedUrls(paths, 60 * 10);
    if (signingError) throw new Error("Chưa thể mở ảnh xem trước riêng tư trong lịch.");
    signed.forEach((item) => {
      if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
    });
  }
  return {
    ...parsed,
    days: parsed.days.map((day): CalendarDay => ({
      ...day,
      thumbnailUrls: day.thumb_paths.flatMap((path) => signedByPath.get(path) ?? []),
    })),
  };
}
