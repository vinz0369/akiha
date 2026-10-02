import Link from "next/link";
import { notFound } from "next/navigation";

import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { LinkFeedback } from "@/components/navigation/navigation-feedback";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { DayAlbumStack } from "@/features/moments/day-album-stack";
import { getCoupleDay } from "@/features/moments/data";
import { MomentRealtimeRefresh } from "@/features/moments/moment-realtime-refresh";
import { formatLongLocalDate } from "@/lib/dates/vietnam";

export default async function DayAlbumPage({ params, searchParams }: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { date } = await params;
  const query = await searchParams;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const album = await getCoupleDay(date);
  const returnMatch = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.return ?? "");
  const backHref = returnMatch ? `/calendar?year=${query.return!.slice(0, 4)}&month=${Number(query.return!.slice(5))}` : "/calendar";

  return (
    <MobileAppShell>
    <MomentRealtimeRefresh />
    <main className="day-album-screen">
      <header className="day-album-header flex items-center gap-3">
        <Link aria-label="Về lịch" className="icon-button" href={backHref}><ArrowLeftIcon className="size-5" /><LinkFeedback label="Đang về lịch…" /></Link>
        <div className="min-w-0"><p className="eyebrow">Album trong ngày · {album.moments.length} ảnh</p><h1 className="mt-0.5 truncate text-xl font-black">{formatLongLocalDate(date)}</h1></div>
      </header>
      <DayAlbumStack moments={album.moments} viewerId={album.viewer_id} />
    </main>
    </MobileAppShell>
  );
}
